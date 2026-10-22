// Sprawdzanie, pobieranie i instalowanie aktualizacji z wydań Parallax373/messy na GitHubie.
// Adres latest.json i klucz publiczny do sprawdzania podpisu są w tauri.conf.json (plugins.updater).
use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::{Update, UpdaterExt};

use crate::i18n::{fill, t};

const CHECK_INTERVAL: Duration = Duration::from_secs(4 * 60 * 60);

#[derive(Clone)]
pub enum Status {
	Idle,
	Checking,
	Downloading(String),
	Ready(String),
	Error(String),
}

#[derive(Default)]
pub struct State {
	status: Mutex<Option<Status>>,
	// Pobrana aktualizacja czeka tu na kliknięcie „Zaktualizuj” albo zamknięcie Messy.
	ready: Mutex<Option<(Update, Vec<u8>)>>,
}

pub fn status(app: &AppHandle) -> Status {
	app.state::<State>().status.lock().unwrap().clone().unwrap_or(Status::Idle)
}

fn set_status(app: &AppHandle, value: Status) {
	*app.state::<State>().status.lock().unwrap() = Some(value);
	crate::update_status_changed(app);
}

pub fn ready_version(app: &AppHandle) -> Option<String> {
	match status(app) {
		Status::Ready(version) => Some(version),
		_ => None,
	}
}

pub fn check(app: &AppHandle) {
	if matches!(status(app), Status::Checking | Status::Downloading(_) | Status::Ready(_)) || cfg!(debug_assertions) {
		return;
	}

	set_status(app, Status::Checking);
	let app = app.clone();
	tauri::async_runtime::spawn(async move {
		let result = async {
			let Some(update) = app.updater()?.check().await? else {
				return Ok(None);
			};
			let version = update.version.clone();
			set_status(&app, Status::Downloading(version.clone()));
			let bytes = update.download(|_, _| {}, || {}).await?;
			*app.state::<State>().ready.lock().unwrap() = Some((update, bytes));
			Ok::<_, tauri_plugin_updater::Error>(Some(version))
		}
		.await;

		match result {
			Ok(Some(version)) => {
				set_status(&app, Status::Ready(version.clone()));
				let _ = app.notification().builder().title("Messy").body(fill(t().update_ready_notification, &version)).show();
			}
			Ok(None) => set_status(&app, Status::Idle),
			Err(error) => set_status(&app, Status::Error(error.to_string().lines().next().unwrap_or_default().to_owned())),
		}
	});
}

// Uruchamia instalator pobranej wersji; Messy zamyka się sam, a instalator uruchamia go ponownie.
// Zwraca false, gdy nie ma czego instalować.
pub fn install(app: &AppHandle) -> bool {
	let Some((update, bytes)) = app.state::<State>().ready.lock().unwrap().take() else {
		return false;
	};
	update.install(bytes).is_ok()
}

pub fn setup(app: &AppHandle) {
	app.manage(State::default());

	// W trybie deweloperskim (npm start) nie ma czego aktualizować. MESSY_FAKE_UPDATE=1.2.3 udaje
	// pobraną aktualizację, żeby dało się obejrzeć znacznik w aplikacji bez wydawania wersji.
	if cfg!(debug_assertions) {
		if let Ok(version) = std::env::var("MESSY_FAKE_UPDATE") {
			set_status(app, Status::Ready(version));
		}
		return;
	}

	let app = app.clone();
	tauri::async_runtime::spawn(async move {
		loop {
			check(&app);
			tokio::time::sleep(CHECK_INTERVAL).await;
		}
	});
}

