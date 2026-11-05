// Powiadomienia Windowsa wysyłane przez samo Messy (menu ikony, Powiadomienia → „Powiadomienia Windows”), zamiast
// tych od Facebooka. Facebook nie wysyła powiadomień, gdy strona jest widoczna (np. okno schowane przy krawędzi),
// a Messy wykrywa nowe wiadomości samo (page/inject.js), więc działa to w każdym trybie. Powiadomienie ma szybką
// reakcję czatu i pole odpowiedzi; obie rzeczy wykonuje strona (page/inject.js, onToastAction).
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager};
use windows::core::{Interface, HSTRING, IInspectable};
use windows::Data::Xml::Dom::XmlDocument;
use windows::Foundation::{IPropertyValue, TypedEventHandler};
use windows::UI::Notifications::{ToastActivatedEventArgs, ToastNotification, ToastNotificationManager};

use crate::i18n::t;
use crate::toast::Message;

// Ten sam identyfikator co skrót instalatora w menu Start; bez niego Windows nie pokaże powiadomienia.
const AUMID: &str = "pl.messy.app";
// Tyle ostatnich powiadomień trzymamy w pamięci: bez obiektu Windows nie zgłosi kliknięcia z centrum powiadomień.
const KEEP: usize = 30;

#[derive(Default)]
pub struct NativeToasts(Mutex<Vec<ToastNotification>>);

// Polecenie dla strony po kliknięciu przycisku w powiadomieniu.
#[derive(Serialize, Clone)]
struct Action {
	action: &'static str,
	href: String,
	text: String,
}

fn escape(text: &str) -> String {
	text.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&apos;")
}

// Avatar z fbcdn do pliku tymczasowego: powiadomienia aplikacji bez paczki MSIX nie wczytują obrazków z sieci.
async fn avatar_file(url: &str) -> Option<String> {
	if url.is_empty() {
		return None;
	}
	// Dostawca TLS jak w src/upload.rs: reqwest bez niego panikuje.
	if rustls::crypto::CryptoProvider::get_default().is_none() {
		let _ = rustls::crypto::ring::default_provider().install_default();
	}
	let bytes = reqwest::get(url).await.ok()?.error_for_status().ok()?.bytes().await.ok()?;
	let dir = std::env::temp_dir().join("messy-avatars");
	tokio::fs::create_dir_all(&dir).await.ok()?;
	// Nazwa z adresu, żeby ta sama osoba nie zapisywała pliku za każdym razem.
	let name: String = url.split('?').next()?.rsplit('/').next()?.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '_').collect();
	let path = dir.join(if name.is_empty() { "avatar.jpg".to_owned() } else { name });
	if tokio::fs::metadata(&path).await.is_err() {
		tokio::fs::write(&path, &bytes).await.ok()?;
	}
	Some(path.to_string_lossy().into_owned())
}

fn xml(message: &Message, avatar: Option<String>, silent: bool) -> String {
	let s = t();
	let href = escape(&message.href);
	let image = avatar.map(|path| format!(r#"<image placement="appLogoOverride" hint-crop="circle" src="{}"/>"#, escape(&path))).unwrap_or_default();
	let audio = if silent { r#"<audio silent="true"/>"# } else { r#"<audio src="ms-winsoundevent:Notification.IM"/>"# };
	format!(
		r#"<toast launch="open|{href}" activationType="foreground">
<visual><binding template="ToastGeneric"><text>{name}</text><text>{text}</text>{image}</binding></visual>
<actions>
<input id="reply" type="text" placeHolderContent="{reply}"/>
<action content="{send}" arguments="reply|{href}" activationType="foreground" hint-inputId="reply"/>
<action content="{react}" arguments="react|{href}" activationType="foreground"/>
</actions>
{audio}
</toast>"#,
		name = escape(&message.name),
		text = escape(&message.text),
		reply = escape(s.toast_reply),
		send = escape(s.toast_send),
		react = escape(s.toast_react),
	)
}

fn on_activated(app: &AppHandle, args: &ToastActivatedEventArgs) -> windows::core::Result<()> {
	let arguments = args.Arguments()?.to_string();
	let Some((action, href)) = arguments.split_once('|') else {
		return Ok(());
	};
	let text = args
		.UserInput()
		.and_then(|inputs| inputs.Lookup(&HSTRING::from("reply")))
		.and_then(|value| value.cast::<IPropertyValue>()?.GetString())
		.map(|value| value.to_string())
		.unwrap_or_default();
	let (action, href) = (action.to_owned(), href.to_owned());
	let handle = app.clone();
	// Zdarzenie przychodzi w wątku Windowsa; okno i strona tylko z głównego wątku.
	// Z tekstem to zawsze odpowiedź: karty compact-notifications chowają „Wyślij” przy polu i Enter naciska wtedy
	// pierwszy widoczny przycisk (szybką reakcję).
	let action = if text.trim().is_empty() { action } else { "reply".to_owned() };
	let _ = app.run_on_main_thread(move || match action.as_str() {
		"reply" if !text.trim().is_empty() => crate::emit_to_page(&handle, "toast-action", Action { action: "reply", href, text }),
		"react" => crate::emit_to_page(&handle, "toast-action", Action { action: "react", href, text: String::new() }),
		// Puste „Wyślij” albo klik w samo powiadomienie: okno z tą rozmową.
		_ => crate::open_chat(&handle, &href),
	});
	Ok(())
}

fn send(app: &AppHandle, document: &str) -> windows::core::Result<()> {
	let xml = XmlDocument::new()?;
	xml.LoadXml(&HSTRING::from(document))?;
	let toast = ToastNotification::CreateToastNotification(&xml)?;
	let handle = app.clone();
	toast.Activated(&TypedEventHandler::<ToastNotification, IInspectable>::new(move |_, args| {
		if let Some(args) = args.as_ref().and_then(|args| args.cast::<ToastActivatedEventArgs>().ok()) {
			on_activated(&handle, &args)?;
		}
		Ok(())
	}))?;
	ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(AUMID))?.Show(&toast)?;
	let toasts = app.state::<NativeToasts>();
	let mut kept = toasts.0.lock().unwrap();
	kept.push(toast);
	let extra = kept.len().saturating_sub(KEEP);
	kept.drain(..extra);
	Ok(())
}

// Nowa wiadomość z page/inject.js, gdy wybrane są powiadomienia Windows. Nie, gdy okno Messy ma fokus albo jest
// wysunięte przy krawędzi (wtedy widać rozmowę).
pub fn show(app: &AppHandle, message: Message) {
	let st = crate::state(app);
	let settings = *st.settings.lock().unwrap();
	if settings.muted {
		return;
	}
	let window = crate::main_window(app);
	let visible = window.as_ref().is_some_and(|window| window.is_visible().unwrap_or(false));
	// GetForegroundWindow, bo is_focused bywa nieaktualne po przełączeniu na inną aplikację.
	let foreground = unsafe { windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow() };
	let focused = window.as_ref().and_then(|window| window.hwnd().ok()).is_some_and(|hwnd| hwnd.0 == foreground.0);
	if (visible && focused) || (settings.edge_mode && visible && *st.edge_expanded.lock().unwrap()) {
		return;
	}
	let handle = app.clone();
	tauri::async_runtime::spawn(async move {
		let avatar = avatar_file(&message.avatar).await;
		let document = xml(&message, avatar, false);
		let app = handle.clone();
		let _ = handle.run_on_main_thread(move || {
			if let Err(error) = send(&app, &document) {
				eprintln!("powiadomienie Windows: {error}");
			}
		});
	});
}
