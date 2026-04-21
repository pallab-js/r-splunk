use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex, LazyLock, atomic::{AtomicUsize, Ordering}};
use tauri::{Emitter, State, Manager};
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;
use tokio_rustls::rustls;

// Global connection counter for rate limiting
static ACTIVE_CONNECTIONS: LazyLock<AtomicUsize> = LazyLock::new(|| AtomicUsize::new(0));
static MAX_CONNECTIONS: LazyLock<usize> = LazyLock::new(|| 100); // Limit concurrent connections

struct ConnectionGuard;

impl ConnectionGuard {
    fn new() -> Option<Self> {
        ACTIVE_CONNECTIONS.fetch_update(Ordering::SeqCst, Ordering::SeqCst, |curr| {
            if curr < *MAX_CONNECTIONS {
                Some(curr + 1)
            } else {
                None
            }
        }).ok().map(|_| ConnectionGuard)
    }
}

impl Drop for ConnectionGuard {
    fn drop(&mut self) {
        ACTIVE_CONNECTIONS.fetch_sub(1, Ordering::SeqCst);
    }
}

use tokio::task::AbortHandle;
use std::collections::HashMap;

pub struct ServerState {
    pub handles: Mutex<HashMap<String, AbortHandle>>,
}

/// Network log source configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkSource {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    pub enabled: bool,
    pub use_tls: bool,
    pub status: ConnectionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Error(String),
}

/// Generate a self-signed certificate for TLS using rcgen
pub fn generate_self_signed_cert() -> Result<(Vec<u8>, Vec<u8>), String> {
    use rcgen::{CertificateParams, DistinguishedName, KeyPair, SanType};
    use std::net::IpAddr;

    let mut params = CertificateParams::default();
    params.distinguished_name = DistinguishedName::new();
    params.distinguished_name.push(rcgen::DnType::CommonName, "r-splunk-local");
    params.distinguished_name.push(rcgen::DnType::OrganizationName, "R-Splunk");

    // Add localhost as SAN
    params.subject_alt_names.push(SanType::IpAddress(IpAddr::from([0, 0, 0, 0])));
    params.subject_alt_names.push(SanType::IpAddress(IpAddr::from([127, 0, 0, 1])));

    let key_pair = KeyPair::generate()
        .map_err(|e| format!("Failed to generate key pair: {}", e))?;

    let cert = params.self_signed(&key_pair)
        .map_err(|e| format!("Failed to self-sign cert: {}", e))?;
    let cert_pem = cert.pem();
    let key_pem = key_pair.serialize_pem();

    Ok((cert_pem.into_bytes(), key_pem.into_bytes()))
}

/// Start a TCP/TLS server to receive logs from remote sources
/// Security: Binds to 127.0.0.1 by default to prevent network exposure
pub async fn start_log_server(
    port: u16,
    use_tls: bool,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    // Security: Validate port range (reject privileged ports < 1024)
    if port < 1024 {
        return Err("Port must be >= 1024 to avoid privileged port restrictions".to_string());
    }

    // Security: Bind to localhost only to prevent network exposure
    let addr = format!("127.0.0.1:{}", port);

    if use_tls {
        let (cert_pem, key_pem) = generate_self_signed_cert()?;

        use rustls_pki_types::pem::PemObject;
        
        let cert = rustls_pki_types::CertificateDer::from_pem_slice(&cert_pem)
            .map_err(|e| format!("Failed to parse cert: {}", e))?;

        let key = rustls_pki_types::PrivateKeyDer::from_pem_slice(&key_pem)
            .map_err(|e| format!("Failed to parse key: {}", e))?;

        let config = rustls::ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(vec![cert], key)
            .map_err(|e| format!("Failed to build TLS config: {}", e))?;

        let acceptor = TlsAcceptor::from(Arc::new(config));
        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind: {}", e))?;

        app_handle
            .emit("server-status", &format!("TLS server listening on {}", addr))
            .ok();

        loop {
            let (stream, peer_addr) = listener
                .accept()
                .await
                .map_err(|e| format!("Failed to accept: {}", e))?;

            // Security: Enforce connection limit to prevent DoS
            let guard = match ConnectionGuard::new() {
                Some(g) => g,
                None => {
                    eprintln!("Connection limit reached, rejecting connection from {}", peer_addr);
                    continue;
                }
            };

            let acceptor = acceptor.clone();
            let app = app_handle.clone();

            tokio::spawn(async move {
                let _guard = guard; // Moved into task, will drop on completion
                match acceptor.accept(stream).await {
                    Ok(tls_stream) => {
                        handle_log_connection(tls_stream, peer_addr, app).await;
                    }
                    Err(e) => {
                        eprintln!("TLS handshake failed: {}", e);
                    }
                }
            });
        }
    } else {
        let listener = TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind: {}", e))?;

        app_handle
            .emit("server-status", &format!("TCP server listening on {}", addr))
            .ok();

        loop {
            let (stream, peer_addr) = listener
                .accept()
                .await
                .map_err(|e| format!("Failed to accept: {}", e))?;

            // Security: Enforce connection limit to prevent DoS
            let guard = match ConnectionGuard::new() {
                Some(g) => g,
                None => {
                    eprintln!("Connection limit reached, rejecting connection from {}", peer_addr);
                    continue;
                }
            };

            let app = app_handle.clone();
            tokio::spawn(async move {
                let _guard = guard; // Moved into task, will drop on completion
                handle_log_connection(stream, peer_addr, app).await;
            });
        }
    }
}

/// Handle an incoming log connection
async fn handle_log_connection<S>(
    stream: S,
    peer_addr: SocketAddr,
    app_handle: tauri::AppHandle,
) where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin + Send,
{
    use tokio::io::{AsyncBufReadExt, BufReader};

    app_handle
        .emit(
            "network-log",
            &format!("Connection from {}", peer_addr),
        )
        .ok();

    let mut reader = BufReader::new(stream);
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => break, // Connection closed
            Ok(n) => {
                // Security: Truncate oversized log lines to prevent memory exhaustion
                const MAX_LINE_LENGTH: usize = 65536; // 64KB
                if n > MAX_LINE_LENGTH {
                    eprintln!("Log line from {} exceeds max length ({} bytes), truncating", peer_addr, n);
                    line.truncate(MAX_LINE_LENGTH);
                }

                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    let log_entry = crate::app_code::parse_log_line(&trimmed, 0);
                    app_handle.emit("log-stream", &log_entry).ok();
                }
            }
            Err(_) => break,
        }
    }

    app_handle
        .emit(
            "network-log",
            &format!("Disconnected from {}", peer_addr),
        )
        .ok();
}

#[tauri::command]
pub fn add_network_source(
    name: String,
    port: u16,
    use_tls: bool,
    sources: State<'_, Mutex<Vec<NetworkSource>>>,
) -> Result<NetworkSource, String> {
    let id = format!("net-{}", uuid::Uuid::new_v4().to_string().chars().take(8).collect::<String>());
    let source = NetworkSource {
        id: id.clone(),
        name,
        address: "127.0.0.1".to_string(),
        port,
        enabled: false,
        use_tls,
        status: ConnectionStatus::Disconnected,
    };

    sources
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?
        .push(source.clone());

    Ok(source)
}

#[tauri::command]
pub fn remove_network_source(
    id: String,
    sources: State<'_, Mutex<Vec<NetworkSource>>>,
) -> Result<(), String> {
    sources
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?
        .retain(|s| s.id != id);
    Ok(())
}

#[tauri::command]
pub fn get_network_sources(
    sources: State<'_, Mutex<Vec<NetworkSource>>>,
) -> Result<Vec<NetworkSource>, String> {
    Ok(sources
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?
        .clone())
}

#[tauri::command]
pub async fn start_network_server(
    id: String,
    app_handle: tauri::AppHandle,
    sources: State<'_, Mutex<Vec<NetworkSource>>>,
    server_state: State<'_, ServerState>,
) -> Result<String, String> {
    // Check if already running
    {
        let handles = server_state.handles.lock().map_err(|e| format!("Lock error: {}", e))?;
        if handles.contains_key(&id) {
            return Err("Server already running".to_string());
        }
    }

    let source = {
        let mut sources = sources
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        let source = sources
            .iter_mut()
            .find(|s| s.id == id)
            .ok_or("Source not found")?;
        
        source.enabled = true;
        source.status = ConnectionStatus::Connecting;
        (source.port, source.use_tls)
    };

    let (port, use_tls) = source;
    let id_clone = id.clone();
    let app_clone = app_handle.clone();

    let task = tokio::spawn(async move {
        // Update status to Connected when server starts
        {
            let sources_state = app_clone.state::<Mutex<Vec<NetworkSource>>>();
            let lock_result = sources_state.lock();
            if let Ok(mut sources) = lock_result {
                if let Some(s) = sources.iter_mut().find(|s| s.id == id_clone) {
                    s.status = ConnectionStatus::Connected;
                }
            }
        }

        if let Err(e) = start_log_server(port, use_tls, app_clone).await {
            eprintln!("Server error: {}", e);
        }
    });

    server_state.handles.lock().map_err(|e| format!("Lock error: {}", e))?
        .insert(id.clone(), task.abort_handle());

    Ok(format!("Server starting on port {}", port))
}

#[tauri::command]
pub fn stop_network_server(
    id: String,
    sources: State<'_, Mutex<Vec<NetworkSource>>>,
    server_state: State<'_, ServerState>,
) -> Result<(), String> {
    // Abort the task
    {
        let mut handles = server_state.handles.lock().map_err(|e| format!("Lock error: {}", e))?;
        if let Some(handle) = handles.remove(&id) {
            handle.abort();
        }
    }

    // Update status
    let mut sources = sources
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let source = sources
        .iter_mut()
        .find(|s| s.id == id)
        .ok_or("Source not found")?;
    
    source.enabled = false;
    source.status = ConnectionStatus::Disconnected;

    Ok(())
}
