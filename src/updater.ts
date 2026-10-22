import {app, Notification} from 'electron';
import {autoUpdater} from 'electron-updater';

const CHECK_INTERVAL = 4 * 60 * 60 * 1000;

export type UpdateStatus =
	| {state: 'idle'}
	| {state: 'checking'}
	| {state: 'downloading'; version: string}
	| {state: 'ready'; version: string}
	| {state: 'error'; message: string};

let status: UpdateStatus = {state: 'idle'};
let onChange: () => void = () => {};

export function getUpdateStatus(): UpdateStatus {
	return status;
}

function setStatus(value: UpdateStatus): void {
	status = value;
	onChange();
}

export async function checkForUpdates(): Promise<void> {
	if (status.state === 'checking' || status.state === 'downloading' || status.state === 'ready') {
		return;
	}

	setStatus({state: 'checking'});
	// Wydania leżą w publicznym repo Parallax373/messy-releases (bez kodu), więc nie trzeba tokenu.
	// Adres bierze się z sekcji „publish” w package.json, którą electron-builder zapisuje do instalatora.
	try {
		await autoUpdater.checkForUpdates();
	} catch (error) {
		setStatus({state: 'error', message: error instanceof Error ? error.message.split('\n')[0] : String(error)});
	}
}

export function installUpdate(): void {
	if (!app.isPackaged) {
		return;
	}

	autoUpdater.quitAndInstall(true, true);
}

export function setupUpdater(changed: () => void): void {
	onChange = changed;

	// W trybie deweloperskim (npm start) nie ma czego aktualizować. MESSY_FAKE_UPDATE=1.2.3 udaje
	// pobraną aktualizację, żeby dało się obejrzeć znacznik w aplikacji bez wydawania wersji.
	if (!app.isPackaged) {
		if (process.env.MESSY_FAKE_UPDATE) {
			setStatus({state: 'ready', version: process.env.MESSY_FAKE_UPDATE});
		}

		return;
	}

	autoUpdater.autoDownload = true;
	autoUpdater.autoInstallOnAppQuit = true;
	autoUpdater.on('update-available', info => {
		setStatus({state: 'downloading', version: info.version});
	});
	autoUpdater.on('update-not-available', () => {
		setStatus({state: 'idle'});
	});
	autoUpdater.on('update-downloaded', info => {
		setStatus({state: 'ready', version: info.version});
		new Notification({title: 'Messy', body: `Wersja ${info.version} jest gotowa. Uruchom ponownie z menu ikony, żeby ją zainstalować.`}).show();
	});
	autoUpdater.on('error', error => {
		setStatus({state: 'error', message: error.message.split('\n')[0]});
	});

	void checkForUpdates();
	setInterval(() => {
		void checkForUpdates();
	}, CHECK_INTERVAL);
}
