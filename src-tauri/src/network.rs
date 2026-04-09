use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::{Arc, Mutex, atomic::{AtomicUsize, Ordering}};
use tauri::{Emitter, State};
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;
use tokio_rustls::rustls;

// Global connection counter for rate limiting
lazy_static::lazy_static! {
    static ref ACTIVE_CONNECTIONS: AtomicUsize = AtomicUsize::new(0);
    static ref MAX_CONNECTIONS: usize = 100; // Limit concurrent connections
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
        let (cert, key) = generate_self_signed_cert()?;

        let cert = rustls_pemfile::certs(&mut cert.as_slice())
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to parse cert: {}", e))?;

        let key = rustls_pemfile::private_key(&mut key.as_slice())
            .map_err(|e| format!("Failed to parse key: {}", e))?
            .ok_or("No private key found")?;

        let config = rustls::ServerConfig::builder()
            .with_no_client_auth()
            .with_single_cert(cert, key)
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
            let current_connections = ACTIVE_CONNECTIONS.load(Ordering::Relaxed);
            if current_connections >= *MAX_CONNECTIONS {
                eprintln!("Connection limit reached ({}), rejecting connection from {}", current_connections, peer_addr);
                continue;
            }

            let acceptor = acceptor.clone();
            let app = app_handle.clone();

            tokio::spawn(async move {
                match acceptor.accept(stream).await {
                    Ok(tls_stream) => {
                        ACTIVE_CONNECTIONS.fetch_add(1, Ordering::Relaxed);
                        handle_log_connection(tls_stream, peer_addr, app).await;
                        ACTIVE_CONNECTIONS.fetch_sub(1, Ordering::Relaxed);
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
            let current_connections = ACTIVE_CONNECTIONS.load(Ordering::Relaxed);
            if current_connections >= *MAX_CONNECTIONS {
                eprintln!("Connection limit reached ({}), rejecting connection from {}", current_connections, peer_addr);
                continue;
            }

            let app = app_handle.clone();
            tokio::spawn(async move {
                ACTIVE_CONNECTIONS.fetch_add(1, Ordering::Relaxed);
                handle_log_connection(stream, peer_addr, app).await;
                ACTIVE_CONNECTIONS.fetch_sub(1, Ordering::Relaxed);
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
        address: "0.0.0.0".to_string(),
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
) -> Result<String, String> {
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

    tokio::spawn(async move {
        if let Err(e) = start_log_server(port, use_tls, app_handle).await {
            eprintln!("Server error: {}", e);
        }
    });

    Ok(format!("Server starting on port {}", port))
}
