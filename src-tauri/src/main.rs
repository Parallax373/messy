// Messy: facebook.com/messages w panelu nad zasobnikiem Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod i18n;
mod updater;

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::image::Image;
use tauri::menu::{CheckMenuItem, IsMenuItem, Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, Rect, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Window, WindowEvent, Wry};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_opener::OpenerExt;

use i18n::{fill, t};
use updater::Status;

const MESSENGER_URL: &str = "https://www.facebook.com/messages/";
const MIN_WIDTH: f64 = 320.0;
const MIN_HEIGHT: f64 = 400.0;
const MARGIN: f64 = 8.0;
const TRAY_ID: &str = "tray";

// Przy nieprzeczytanych dymek w ikonie robi się czerwony (assets/icon-unread.svg).
const ICON_NORMAL: &[u8] = include_bytes!("../../assets/IconTray@2x.png");
const ICON_UNREAD: &[u8] = include_bytes!("../../assets/IconTrayUnread@2x.png");

// Skrypty wstrzykiwane do każdej strony, zanim wykonają się skrypty Facebooka.
fn page_script() -> String {
	let css = serde_json::to_string(include_str!("../../page/style.css")).unwrap();
	format!("{}\n{}", include_str!("../../page/bridge.js"), include_str!("../../page/inject.js").replace("__MESSY_CSS__", &css))
}

// Przełączniki zapamiętane między uruchomieniami; strona dostaje je przez page/bridge.js.
#[derive(Serialize, Deserialize, Clone, Copy)]
#[serde(default)]
struct Settings {
	muted: bool,
	oled: bool,
	// Przypięty panel nie chowa się po kliknięciu obok i stoi tam, gdzie go przeciągnięto.
	pinned: bool,
	// Przypięty panel bez kursora nad sobą ma prawie przezroczyste tło (chyba że piszesz).
	translucent: bool,
	// Zwykłe okno z ramką i paskiem zadań zamiast panelu nad zasobnikiem (np. na drugim monitorze).
	window_mode: bool,
	// Bez przycisku rozmowy wideo w nagłówku rozmowy.
	hide_video_call: bool,
}

impl Default for Settings {
	fn default() -> Self {
		Settings { muted: false, oled: false, pinned: false, translucent: true, window_mode: false, hide_video_call: false }
	}
}


// Rozmiar panelu (w pikselach logicznych) zapamiętany między uruchomieniami.
#[derive(Serialize, Deserialize)]
struct Size {
	width: f64,
	height: f64,
}

struct AppState {
	settings: Mutex<Settings>,
	unread: Mutex<u32>,
	// Okno chowa się po utracie fokusu; klik w ikonę zasobnika zabiera fokus,
	// więc bez tego znacznika ten sam klik od razu otwierałby je ponownie.
	hidden_by_blur_at: Mutex<Option<Instant>>,
	// Ostatnie położenie ikony zasobnika, przy niej otwiera się panel.
	tray_rect: Mutex<Option<Rect>>,
	// Położenie okna w chwili rozpoczęcia przeciągania prawym przyciskiem.
	drag_origin: Mutex<Option<PhysicalPosition<i32>>>,
}

fn config_file(app: &AppHandle, name: &str) -> PathBuf {
	let dir = app.path().app_config_dir().expect("katalog ustawień");
	let _ = fs::create_dir_all(&dir);
	dir.join(name)
}

fn read_json<T: for<'a> Deserialize<'a>>(app: &AppHandle, name: &str) -> Option<T> {
	serde_json::from_str(&fs::read_to_string(config_file(app, name)).ok()?).ok()
}

fn write_json(app: &AppHandle, name: &str, value: &impl Serialize) {
	let _ = fs::write(config_file(app, name), serde_json::to_string(value).unwrap());
}

fn state(app: &AppHandle) -> tauri::State<'_, AppState> {
	app.state::<AppState>()
}

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
	app.get_webview_window("main")
}

// Wysyła zdarzenie do page/bridge.js.
fn emit_to_page(app: &AppHandle, name: &str, value: impl Serialize) {
	if let Some(window) = main_window(app) {
		let _ = window.eval(format!("window.__messyEmit?.({}, {})", serde_json::to_string(name).unwrap(), serde_json::to_string(&value).unwrap()));
	}
}

fn set_setting_value(app: &AppHandle, key: &str, value: bool) {
	let state = state(app);
	let settings = {
		let mut settings = state.settings.lock().unwrap();
		match key {
			"muted" => settings.muted = value,
			"oled" => settings.oled = value,
			"pinned" => settings.pinned = value,
			"translucent" => settings.translucent = value,
			"window_mode" => settings.window_mode = value,
			"hide_video_call" => settings.hide_video_call = value,
			_ => return,
		}
		*settings
	};
	write_json(app, "settings.json", &settings);
	emit_to_page(app, "settings-changed", settings);
	build_tray_menu(app);
	// Odpięty panel wraca nad zasobnik.
	if (key == "pinned" && !value) || key == "window_mode" {
		if let Some(window) = main_window(app) {
			restore_window(app, &window);
		}
	}
}

// Położenie i rozmiar okna w trybie okna (piksele fizyczne), zapamiętane osobno od panelu.
#[derive(Serialize, Deserialize, Clone, Copy)]
struct Geometry {
	x: i32,
	y: i32,
	width: u32,
	height: u32,
	maximized: bool,
}

fn save_geometry(app: &AppHandle, window: &Window) {
	if window.is_minimized().unwrap_or(false) {
		return;
	}
	let maximized = window.is_maximized().unwrap_or(false);
	let previous = read_json::<Geometry>(app, "window-mode.json");
	let geometry = match (maximized, previous) {
		// Zmaksymalizowane okno: zostawiamy zwykły rozmiar, żeby po przywróceniu wróciło do niego.
		(true, Some(previous)) => Geometry { maximized: true, ..previous },
		_ => {
			let (Ok(position), Ok(size)) = (window.outer_position(), window.inner_size()) else {
				return;
			};
			Geometry { x: position.x, y: position.y, width: size.width, height: size.height, maximized }
		}
	};
	write_json(app, "window-mode.json", &geometry);
}

// Ustawia okno według trybu: zwykłe okno (ramka, pasek zadań, zapamiętane miejsce) albo panel nad zasobnikiem.
fn restore_window(app: &AppHandle, window: &WebviewWindow) {
	let settings = *state(app).settings.lock().unwrap();
	let window_mode = settings.window_mode;
	let _ = window.set_decorations(window_mode);
	let _ = window.set_shadow(window_mode);
	let _ = window.set_skip_taskbar(!window_mode);
	let _ = window.set_always_on_top(!window_mode);
	if window_mode {
		if let Some(geometry) = read_json::<Geometry>(app, "window-mode.json") {
			let _ = window.set_position(PhysicalPosition::new(geometry.x, geometry.y));
			let _ = window.set_size(PhysicalSize::new(geometry.width, geometry.height));
			if geometry.maximized {
				let _ = window.maximize();
			}
		}
		return;
	}
	if window.is_maximized().unwrap_or(false) {
		let _ = window.unmaximize();
	}
	position_window(app, window);
	// Przypięty panel otwiera się tam, gdzie go zostawiono.
	if settings.pinned {
		if let Some((x, y)) = read_json::<(i32, i32)>(app, "window-position.json") {
			let _ = window.set_position(PhysicalPosition::new(x, y));
		}
	}
}

// Przeciąganie panelu prawym przyciskiem (page/inject.js): „start”, potem „move” z przesunięciem kursora
// od początku w pikselach fizycznych, na koniec „end”. Przeciągnięty panel zostaje przypięty w nowym miejscu.
#[tauri::command]
fn drag_window(app: AppHandle, phase: String, dx: f64, dy: f64) {
	let Some(window) = main_window(&app) else {
		return;
	};
	let state = state(&app);
	match phase.as_str() {
		"start" => *state.drag_origin.lock().unwrap() = window.outer_position().ok(),
		"move" => {
			if let Some(origin) = *state.drag_origin.lock().unwrap() {
				let _ = window.set_position(PhysicalPosition::new(origin.x + dx.round() as i32, origin.y + dy.round() as i32));
			}
		}
		_ => {
			*state.drag_origin.lock().unwrap() = None;
			// W trybie okna położenie zapisuje zdarzenie Moved, a przypinanie nie ma sensu.
			if state.settings.lock().unwrap().window_mode {
				return;
			}
			if let Ok(position) = window.outer_position() {
				write_json(&app, "window-position.json", &(position.x, position.y));
			}
			if !state.settings.lock().unwrap().pinned {
				set_setting_value(&app, "pinned", true);
			}
		}
	}
}

#[tauri::command]
fn get_settings(app: AppHandle) -> Settings {
	*state(&app).settings.lock().unwrap()
}

#[tauri::command]
fn set_setting(app: AppHandle, key: String, value: bool) {
	set_setting_value(&app, &key, value);
}

#[tauri::command]
fn get_strings() -> i18n::PageStrings {
	t().page
}

#[tauri::command]
fn get_update_ready(app: AppHandle) -> Option<String> {
	updater::ready_version(&app)
}

#[tauri::command]
fn install_update(app: AppHandle) {
	updater::install(&app);
}

// Liczbę nieprzeczytanych rozmów liczy page/inject.js.
// Podgląd zdjęć na pełnym ekranie; po wyjściu panel wraca na swoje miejsce nad zasobnikiem.
#[tauri::command]
fn set_fullscreen(app: AppHandle, on: bool) {
	let Some(window) = main_window(&app) else {
		return;
	};
	let _ = window.set_fullscreen(on);
	if !on {
		restore_window(&app, &window);
	}
}

#[tauri::command]
fn set_unread(app: AppHandle, count: u32) {
	*state(&app).unread.lock().unwrap() = count;
	if let Some(tray) = app.tray_by_id(TRAY_ID) {
		let _ = tray.set_icon(Image::from_bytes(if count > 0 { ICON_UNREAD } else { ICON_NORMAL }).ok());
	}
	update_tooltip(&app);
}

fn update_tooltip(app: &AppHandle) {
	let Some(tray) = app.tray_by_id(TRAY_ID) else {
		return;
	};
	let unread = *state(app).unread.lock().unwrap();
	let tooltip = match updater::ready_version(app) {
		Some(version) => fill(t().tooltip_update, version),
		None if unread > 0 => fill(t().tooltip_unread, unread),
		None => t().tooltip.to_owned(),
	};
	let _ = tray.set_tooltip(Some(tooltip));
}

// Gotowa aktualizacja: strona pokazuje wtedy przycisk „Zaktualizuj” w nagłówku „Czaty”.
pub fn update_status_changed(app: &AppHandle) {
	build_tray_menu(app);
	update_tooltip(app);
	emit_to_page(app, "update-ready", updater::ready_version(app));
}

fn build_tray_menu(app: &AppHandle) {
	let Some(tray) = app.tray_by_id(TRAY_ID) else {
		return;
	};
	if let Ok(menu) = tray_menu(app) {
		let _ = tray.set_menu(Some(menu));
	}
}

fn tray_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
	let strings = t();
	let settings = *state(app).settings.lock().unwrap();
	let packaged = !cfg!(debug_assertions);
	let autostart = app.autolaunch().is_enabled().unwrap_or(false);
	let update = match updater::status(app) {
		Status::Checking => MenuItem::with_id(app, "noop", strings.checking, false, None::<&str>)?,
		Status::Downloading(version) => MenuItem::with_id(app, "noop", fill(strings.downloading, version), false, None::<&str>)?,
		Status::Ready(version) => MenuItem::with_id(app, "install", fill(strings.restart_to_update, version), true, None::<&str>)?,
		Status::Error(message) => MenuItem::with_id(app, "check", fill(strings.check_updates_error, message), packaged, None::<&str>)?,
		Status::Idle => MenuItem::with_id(app, "check", strings.check_updates, packaged, None::<&str>)?,
	};
	let items: Vec<Box<dyn IsMenuItem<Wry>>> = vec![
		Box::new(MenuItem::with_id(app, "version", format!("Messy {}", app.package_info().version), false, None::<&str>)?),
		Box::new(update),
		Box::new(PredefinedMenuItem::separator(app)?),
		Box::new(MenuItem::with_id(app, "show", strings.show, true, None::<&str>)?),
		Box::new(CheckMenuItem::with_id(app, "muted", strings.mute, true, settings.muted, None::<&str>)?),
		Box::new(CheckMenuItem::with_id(app, "oled", strings.oled, true, settings.oled, None::<&str>)?),
		Box::new(CheckMenuItem::with_id(app, "pinned", strings.pin, true, settings.pinned, None::<&str>)?),
		Box::new(CheckMenuItem::with_id(app, "translucent", strings.translucent, true, settings.translucent, None::<&str>)?),
		Box::new(CheckMenuItem::with_id(app, "window_mode", strings.window_mode, true, settings.window_mode, None::<&str>)?),
		Box::new(CheckMenuItem::with_id(app, "hide_video_call", strings.hide_video_call, true, settings.hide_video_call, None::<&str>)?),
		Box::new(CheckMenuItem::with_id(app, "autostart", strings.autostart, packaged, autostart, None::<&str>)?),
		Box::new(MenuItem::with_id(app, "devtools", strings.dev_tools, true, None::<&str>)?),
		Box::new(PredefinedMenuItem::separator(app)?),
		Box::new(MenuItem::with_id(app, "quit", strings.quit, true, None::<&str>)?),
	];
	Menu::with_items(app, &items.iter().map(Box::as_ref).collect::<Vec<_>>())
}

fn on_menu_event(app: &AppHandle, event: MenuEvent) {
	let settings = *state(app).settings.lock().unwrap();
	match event.id().as_ref() {
		"check" => updater::check(app),
		"install" => {
			updater::install(app);
		}
		"show" => show_window(app),
		"muted" => set_setting_value(app, "muted", !settings.muted),
		"oled" => set_setting_value(app, "oled", !settings.oled),
		"pinned" => {
			set_setting_value(app, "pinned", !settings.pinned);
			if !settings.pinned {
				show_window(app);
			}
		}
		"translucent" => set_setting_value(app, "translucent", !settings.translucent),
		"window_mode" => {
			set_setting_value(app, "window_mode", !settings.window_mode);
			show_window(app);
		}
		"hide_video_call" => set_setting_value(app, "hide_video_call", !settings.hide_video_call),
		"autostart" => {
			let autolaunch = app.autolaunch();
			let _ = if autolaunch.is_enabled().unwrap_or(false) { autolaunch.disable() } else { autolaunch.enable() };
			build_tray_menu(app);
		}
		"devtools" => {
			if let Some(window) = main_window(app) {
				window.open_devtools();
			}
		}
		// Pobrana aktualizacja instaluje się przy zamknięciu, jeśli nikt nie kliknął „Zaktualizuj”.
		"quit" => {
			if !updater::install(app) {
				app.exit(0);
			}
		}
		_ => {}
	}
}

// Windows 11 trzyma widoczność ikon zasobnika w HKCU\Control Panel\NotifyIconSettings;
// IsPromoted = 1 trzyma ikonę na pasku zadań zamiast w schowanym menu (jak Steam).
fn promote_tray_icon() {
	use std::os::windows::process::CommandExt;
	const CREATE_NO_WINDOW: u32 = 0x0800_0000;
	let script = r"
		Get-ChildItem 'HKCU:\Control Panel\NotifyIconSettings' | ForEach-Object {
			if ((Get-ItemProperty $_.PSPath).ExecutablePath -eq $env:TRAY_EXE) {
				Set-ItemProperty $_.PSPath -Name IsPromoted -Value 1 -Type DWord
			}
		}";
	let Ok(exe) = std::env::current_exe() else {
		return;
	};
	let _ = std::process::Command::new("powershell.exe")
		.args(["-NoProfile", "-NonInteractive", "-Command", script])
		.env("TRAY_EXE", exe)
		.creation_flags(CREATE_NO_WINDOW)
		.spawn();
}

// Ścieżki facebook.com potrzebne do czatu i logowania; resztę otwieramy w przeglądarce.
fn is_allowed_in_app(url: &url::Url) -> bool {
	if !matches!(url.host_str(), Some("www.facebook.com" | "facebook.com")) {
		return false;
	}
	const ALLOWED: &[&str] = &["/messages", "/login", "/checkpoint", "/two_step_verification", "/recover", "/auth_platform", "/privacy/consent"];
	let path = url.path();
	path == "/" || ALLOWED.iter().any(|prefix| path.starts_with(prefix))
}

// Panel nad zasobnikiem: przy prawej krawędzi obszaru roboczego, tuż nad paskiem zadań.
fn position_window(app: &AppHandle, window: &WebviewWindow) {
	let Some(rect) = *state(app).tray_rect.lock().unwrap() else {
		return;
	};
	let scale = window.scale_factor().unwrap_or(1.0);
	let tray_position = rect.position.to_physical::<f64>(scale);
	let tray_size = rect.size.to_physical::<f64>(scale);
	let Ok(Some(monitor)) = window.monitor_from_point(tray_position.x, tray_position.y) else {
		return;
	};
	let scale = monitor.scale_factor();
	let area = monitor.work_area();
	let (area_x, area_y) = (f64::from(area.position.x), f64::from(area.position.y));
	let (area_width, area_height) = (f64::from(area.size.width), f64::from(area.size.height));
	let margin = MARGIN * scale;
	let saved = load_size(app);
	let width = (saved.width * scale).min(area_width - 2.0 * margin);
	let height = (saved.height * scale).min(area_height - 2.0 * margin);
	let x = (tray_position.x + tray_size.width / 2.0 - width / 2.0).max(area_x + margin).min(area_x + area_width - width - margin);
	let y = area_y + area_height - height - margin;
	let _ = window.set_size(PhysicalSize::new(width.round() as u32, height.round() as u32));
	let _ = window.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
}

fn show_window(app: &AppHandle) {
	let Some(window) = main_window(app) else {
		return;
	};
	restore_window(app, &window);
	let _ = window.show();
	let _ = window.unminimize();
	let _ = window.set_focus();
}

fn toggle_window(app: &AppHandle) {
	let Some(window) = main_window(app) else {
		return;
	};
	// Zwykłe okno: klik w ikonę zawsze je wyciąga na wierzch (chowa się krzyżykiem albo minimalizacją).
	if state(app).settings.lock().unwrap().window_mode {
		show_window(app);
		return;
	}
	let recently_hidden = state(app).hidden_by_blur_at.lock().unwrap().is_some_and(|at| at.elapsed() < Duration::from_millis(300));
	if window.is_visible().unwrap_or(false) {
		let _ = window.hide();
	} else if !recently_hidden {
		show_window(app);
	}
}

fn load_size(app: &AppHandle) -> Size {
	read_json::<Size>(app, "window-size.json")
		.filter(|size| size.width >= MIN_WIDTH && size.height >= MIN_HEIGHT)
		.unwrap_or(Size { width: 420.0, height: 640.0 })
}

fn on_window_event(window: &Window, event: &WindowEvent) {
	// Okna rozmów zachowują się jak zwykłe okna.
	if window.label() != "main" {
		return;
	}
	let app = window.app_handle();
	match event {
		WindowEvent::Focused(false) => {
			let devtools_open = main_window(app).is_some_and(|window| window.is_devtools_open());
			let settings = *state(app).settings.lock().unwrap();
			let pinned = settings.pinned || settings.window_mode;
			if !devtools_open && !pinned && window.is_visible().unwrap_or(false) {
				*state(app).hidden_by_blur_at.lock().unwrap() = Some(Instant::now());
				let _ = window.hide();
			}
		}
		WindowEvent::Moved(_) | WindowEvent::Resized(_) if state(app).settings.lock().unwrap().window_mode => {
			if window.is_visible().unwrap_or(false) && !window.is_fullscreen().unwrap_or(false) {
				save_geometry(app, window);
			}
		}
		WindowEvent::Resized(size) if window.is_visible().unwrap_or(false) && !window.is_fullscreen().unwrap_or(false) && size.width > 0 => {
			let logical = size.to_logical::<f64>(window.scale_factor().unwrap_or(1.0));
			write_json(app, "window-size.json", &Size { width: logical.width.round(), height: logical.height.round() });
		}
		// Aplikacja żyje w zasobniku, więc zamknięcie okna (np. Alt+F4) tylko je chowa.
		WindowEvent::CloseRequested { api, .. } => {
			api.prevent_close();
			let _ = window.hide();
		}
		_ => {}
	}
}

fn create_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
	let size = load_size(app);
	let opener = app.clone();
	let navigator = app.clone();
	let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::External(MESSENGER_URL.parse().unwrap()))
		.title("Messy")
		.inner_size(size.width, size.height)
		.min_inner_size(MIN_WIDTH, MIN_HEIGHT)
		.visible(false)
		.decorations(false)
		.resizable(true)
		// Z cieniem Tauri na Windows łapie rozciąganie tylko na górnej krawędzi.
		.shadow(false)
		.skip_taskbar(true)
		.always_on_top(true)
		// Przezroczyste okno: tło przypiętego, nieużywanego panelu prześwituje (page/style.css, messy-dim).
		.transparent(true)
		.initialization_script(page_script())
		.on_new_window(move |url, features| {
			if is_call_window(&url) {
				if let Ok(window) = create_call_window(&opener, features) {
					return NewWindowResponse::Create { window };
				}
			} else if !is_allowed_in_app(&url) {
				let _ = opener.opener().open_url(url.as_str(), None::<&str>);
			}
			NewWindowResponse::Deny
		})
		.on_navigation(move |url| {
			if is_allowed_in_app(url) || url.scheme() == "about" {
				return true;
			}
			let _ = navigator.opener().open_url(url.as_str(), None::<&str>);
			false
		})
		.build()?;
	allow_permissions(&window);
	Ok(window)
}

// Rozmowy głosowe i wideo Messenger otwiera w nowym oknie (facebook.com/groupcall/…, czasem najpierw about:blank).
fn is_call_window(url: &url::Url) -> bool {
	url.scheme() == "about" || matches!(url.host_str(), Some("www.facebook.com" | "facebook.com"))
}

// Zwykłe okno z ramką, które nie chowa się po utracie fokusu. Musi dzielić środowisko WebView2 z panelem
// (window_features), inaczej nie ma sesji Facebooka ani window.opener.
fn create_call_window(app: &AppHandle, features: tauri::webview::NewWindowFeatures) -> tauri::Result<WebviewWindow> {
	static COUNTER: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
	let label = format!("call-{}", COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed));
	let window = WebviewWindowBuilder::new(app, label, WebviewUrl::External("about:blank".parse().unwrap()))
		.title("Messy")
		.inner_size(900.0, 640.0)
		.window_features(features)
		.on_document_title_changed(|window, title| {
			let _ = window.set_title(&title);
		})
		.build()?;
	allow_permissions(&window);
	Ok(window)
}

// Powiadomienia oraz mikrofon i kamera (rozmowy) bez pytania; wyciszeniem zajmuje się page/inject.js.
fn allow_permissions(window: &WebviewWindow) {
	use webview2_com::Microsoft::Web::WebView2::Win32::{
		COREWEBVIEW2_PERMISSION_KIND_CAMERA, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE, COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS,
		COREWEBVIEW2_PERMISSION_STATE_ALLOW,
	};
	use webview2_com::PermissionRequestedEventHandler;

	let _ = window.with_webview(|webview| unsafe {
		let Ok(core) = webview.controller().CoreWebView2() else {
			return;
		};
		let handler = PermissionRequestedEventHandler::create(Box::new(|_, args| {
			let Some(args) = args else {
				return Ok(());
			};
			let mut kind = Default::default();
			args.PermissionKind(&mut kind)?;
			if [COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS, COREWEBVIEW2_PERMISSION_KIND_MICROPHONE, COREWEBVIEW2_PERMISSION_KIND_CAMERA].contains(&kind) {
				args.SetState(COREWEBVIEW2_PERMISSION_STATE_ALLOW)?;
			}
			Ok(())
		}));
		let mut token = Default::default();
		let _ = core.add_PermissionRequested(&handler, &mut token);
	});
}

fn create_tray(app: &AppHandle) -> tauri::Result<TrayIcon> {
	TrayIconBuilder::with_id(TRAY_ID)
		.icon(Image::from_bytes(ICON_NORMAL)?)
		.tooltip(t().tooltip)
		.show_menu_on_left_click(false)
		.on_menu_event(on_menu_event)
		.on_tray_icon_event(|tray, event| {
			if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, rect, .. } = event {
				let app = tray.app_handle();
				*state(app).tray_rect.lock().unwrap() = Some(rect);
				toggle_window(app);
			}
		})
		.build(app)
}

fn main() {
	tauri::Builder::default()
		.plugin(tauri_plugin_single_instance::init(|app, _, _| show_window(app)))
		.plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
		.plugin(tauri_plugin_notification::init())
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_updater::Builder::new().build())
		.invoke_handler(tauri::generate_handler![get_settings, set_setting, get_strings, get_update_ready, install_update, set_unread, set_fullscreen, drag_window])
		.on_window_event(on_window_event)
		.setup(|app| {
			let handle = app.handle();
			let first_run = !config_file(handle, "settings.json").exists();
			app.manage(AppState {
				settings: Mutex::new(read_json(handle, "settings.json").unwrap_or_default()),
				unread: Mutex::new(0),
				hidden_by_blur_at: Mutex::new(None),
				tray_rect: Mutex::new(None),
				drag_origin: Mutex::new(None),
			});

			// Uruchamianie z Windowsem włączamy przy pierwszym starcie zainstalowanej aplikacji,
			// bo Messy żyje w zasobniku i bez tego po restarcie komputera po prostu go nie ma.
			if first_run && !cfg!(debug_assertions) {
				let _ = handle.autolaunch().enable();
				write_json(handle, "settings.json", &Settings::default());
			}

			create_window(handle)?;
			create_tray(handle)?;
			updater::setup(handle);
			build_tray_menu(handle);

			// Wpis w rejestrze powstaje dopiero, gdy Windows zobaczy ikonę, więc przy pierwszym uruchomieniu ponawiamy.
			promote_tray_icon();
			std::thread::spawn(|| {
				std::thread::sleep(Duration::from_secs(5));
				promote_tray_icon();
			});
			Ok(())
		})
		.build(tauri::generate_context!())
		.expect("uruchomienie Messy")
		.run(|_, event| {
			// Aplikacja żyje w zasobniku, więc zamknięcie okna jej nie kończy.
			if let tauri::RunEvent::ExitRequested { api, code: None, .. } = event {
				api.prevent_exit();
			}
		});
}
