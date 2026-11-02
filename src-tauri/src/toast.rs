// Dymki nowych wiadomości (page/toast.html), gdy okno Messy jest schowane: w panelu i trybie swobodnym przy prawej
// krawędzi nad zasobnikiem, w trybie krawędzi od tej krawędzi, przy której stoi okno. W trybie okna zostają
// powiadomienia Windowsa. Nowe wiadomości wykrywa page/inject.js na liście czatów.
use std::sync::Mutex;

use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Monitor, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

use crate::{dock_monitor, main_window, read_json, state, Edge, EdgeDock, MARGIN};

const LABEL: &str = "toast";
const WIDTH: f64 = 360.0;

#[derive(Deserialize, Serialize, Clone)]
pub struct Message {
	// Adres rozmowy na liście czatów (/messages/t/…); klik w dymek ją otwiera.
	href: String,
	name: String,
	text: String,
	avatar: String,
}

// Wywołania window.__toast czekające, aż okno dymków się wczyta.
#[derive(Default)]
pub struct ToastState {
	loaded: Mutex<bool>,
	pending: Mutex<Vec<String>>,
}

// Wiadomość od dymków przez tytuł dokumentu (page/toast.html).
#[derive(Deserialize)]
struct Report {
	#[serde(default)]
	ready: bool,
	height: Option<f64>,
	open: Option<String>,
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
	app.get_webview_window(LABEL)
}

fn run(app: &AppHandle, script: String) {
	let toasts = app.state::<ToastState>();
	if !*toasts.loaded.lock().unwrap() {
		toasts.pending.lock().unwrap().push(script);
		return;
	}
	if let Some(window) = window(app) {
		let _ = window.eval(script);
	}
}

pub fn create(app: &AppHandle) -> tauri::Result<WebviewWindow> {
	app.manage(ToastState::default());
	let html = base64::engine::general_purpose::STANDARD.encode(include_str!("../../page/toast.html"));
	let url = format!("data:text/html;charset=utf-8;base64,{html}");
	let handle = app.clone();
	WebviewWindowBuilder::new(app, LABEL, WebviewUrl::External(url.parse().unwrap()))
		.title("Messy")
		.inner_size(WIDTH, 100.0)
		.visible(false)
		.decorations(false)
		.resizable(false)
		.shadow(false)
		.skip_taskbar(true)
		.always_on_top(true)
		.transparent(true)
		// Dymek nie zabiera fokusu oknu, w którym akurat piszesz.
		.focusable(false)
		.focused(false)
		// Gotowość zgłasza sama strona (ready), bo dla adresów data: on_page_load się nie wywołuje.
		.on_document_title_changed(move |window, title| {
			let Ok(report) = serde_json::from_str::<Report>(&title) else {
				return;
			};
			if report.ready {
				*handle.state::<ToastState>().loaded.lock().unwrap() = true;
				for script in handle.state::<ToastState>().pending.lock().unwrap().drain(..) {
					let _ = window.eval(script);
				}
			}
			if let Some(height) = report.height {
				place(&handle, height);
			}
			if let Some(href) = report.open {
				crate::open_chat(&handle, &href);
			}
		})
		.build()
}

// Monitor i krawędź, od której wjeżdżają dymki.
fn anchor(app: &AppHandle) -> Option<(Monitor, Edge)> {
	let main = main_window(app)?;
	if state(app).settings.lock().unwrap().edge_mode {
		let saved = read_json::<EdgeDock>(app, "edge-dock.json");
		let monitor = dock_monitor(&main, saved.as_ref())?;
		return Some((monitor, saved.map_or(Edge::Right, |dock| dock.edge)));
	}
	// Schowany panel stoi nad zasobnikiem, więc jego monitor to monitor ikony.
	let monitor = main.current_monitor().ok().flatten().or_else(|| main.primary_monitor().ok().flatten())?;
	Some((monitor, Edge::Right))
}

// Dopasowuje okno do wysokości stosu dymków (piksele logiczne): przy górnej krawędzi stoi u góry, wszędzie indziej
// na dole, przy lewej krawędzi po lewej, wszędzie indziej po prawej. Pusty stos chowa okno.
fn place(app: &AppHandle, height: f64) {
	let Some(window) = window(app) else {
		return;
	};
	if height <= 0.0 {
		let _ = window.hide();
		return;
	}
	let Some((monitor, edge)) = anchor(app) else {
		return;
	};
	let scale = monitor.scale_factor();
	let area = monitor.work_area();
	let margin = (MARGIN * scale).round() as i32;
	let width = (WIDTH * scale).round() as i32;
	let height = ((height * scale).round() as i32).min(area.size.height as i32 - 2 * margin);
	let x = if edge == Edge::Left { area.position.x + margin } else { area.position.x + area.size.width as i32 - width - margin };
	let y = if edge == Edge::Top { area.position.y + margin } else { area.position.y + area.size.height as i32 - height - margin };
	let _ = window.set_size(PhysicalSize::new(width as u32, height as u32));
	let _ = window.set_position(PhysicalPosition::new(x, y));
	if !window.is_visible().unwrap_or(false) {
		let _ = window.show();
	}
}

// Nowa wiadomość z page/inject.js: dymek tylko wtedy, gdy okna Messy nie widać, nie w trybie okna i nie przy wyciszeniu.
pub fn show(app: &AppHandle, message: Message) {
	let st = state(app);
	let settings = *st.settings.lock().unwrap();
	if settings.muted || settings.window_mode {
		return;
	}
	let visible = main_window(app).is_some_and(|window| window.is_visible().unwrap_or(false));
	let open = if settings.edge_mode { visible && *st.edge_expanded.lock().unwrap() } else { visible };
	if open {
		return;
	}
	let Some((_, edge)) = anchor(app) else {
		return;
	};
	let mut value = serde_json::to_value(message).unwrap();
	value["from"] = serde_json::to_value(edge).unwrap();
	value["light"] = settings.light.into();
	run(app, format!("window.__toast.add({value})"));
}

// Okno Messy się pokazało: dymki są już niepotrzebne.
pub fn clear(app: &AppHandle) {
	if window(app).is_some_and(|window| window.is_visible().unwrap_or(false)) {
		run(app, "window.__toast.clear()".to_owned());
	}
}
