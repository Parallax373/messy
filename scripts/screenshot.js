// Zrzut strony HTML do PNG przez Edge bez okna (jest w każdym Windowsie), dla render-icons.js i render-preview.js.
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const url = require('node:url');

const edge = [
	path.join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
	path.join(process.env.ProgramFiles ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
].find(file => fs.existsSync(file));

module.exports = function screenshot(html, output, width, height) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'messy-'));
	const page = path.join(dir, 'page.html');
	fs.writeFileSync(page, html);
	execFileSync(edge, [
		'--headless',
		'--disable-gpu',
		'--hide-scrollbars',
		'--default-background-color=00000000',
		`--user-data-dir=${path.join(dir, 'profile')}`,
		`--window-size=${width},${height}`,
		`--screenshot=${output}`,
		url.pathToFileURL(page).href,
	], {stdio: 'ignore'});
	// Edge chwilę po zamknięciu trzyma jeszcze pliki profilu.
	try {
		fs.rmSync(dir, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
	} catch {}
};
