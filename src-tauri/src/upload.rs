// Plik ponad limit Messengera (page/inject.js pyta, czy go wysłać) idzie do Gofile, a strona wkleja link do rozmowy.
// Wysyła Rust, bo Facebook nie pozwala stronie łączyć się z obcymi serwerami.
use std::sync::Mutex;

use base64::Engine;
use bytes::Bytes;
use futures_util::stream;
use tauri::AppHandle;

// Bez konta i bez limitu rozmiaru; odpowiedź: {"status": "ok", "data": {"downloadPage": "https://gofile.io/d/…"}}.
const UPLOAD_URL: &str = "https://upload.gofile.io/uploadfile";
const CHUNK: usize = 256 * 1024;

// Strona przekazuje plik kawałkami w base64 (upload_chunk), bo polecenia z facebook.com idą przez postMessage
// jako JSON i całe setki MB naraz by go zatkały. upload_file wysyła zebrane bajty i czyści bufor.
static BUFFER: Mutex<Vec<u8>> = Mutex::new(Vec::new());

#[tauri::command]
pub fn upload_chunk(data: String, first: bool) -> Result<(), String> {
	let bytes = base64::engine::general_purpose::STANDARD.decode(data).map_err(|error| error.to_string())?;
	let mut buffer = BUFFER.lock().unwrap();
	if first {
		buffer.clear();
	}
	buffer.extend_from_slice(&bytes);
	Ok(())
}

#[tauri::command]
pub async fn upload_file(app: AppHandle, name: String) -> Result<String, String> {
	let data = Bytes::from(std::mem::take(&mut *BUFFER.lock().unwrap()));
	let total = data.len();

	// Postęp co pełny procent (page/inject.js, onUploadProgress).
	let mut last_percent = 0;
	let chunks = (0..total.div_ceil(CHUNK)).map(move |index| {
		let end = ((index + 1) * CHUNK).min(total);
		let percent = end * 100 / total.max(1);
		if percent != last_percent {
			last_percent = percent;
			crate::emit_to_page(&app, "upload-progress", percent);
		}
		Ok::<_, std::io::Error>(data.slice(index * CHUNK..end))
	});
	let part = reqwest::multipart::Part::stream_with_length(reqwest::Body::wrap_stream(stream::iter(chunks)), total as u64).file_name(name);
	let form = reqwest::multipart::Form::new().part("file", part);

	// reqwest jest tu bez własnego dostawcy kryptografii (tak jak w tauri-plugin-updater); ustawiamy ring, jeśli nikt jeszcze tego nie zrobił.
	if rustls::crypto::CryptoProvider::get_default().is_none() {
		let _ = rustls::crypto::ring::default_provider().install_default();
	}
	let response = reqwest::Client::new().post(UPLOAD_URL).multipart(form).send().await.map_err(|error| error.to_string())?;
	let status = response.status();
	let body: serde_json::Value = response.json().await.map_err(|error| format!("{status}: {error}"))?;
	body["data"]["downloadPage"].as_str().map(str::to_owned).ok_or_else(|| format!("{status}: {}", body["status"].as_str().unwrap_or("?")))
}
