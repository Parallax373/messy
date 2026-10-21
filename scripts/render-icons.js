// Renderuje assets/icon.svg i assets/icon-unread.svg do PNG w potrzebnych rozmiarach. Uruchamiać przez `npm run icons` (Electron).
const fs = require('node:fs');
const path = require('node:path');
const {app, BrowserWindow} = require('electron');

const SIZE = 256;
const assets = path.join(__dirname, '..', 'assets');
const sources = [
	['icon.svg', [['icon.png', 256], ['IconTray.png', 16], ['IconTray@2x.png', 32]]],
	['icon-unread.svg', [['IconTrayUnread.png', 16], ['IconTrayUnread@2x.png', 32]]],
];

app.whenReady().then(async () => {
	// Okno nie schodzi poniżej kilkudziesięciu pikseli, więc renderujemy raz duży obraz i zmniejszamy go.
	const win = new BrowserWindow({show: false, transparent: true, frame: false, webPreferences: {offscreen: true}});
	win.setContentSize(SIZE, SIZE);
	for (const [source, outputs] of sources) {
		const svg = fs.readFileSync(path.join(assets, source), 'utf8');
		const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${SIZE}" height="${SIZE}" `)}</body></html>`;
		await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
		// Po przeładowaniu zrzut bez odczekania łapie jeszcze nieodmalowaną, pustą klatkę.
		await new Promise(resolve => setTimeout(resolve, 300));
		const image = await win.webContents.capturePage({x: 0, y: 0, width: SIZE, height: SIZE});
		for (const [name, size] of outputs) {
			fs.writeFileSync(path.join(assets, name), image.resize({width: size, height: size, quality: 'best'}).toPNG());
		}
	}

	app.quit();
});
