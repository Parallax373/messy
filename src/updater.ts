import {execFile} from 'node:child_process';
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

// Repo jest prywatne, więc wydania pobieramy z tokenem. Bierzemy go w trakcie działania z GH_TOKEN
// albo z zalogowanego GitHub CLI, żeby żaden token nie trafił do instalatora.
async function githubToken(): Promise<string | undefined> {
	if (process.env.GH_TOKEN) {
		return process.env.GH_TOKEN;
	}

	return new Promise(resolve => {
		execFile('gh', ['auth', 'token'], {windowsHide: true}, (error, stdout) => {
			resolve(error ? undefined : stdout.trim() || undefined);
		});
	});
}

export async function checkForUpdates(): Promise<void> {
	if (status.state === 'checking' || status.state === 'downloading' || status.state === 'ready') {
		return;
	}

	setStatus({state: 'checking'});
	const token = await githubToken();
	if (!token) {
		setStatus({state: 'error', message: 'brak tokenu GitHub (zaloguj się: gh auth login)'});
		return;
	}

	autoUpdater.setFeedURL({provider: 'github', owner: 'Parallax373', repo: 'messy', private: true, token});
	try {
		await autoUpdater.checkForUpdates();
	} catch (error) {
		setStatus({state: 'error', message: error instanceof Error ? error.message.split('\n')[0] : String(error)});
	}
}

export function installUpdate(): void {
	autoUpdater.quitAndInstall(true, true);
}

export function setupUpdater(changed: () => void): void {
	onChange = changed;

	// W trybie deweloperskim (npm start) nie ma czego aktualizować.
	if (!app.isPackaged) {
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
