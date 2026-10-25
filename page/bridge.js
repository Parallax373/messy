// Most między stroną Messengera a Messy (src-tauri/src/main.rs); tylko to, czego potrzebuje page/inject.js.
// Messy wstrzykuje ten plik razem z inject.js do każdej strony, zanim wykonają się skrypty Facebooka.
(() => {
	if (window.messy) {
		return;
	}

	const invoke = (command, args) => window.__TAURI_INTERNALS__.invoke(command, args);
	const listeners = {'settings-changed': [], 'update-ready': []};

	// Messy wywołuje to przez eval, gdy zmieni się ustawienie albo stan aktualizacji.
	window.__messyEmit = (name, value) => {
		for (const callback of listeners[name] ?? []) {
			callback(value);
		}
	};

	window.messy = {
		getSettings: () => invoke('get_settings'),
		setSetting: (key, value) => invoke('set_setting', {key, value}),
		// Teksty przycisków w języku Windowsa (src-tauri/src/i18n.rs).
		getStrings: () => invoke('get_strings'),
		// Wersja gotowej do instalacji aktualizacji albo null, gdy jej nie ma.
		getUpdateReady: () => invoke('get_update_ready'),
		onUpdateReady: callback => listeners['update-ready'].push(callback),
		installUpdate: () => void invoke('install_update'),
		setUnread: count => void invoke('set_unread', {count}),
		setFullscreen: on => void invoke('set_fullscreen', {on}),
		// phase: 'start' | 'move' | 'end'; dx, dy: przesunięcie kursora od początku w pikselach fizycznych.
		dragWindow: (phase, dx = 0, dy = 0) => void invoke('drag_window', {phase, dx, dy}),
		hideWindow: () => void invoke('hide_window'),
		onSettingsChange: callback => listeners['settings-changed'].push(callback),
	};
})();
