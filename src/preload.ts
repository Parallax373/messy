import {contextBridge, ipcRenderer} from 'electron';

type Settings = {muted: boolean; oled: boolean};

// Most między stroną Messengera a głównym procesem; tylko to, czego potrzebują wstrzykiwane skrypty.
contextBridge.exposeInMainWorld('messy', {
	getSettings: async (): Promise<Settings> => ipcRenderer.invoke('get-settings'),
	setSetting: async (key: keyof Settings, value: boolean): Promise<void> => ipcRenderer.invoke('set-setting', key, value),
	setUnread(count: number): void {
		ipcRenderer.send('set-unread', count);
	},
	onSettingsChange(callback: (settings: Settings) => void): void {
		ipcRenderer.on('settings-changed', (_event, settings: Settings) => {
			callback(settings);
		});
	},
});
