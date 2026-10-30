// Most między stroną Messengera a Messy (src-tauri/src/main.rs); tylko to, czego potrzebuje page/inject.js.
// Messy wstrzykuje ten plik razem z inject.js do każdej strony, zanim wykonają się skrypty Facebooka.
(() => {
	if (window.messy) {
		return;
	}

	const invoke = (command, args) => window.__TAURI_INTERNALS__.invoke(command, args);
	const listeners = {'settings-changed': [], 'update-ready': [], 'back-to-list': [], 'edge-state': [], 'upload-progress': []};

	// Messy wywołuje to przez eval, gdy zmieni się ustawienie albo stan aktualizacji.
	window.__messyEmit = (name, value) => {
		for (const callback of listeners[name] ?? []) {
			callback(value);
		}
	};

	window.messy = {
		getSettings: () => invoke('get_settings'),
		setSetting: (key, value) => invoke('set_setting', {key, value}),
		// mode: 'panel' | 'free' | 'window' | 'edge' (src-tauri/src/main.rs, set_mode).
		setMode: mode => invoke('set_mode', {mode}),
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
		// Pole tekstowe ma fokus (okno przy krawędzi wtedy się nie chowa).
		setTyping: on => void invoke('set_typing', {on}),
		// {edge: 'left'|'right'|'top'|'bottom'|null, expanded: boolean}; edge null poza trybem krawędzi.
		onEdgeState: callback => listeners['edge-state'].push(callback),
		onSettingsChange: callback => listeners['settings-changed'].push(callback),
		// Okno było długo schowane w rozmowie (src-tauri/src/main.rs, show_window).
		onBackToList: callback => listeners['back-to-list'].push(callback),
		// Plik ponad limit Messengera idzie do Gofile (src-tauri/src/upload.rs); zwraca link do pobrania.
		// Plik idzie do Messy kawałkami po 2 MB w base64, potem jedno polecenie go wysyła.
		uploadFile: async file => {
			const CHUNK = 2 * 1024 * 1024;
			for (let offset = 0; offset < file.size; offset += CHUNK) {
				const data = await new Promise((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',') + 1));
					reader.onerror = () => reject(reader.error);
					reader.readAsDataURL(file.slice(offset, offset + CHUNK));
				});
				await invoke('upload_chunk', {data, first: offset === 0});
			}
			return invoke('upload_file', {name: file.name});
		},
		// Postęp wysyłania w procentach.
		onUploadProgress: callback => listeners['upload-progress'].push(callback),
	};
})();
