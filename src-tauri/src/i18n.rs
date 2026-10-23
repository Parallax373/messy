// Teksty interfejsu: polski dla polskiego Windowsa, w każdym innym przypadku angielski.
use serde::Serialize;

pub struct Strings {
	pub tooltip: &'static str,
	pub tooltip_unread: &'static str,
	pub tooltip_update: &'static str,
	pub checking: &'static str,
	pub downloading: &'static str,
	pub restart_to_update: &'static str,
	pub check_updates: &'static str,
	pub check_updates_error: &'static str,
	pub update_ready_notification: &'static str,
	pub show: &'static str,
	pub mute: &'static str,
	pub oled: &'static str,
	pub pin: &'static str,
	pub translucent: &'static str,
	pub hide_video_call: &'static str,
	pub autostart: &'static str,
	pub dev_tools: &'static str,
	pub quit: &'static str,
	pub page: PageStrings,
}

// Teksty przycisków wstrzykiwanych do strony (page/inject.js); {version} podstawia sama strona.
#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct PageStrings {
	pub oled_on: &'static str,
	pub oled_off: &'static str,
	pub mute_on: &'static str,
	pub mute_off: &'static str,
	pub pin_on: &'static str,
	pub pin_off: &'static str,
	pub update: &'static str,
	pub update_hint: &'static str,
}

// {} w tekstach zastępuje fill().
const PL: Strings = Strings {
	tooltip: "Messy",
	tooltip_unread: "Messy: {} nieprzeczytane",
	tooltip_update: "Messy: dostępna aktualizacja {}",
	checking: "Sprawdzanie aktualizacji…",
	downloading: "Pobieranie wersji {}…",
	restart_to_update: "Uruchom ponownie i zaktualizuj do {}",
	check_updates: "Sprawdź aktualizacje",
	check_updates_error: "Sprawdź aktualizacje (błąd: {})",
	update_ready_notification: "Wersja {} jest gotowa. Kliknij zielony przycisk w nagłówku albo uruchom ponownie z menu ikony.",
	show: "Pokaż",
	mute: "Wycisz powiadomienia",
	oled: "Tryb OLED (czarny)",
	pin: "Przypnij panel",
	translucent: "Przezroczysty, gdy przypięty",
	hide_video_call: "Ukryj przycisk rozmowy wideo",
	autostart: "Uruchamiaj z Windowsem",
	dev_tools: "Narzędzia deweloperskie",
	quit: "Zakończ",
	page: PageStrings {
		oled_on: "Wyłącz tryb OLED",
		oled_off: "Włącz tryb OLED",
		mute_on: "Włącz powiadomienia",
		mute_off: "Wycisz powiadomienia",
		pin_on: "Odepnij panel (wróci nad zasobnik)",
		pin_off: "Przypnij panel (zostaje na wierzchu, przeciągasz prawym przyciskiem)",
		update: "Zaktualizuj do {version}",
		update_hint: "Zaktualizuj do {version} (uruchomi ponownie Messy)",
	},
};

const EN: Strings = Strings {
	tooltip: "Messy",
	tooltip_unread: "Messy: {} unread",
	tooltip_update: "Messy: update {} available",
	checking: "Checking for updates…",
	downloading: "Downloading version {}…",
	restart_to_update: "Restart and update to {}",
	check_updates: "Check for updates",
	check_updates_error: "Check for updates (error: {})",
	update_ready_notification: "Version {} is ready. Click the green button in the header or restart from the tray menu.",
	show: "Show",
	mute: "Mute notifications",
	oled: "OLED mode (black)",
	pin: "Pin panel",
	translucent: "Translucent when pinned",
	hide_video_call: "Hide the video call button",
	autostart: "Start with Windows",
	dev_tools: "Developer tools",
	quit: "Quit",
	page: PageStrings {
		oled_on: "Turn off OLED mode",
		oled_off: "Turn on OLED mode",
		mute_on: "Unmute notifications",
		mute_off: "Mute notifications",
		pin_on: "Unpin panel (goes back above the tray)",
		pin_off: "Pin panel (stays on top, drag with the right mouse button)",
		update: "Update to {version}",
		update_hint: "Update to {version} (restarts Messy)",
	},
};

// MESSY_LANG=en wymusza angielski, np. do zrzutów ekranu na polskim Windowsie.
pub fn t() -> &'static Strings {
	let locale = std::env::var("MESSY_LANG").ok().or_else(sys_locale::get_locale).unwrap_or_default();
	if locale.to_lowercase().starts_with("pl") { &PL } else { &EN }
}

pub fn fill(text: &str, value: impl std::fmt::Display) -> String {
	text.replacen("{}", &value.to_string(), 1)
}
