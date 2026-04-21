#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app_code;
mod network;

use app_code::{AppState, ingest_file, search_index_cmd, clear_index};
use network::{NetworkSource, ServerState};
use std::sync::Mutex;
use std::collections::HashMap;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            index: Mutex::new(None),
            schema: Mutex::new(None),
            fields: Mutex::new(None),
        })
        .manage(Mutex::new(Vec::<NetworkSource>::new()))
        .manage(ServerState {
            handles: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            ingest_file,
            search_index_cmd,
            clear_index,
            network::add_network_source,
            network::remove_network_source,
            network::start_network_server,
            network::stop_network_server,
            network::get_network_sources,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
