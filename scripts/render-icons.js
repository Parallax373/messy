// Renderuje assets/icon.svg i assets/icon-unread.svg do PNG w potrzebnych rozmiarach (`npm run icons`),
// potem ikony instalatora w src-tauri/icons przez `tauri icon`.
const {execSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const screenshot = require('./screenshot');

const assets = path.join(__dirname, '..', 'assets');
const sources = [
	['icon.svg', [['icon.png', 256], ['IconTray.png', 16], ['IconTray@2x.png', 32]]],
	['icon-unread.svg', [['IconTrayUnread.png', 16], ['IconTrayUnread@2x.png', 32]]],
];

for (const [source, outputs] of sources) {
	const svg = fs.readFileSync(path.join(assets, source), 'utf8');
	for (const [name, size] of outputs) {
		const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`;
		screenshot(html, path.join(assets, name), size, size);
	}
}

execSync('npx tauri icon assets/icon.png -o src-tauri/icons', {stdio: 'inherit', cwd: path.join(__dirname, '..')});
// tauri icon robi też ikony na Androida, iOS i macOS; Messy jest tylko na Windows.
const icons = path.join(__dirname, '..', 'src-tauri', 'icons');
for (const name of fs.readdirSync(icons)) {
	if (!/^(\d+x\d+(@2x)?\.png|icon\.(ico|png))$/.test(name)) {
		fs.rmSync(path.join(icons, name), {recursive: true, force: true});
	}
}
