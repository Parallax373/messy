import {app} from 'electron';

// Teksty interfejsu: polski dla polskiego Windowsa, w każdym innym przypadku angielski.
const strings = {
	pl: {
		tooltip: 'Messy',
		tooltipUnread: (count: number) => `Messy: ${count} nieprzeczytane`,
		tooltipUpdate: (version: string) => `Messy: dostępna aktualizacja ${version}`,
		checking: 'Sprawdzanie aktualizacji…',
		downloading: (version: string) => `Pobieranie wersji ${version}…`,
		restartToUpdate: (version: string) => `Uruchom ponownie i zaktualizuj do ${version}`,
		checkUpdates: 'Sprawdź aktualizacje',
		checkUpdatesError: (message: string) => `Sprawdź aktualizacje (błąd: ${message})`,
		updateReadyNotification: (version: string) => `Wersja ${version} jest gotowa. Kliknij zielony przycisk w nagłówku albo uruchom ponownie z menu ikony.`,
		show: 'Pokaż',
		mute: 'Wycisz powiadomienia',
		oled: 'Tryb OLED (czarny)',
		autostart: 'Uruchamiaj z Windowsem',
		devTools: 'Narzędzia deweloperskie',
		quit: 'Zakończ',
		// Teksty przycisków wstrzykiwanych do strony (page/inject.js).
		page: {
			oledOn: 'Wyłącz tryb OLED',
			oledOff: 'Włącz tryb OLED',
			muteOn: 'Włącz powiadomienia',
			muteOff: 'Wycisz powiadomienia',
			update: 'Zaktualizuj do {version}',
			updateHint: 'Zaktualizuj do {version} (uruchomi ponownie Messy)',
		},
	},
	en: {
		tooltip: 'Messy',
		tooltipUnread: (count: number) => `Messy: ${count} unread`,
		tooltipUpdate: (version: string) => `Messy: update ${version} available`,
		checking: 'Checking for updates…',
		downloading: (version: string) => `Downloading version ${version}…`,
		restartToUpdate: (version: string) => `Restart and update to ${version}`,
		checkUpdates: 'Check for updates',
		checkUpdatesError: (message: string) => `Check for updates (error: ${message})`,
		updateReadyNotification: (version: string) => `Version ${version} is ready. Click the green button in the header or restart from the tray menu.`,
		show: 'Show',
		mute: 'Mute notifications',
		oled: 'OLED mode (black)',
		autostart: 'Start with Windows',
		devTools: 'Developer tools',
		quit: 'Quit',
		page: {
			oledOn: 'Turn off OLED mode',
			oledOff: 'Turn on OLED mode',
			muteOn: 'Unmute notifications',
			muteOff: 'Mute notifications',
			update: 'Update to {version}',
			updateHint: 'Update to {version} (restarts Messy)',
		},
	},
};

export type Strings = typeof strings.pl;

// Wywoływać dopiero po app.whenReady(), wcześniej getLocale() może być puste.
export function t(): Strings {
	return app.getLocale().toLowerCase().startsWith('pl') ? strings.pl : strings.en;
}
