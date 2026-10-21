import {execFile} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
	app,
	BrowserWindow,
	ipcMain,
	Menu,
	nativeImage,
	screen,
	session,
	shell,
	Tray,
} from 'electron';
import {
	checkForUpdates,
	getUpdateStatus,
	installUpdate,
	setupUpdater,
} from './updater';

const MESSENGER_URL = 'https://www.facebook.com/messages/';
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MARGIN = 8;

// Rozmiar panelu zapamiętany między uruchomieniami.
const sizeFile = path.join(app.getPath('userData'), 'window-size.json');

function loadSize(): {width: number; height: number} {
	try {
		const {width, height} = JSON.parse(fs.readFileSync(sizeFile, 'utf8'));
		if (Number.isInteger(width) && Number.isInteger(height)) {
			return {width, height};
		}
	} catch {}

	return {width: 420, height: 640};
}

function saveSize(): void {
	if (!win) {
		return;
	}

	const [width, height] = win.getSize();
	fs.writeFileSync(sizeFile, JSON.stringify({width, height}));
}

// Przełączniki zapamiętane między uruchomieniami; strona dostaje je przez preload.
type Settings = {muted: boolean; oled: boolean};
const settingsFile = path.join(app.getPath('userData'), 'settings.json');
const settings: Settings = {muted: false, oled: false};
try {
	const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
	settings.muted = saved.muted === true;
	settings.oled = saved.oled === true;
} catch {}

function setSetting(key: keyof Settings, value: boolean): void {
	settings[key] = value;
	fs.writeFileSync(settingsFile, JSON.stringify(settings));
	win?.webContents.send('settings-changed', settings);
	buildTrayMenu();
}

ipcMain.handle('get-settings', () => settings);
ipcMain.handle('set-setting', (_event, key: keyof Settings, value: boolean) => {
	if (key in settings) {
		setSetting(key, value === true);
	}
});

function updateMenuItem(): Electron.MenuItemConstructorOptions {
	const status = getUpdateStatus();
	switch (status.state) {
		case 'checking': {
			return {label: 'Sprawdzanie aktualizacji…', enabled: false};
		}

		case 'downloading': {
			return {label: `Pobieranie wersji ${status.version}…`, enabled: false};
		}

		case 'ready': {
			return {label: `Uruchom ponownie i zaktualizuj do ${status.version}`, click: installUpdate};
		}

		case 'error': {
			return {label: `Sprawdź aktualizacje (błąd: ${status.message})`, click: checkForUpdates, enabled: app.isPackaged};
		}

		default: {
			return {label: 'Sprawdź aktualizacje', click: checkForUpdates, enabled: app.isPackaged};
		}
	}
}

function buildTrayMenu(): void {
	tray?.setContextMenu(Menu.buildFromTemplate([
		{label: `Messy ${app.getVersion()}`, enabled: false},
		updateMenuItem(),
		{type: 'separator'},
		{label: 'Pokaż', click: showWindow},
		{label: 'Wycisz powiadomienia', type: 'checkbox', checked: settings.muted, click: item => setSetting('muted', item.checked)},
		{label: 'Tryb OLED (czarny)', type: 'checkbox', checked: settings.oled, click: item => setSetting('oled', item.checked)},
		{label: 'Narzędzia deweloperskie', click: () => win?.webContents.openDevTools({mode: 'detach'})},
		{type: 'separator'},
		{label: 'Zakończ', click: () => app.quit()},
	]));
}

// Windows 11 trzyma widoczność ikon zasobnika w HKCU\Control Panel\NotifyIconSettings;
// IsPromoted = 1 trzyma ikonę na pasku zadań zamiast w schowanym menu (jak Steam).
function promoteTrayIcon(): void {
	if (process.platform !== 'win32') {
		return;
	}

	const script = `
		Get-ChildItem 'HKCU:\\Control Panel\\NotifyIconSettings' | ForEach-Object {
			if ((Get-ItemProperty $_.PSPath).ExecutablePath -eq $env:TRAY_EXE) {
				Set-ItemProperty $_.PSPath -Name IsPromoted -Value 1 -Type DWord
			}
		}`;
	execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
		env: {...process.env, TRAY_EXE: process.execPath},
	}, () => {});
}

const assets = path.join(__dirname, '..', 'assets');
const pageScripts = path.join(__dirname, '..', 'page');

// Przy nieprzeczytanych dymek w ikonie robi się czerwony (assets/icon-unread.svg).
const icons = {
	normal: nativeImage.createFromPath(path.join(assets, 'IconTray.png')),
	unread: nativeImage.createFromPath(path.join(assets, 'IconTrayUnread.png')),
};

let tray: Tray | undefined;
let win: BrowserWindow | undefined;
// Okno chowa się po utracie fokusu; klik w ikonę zasobnika zabiera fokus,
// więc bez tego znacznika ten sam klik od razu otwierałby je ponownie.
let hiddenByBlurAt = 0;

if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	showWindow();
});

// Ścieżki facebook.com potrzebne do czatu i logowania; resztę otwieramy w przeglądarce.
function isAllowedInApp(url: string): boolean {
	const {hostname, pathname} = new URL(url);
	if (hostname !== 'www.facebook.com' && hostname !== 'facebook.com') {
		return false;
	}

	const allowedPaths = ['/messages', '/login', '/checkpoint', '/two_step_verification', '/recover', '/auth_platform', '/privacy/consent'];
	return pathname === '/' || allowedPaths.some(prefix => pathname.startsWith(prefix));
}

// Panel nad zasobnikiem: przy prawej krawędzi obszaru roboczego, tuż nad paskiem zadań.
function positionWindow(): void {
	if (!win || !tray) {
		return;
	}

	const trayBounds = tray.getBounds();
	const {workArea} = screen.getDisplayNearestPoint({x: trayBounds.x, y: trayBounds.y});
	const [savedWidth, savedHeight] = win.getSize();
	const width = Math.min(savedWidth, workArea.width - (2 * MARGIN));
	const height = Math.min(savedHeight, workArea.height - (2 * MARGIN));
	const x = Math.min(
		Math.max(Math.round(trayBounds.x + (trayBounds.width / 2) - (width / 2)), workArea.x + MARGIN),
		workArea.x + workArea.width - width - MARGIN,
	);
	const y = workArea.y + workArea.height - height - MARGIN;
	win.setBounds({x, y, width, height});
}

function showWindow(): void {
	if (!win) {
		return;
	}

	positionWindow();
	win.show();
	win.focus();
}

function toggleWindow(): void {
	if (!win) {
		return;
	}

	if (win.isVisible()) {
		win.hide();
	} else if (Date.now() - hiddenByBlurAt > 300) {
		showWindow();
	}
}

function setUnread(count: number): void {
	tray?.setImage(count > 0 ? icons.unread : icons.normal);
	tray?.setToolTip(count > 0 ? `Messy: ${count} nieprzeczytane` : 'Messy');
}

function createWindow(): BrowserWindow {
	const window = new BrowserWindow({
		...loadSize(),
		minWidth: MIN_WIDTH,
		minHeight: MIN_HEIGHT,
		show: false,
		frame: false,
		resizable: true,
		skipTaskbar: true,
		alwaysOnTop: true,
		icon: path.join(assets, 'icon.png'),
		webPreferences: {
			partition: 'persist:messenger',
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			sandbox: true,
		},
	});

	window.on('resized', saveSize);

	window.on('blur', () => {
		if (!window.webContents.isDevToolsOpened()) {
			hiddenByBlurAt = Date.now();
			window.hide();
		}
	});

	// Liczbę nieprzeczytanych wiadomości liczy page/inject.js i przysyła przez preload.
	ipcMain.on('set-unread', (_event, count: number) => {
		setUnread(Number.isInteger(count) && count > 0 ? count : 0);
	});

	const {webContents} = window;
	webContents.setWindowOpenHandler(({url}) => {
		if (!isAllowedInApp(url)) {
			void shell.openExternal(url);
		}

		return {action: 'deny'};
	});

	webContents.on('will-navigate', (event, url) => {
		if (!isAllowedInApp(url)) {
			event.preventDefault();
			void shell.openExternal(url);
		}
	});

	// Górny pasek Facebooka (logo, wyszukiwarka, zakładki, powiadomienia) jest zbędny w samym czacie.
	// Facebook ustawia --header-height i --messenger-card-spacing także na elementach wewnątrz strony,
	// więc nadpisujemy je na każdym elemencie, żeby czat wypełniał okno bez odstępów.
	webContents.on('dom-ready', () => {
		void webContents.insertCSS(`
			div[role="banner"] { display: none !important; }
			* { --header-height: 0px !important; --messenger-card-spacing: 0px !important; }
			html { overflow: hidden !important; }

			/* Cienkie, zaokrąglone paski przewijania bez strzałek, widoczne mocniej po najechaniu. */
			::-webkit-scrollbar { width: 8px; height: 8px; background: transparent; }
			::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent; }
			::-webkit-scrollbar-button { display: none; }
			::-webkit-scrollbar-thumb {
				background: rgba(255, 255, 255, 0.18);
				border: 2px solid transparent;
				border-radius: 8px;
				background-clip: padding-box;
			}
			::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.35); }
			html:not(.__fb-dark-mode) ::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.2); }
			html:not(.__fb-dark-mode) ::-webkit-scrollbar-thumb:hover { background-color: rgba(0, 0, 0, 0.4); }

			/* Tryb OLED: czysta czerń zamiast szarości ciemnego motywu Facebooka. Elementy wyniesione
			   (okienka, pola tekstowe, cudze dymki) dostają bardzo ciemną szarość, żeby nie zlewały się z tłem. */
			html.messy-oled.__fb-dark-mode, html.messy-oled.__fb-dark-mode * {
				--web-wash: #000 !important;
				--wash: #000 !important;
				--surface-background: #000 !important;
				--card-background: #000 !important;
				--nav-bar-background: #000 !important;
				--messenger-card-background: #000 !important;
				--messenger-reply-background: #000 !important;
				--mwp-header-background-color: #000 !important;
				--mwp-message-row-background: #000 !important;
				--card-background-flat: #121212 !important;
				--comment-background: #121212 !important;
				--input-background: #121212 !important;
				--input-background-hover: #1a1a1a !important;
				--input-background-disabled: #0a0a0a !important;
				--toast-background: #121212 !important;
				--popover-background: #1a1a1a !important;
				--popover-card-background: #1a1a1a !important;
				--chat-incoming-message-bubble-background-color: #1c1c1c !important;
			}
			html.messy-oled.__fb-dark-mode, html.messy-oled.__fb-dark-mode body { background: #000 !important; }
		`);
		void webContents.executeJavaScript(fs.readFileSync(path.join(pageScripts, 'inject.js'), 'utf8'));
	});

	void window.loadURL(MESSENGER_URL);
	return window;
}

app.whenReady().then(() => {
	app.setAppUserModelId('pl.messy.app');
	Menu.setApplicationMenu(null);

	const messengerSession = session.fromPartition('persist:messenger');
	messengerSession.setPermissionRequestHandler((_webContents, permission, callback) => {
		callback(permission === 'media' || (permission === 'notifications' && !settings.muted));
	});
	messengerSession.setPermissionCheckHandler((_webContents, permission) => permission !== 'notifications' || !settings.muted);

	win = createWindow();

	tray = new Tray(icons.normal);
	tray.setToolTip('Messy');
	tray.on('click', toggleWindow);
	buildTrayMenu();
	setupUpdater(buildTrayMenu);

	// Wpis w rejestrze powstaje dopiero, gdy Windows zobaczy ikonę, więc przy pierwszym uruchomieniu ponawiamy.
	promoteTrayIcon();
	setTimeout(promoteTrayIcon, 5000);
});

// Aplikacja żyje w zasobniku, więc zamknięcie okna jej nie kończy.
app.on('window-all-closed', () => {});
