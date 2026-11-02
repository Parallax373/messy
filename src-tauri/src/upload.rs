// Plik ponad limit Messengera (page/inject.js pyta, czy go wysłać) idzie do Gofile, a strona wkleja link do rozmowy.
// Wysyła Rust, bo Facebook nie pozwala stronie łączyć się z obcymi serwerami.
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use base64::Engine;
use bytes::Bytes;
use futures_util::future::{select, Either};
use futures_util::stream;
use tauri::AppHandle;
use tokio::io::AsyncReadExt;

// Bez konta i bez limitu rozmiaru; odpowiedź: {"status": "ok", "data": {"downloadPage": "https://gofile.io/d/…"}}.
const UPLOAD_URL: &str = "https://upload.gofile.io/uploadfile";
const CHUNK: usize = 256 * 1024;
// Błąd przerwanego wysyłania; strona wtedy już go nie pokazuje, bo sama je anulowała (page/inject.js).
const CANCELLED: &str = "cancelled";

// Numer bieżącego wysyłania (nadaje strona), 0 gdy żadne nie trwa. Inny numer oznacza, że to wysyłanie anulowano
// albo zastąpiło je nowe.
static CURRENT: AtomicU64 = AtomicU64::new(0);
// Zapis kawałka nie może się przeplatać z anulowaniem i kasowaniem pliku.
static FILE_LOCK: Mutex<()> = Mutex::new(());

// Strona przekazuje plik kawałkami w base64 (upload_chunk), bo polecenia z facebook.com idą przez postMessage
// jako JSON i całe setki MB naraz by go zatkały. Kawałki trafiają na dysk, nie do pamięci, bo plik może mieć wiele GB.
fn buffer_path() -> PathBuf {
	std::env::temp_dir().join("messy-upload.tmp")
}

// Przy starcie: plik po wysyłaniu przerwanym zamknięciem albo awarią Messy.
pub fn cleanup() {
	let _ = fs::remove_file(buffer_path());
}

#[tauri::command]
pub async fn upload_chunk(data: String, first: bool, id: u64) -> Result<(), String> {
	let bytes = base64::engine::general_purpose::STANDARD.decode(data).map_err(|error| error.to_string())?;
	let _lock = FILE_LOCK.lock().unwrap();
	if first {
		CURRENT.store(id, Ordering::Relaxed);
	}
	if CURRENT.load(Ordering::Relaxed) != id {
		return Err(CANCELLED.to_owned());
	}
	let mut file = OpenOptions::new().write(true).create(first).truncate(first).append(!first).open(buffer_path()).map_err(|error| error.to_string())?;
	file.write_all(&bytes).map_err(|error| error.to_string())
}

// Przerywa wysyłanie na każdym etapie: przekazywanie kawałków albo wysyłkę do Gofile.
#[tauri::command]
pub fn upload_cancel() {
	let _lock = FILE_LOCK.lock().unwrap();
	CURRENT.store(0, Ordering::Relaxed);
	cleanup();
}

async fn send_file(app: AppHandle, name: String) -> Result<String, String> {
	let file = tokio::fs::File::open(buffer_path()).await.map_err(|error| error.to_string())?;
	let total = file.metadata().await.map_err(|error| error.to_string())?.len();

	// Postęp co pełny procent (page/inject.js, onUploadProgress).
	let chunks = stream::unfold((file, 0_u64, 0_u64, app), move |(mut file, sent, last_percent, app)| async move {
		let mut chunk = vec![0; CHUNK];
		match file.read(&mut chunk).await {
			Ok(0) => None,
			Ok(read) => {
				chunk.truncate(read);
				let sent = sent + read as u64;
				let percent = sent * 100 / total.max(1);
				if percent != last_percent {
					crate::emit_to_page(&app, "upload-progress", percent);
				}
				Some((Ok::<_, std::io::Error>(Bytes::from(chunk)), (file, sent, percent, app)))
			}
			Err(error) => Some((Err(error), (file, sent, last_percent, app))),
		}
	});
	let part = reqwest::multipart::Part::stream_with_length(reqwest::Body::wrap_stream(chunks), total).file_name(name);
	let form = reqwest::multipart::Form::new().part("file", part);

	// reqwest jest tu bez własnego dostawcy kryptografii (tak jak w tauri-plugin-updater); ustawiamy ring, jeśli nikt jeszcze tego nie zrobił.
	if rustls::crypto::CryptoProvider::get_default().is_none() {
		let _ = rustls::crypto::ring::default_provider().install_default();
	}
	let client = reqwest::Client::builder().connect_timeout(Duration::from_secs(30)).build().map_err(|error| error.to_string())?;
	let response = client.post(UPLOAD_URL).multipart(form).send().await.map_err(|error| error.to_string())?;
	let status = response.status();
	let body: serde_json::Value = response.json().await.map_err(|error| format!("{status}: {error}"))?;
	body["data"]["downloadPage"].as_str().map(str::to_owned).ok_or_else(|| format!("{status}: {}", body["status"].as_str().unwrap_or("?")))
}

#[tauri::command]
pub async fn upload_file(app: AppHandle, name: String, id: u64) -> Result<String, String> {
	if CURRENT.load(Ordering::Relaxed) != id {
		return Err(CANCELLED.to_owned());
	}
	// Anulowanie ma działać także wtedy, gdy sieć stoi, więc nie czeka na kolejny kawałek: porzuca całe żądanie.
	let cancelled = async move {
		while CURRENT.load(Ordering::Relaxed) == id {
			tokio::time::sleep(Duration::from_millis(200)).await;
		}
	};
	let result = match select(Box::pin(send_file(app, name)), Box::pin(cancelled)).await {
		Either::Left((result, _)) => result,
		Either::Right(_) => Err(CANCELLED.to_owned()),
	};
	let _lock = FILE_LOCK.lock().unwrap();
	if CURRENT.load(Ordering::Relaxed) == id {
		CURRENT.store(0, Ordering::Relaxed);
		cleanup();
	}
	result
}
