// Polecenia wywoływane ze strony facebook.com (page/bridge.js); capabilities/messenger.json pozwala na nie
// tylko z tej domeny.
const COMMANDS: &[&str] = &["get_settings", "set_setting", "get_strings", "get_update_ready", "install_update", "set_unread", "set_fullscreen", "drag_window", "hide_window", "set_typing", "upload_chunk", "upload_file", "set_mode"];

fn main() {
	tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)))
		.expect("tauri-build");
}
