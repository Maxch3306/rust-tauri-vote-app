// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod websocket;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn connect_websocket_command(
    window: tauri::Window,
    youtubeid: String,
    twitchid: String,
    voteiteminit: Vec<String>,
    duration: u64,
) -> Result<(), String> {
    websocket::connect_websocket(&youtubeid, &twitchid, voteiteminit, duration, window)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![connect_websocket_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
