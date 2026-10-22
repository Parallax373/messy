// Wydanie nowej wersji: `npm run release` (poprawka, 1.0.0 → 1.0.1), `npm run release -- minor` (1.0.1 → 1.1.0)
// albo `npm run release -- major`. Podbija wersję (commit + tag), buduje instalator, publikuje go na GitHubie
// z listą zmian z tytułów commitów.
// `npm run release -- current` wydaje wersję z package.json bez podbijania (pierwsze wydanie).
const {execSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const packageFile = path.join(__dirname, '..', 'package.json');
const readVersion = () => JSON.parse(fs.readFileSync(packageFile, 'utf8')).version;

const bump = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major', 'current'].includes(bump)) {
	console.error(`Nieznany typ wydania: ${bump}. Dozwolone: patch, minor, major, current.`);
	process.exit(1);
}

const run = (command, env) => execSync(command, {stdio: 'inherit', env: {...process.env, ...env}});
const output = command => execSync(command).toString().trim();

if (output('git status --porcelain')) {
	console.error('Są niezacommitowane zmiany. Zacommituj je przed wydaniem.');
	process.exit(1);
}

// Klucz prywatny do podpisywania aktualizacji (minisign), poza repo. Bez niego zainstalowane kopie
// odrzucą aktualizację; klucz publiczny jest w src-tauri/tauri.conf.json.
const signingKey = process.env.TAURI_SIGNING_PRIVATE_KEY ?? path.join(os.homedir(), '.tauri', 'messy.key');
if (!process.env.TAURI_SIGNING_PRIVATE_KEY && !fs.existsSync(signingKey)) {
	console.error(`Brak klucza do podpisywania aktualizacji: ${signingKey}.`);
	process.exit(1);
}

// Lista zmian: tytuły commitów od poprzedniego tagu, bez commitów samego podbicia wersji.
const previousTag = output('git describe --tags --abbrev=0');
const changes = output(`git log ${previousTag}..HEAD --format=%s`)
	.split('\n')
	.filter(line => line && !/^\d+\.\d+\.\d+$/.test(line))
	.map(line => `- ${line}`);

if (bump === 'current') {
	run(`git tag -a v${readVersion()} -m ${readVersion()}`);
} else {
	run(`npm version ${bump} -m "%s"`);
}

const version = readVersion();

run('git push --follow-tags');
run('npx tauri build', {TAURI_SIGNING_PRIVATE_KEY: fs.existsSync(signingKey) ? fs.readFileSync(signingKey, 'utf8') : signingKey});

// Instalator pod stałą nazwą (linki na stronie i w winget) oraz latest.json, który czyta updater w aplikacji.
const bundle = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const built = path.join(bundle, `Messy_${version}_x64-setup.exe`);
const release = path.join(__dirname, '..', 'release');
const installer = path.join(release, `Messy-Setup-${version}.exe`);
fs.mkdirSync(release, {recursive: true});
fs.copyFileSync(built, installer);
const latest = path.join(release, 'latest.json');
fs.writeFileSync(latest, JSON.stringify({
	version,
	pub_date: new Date().toISOString(),
	platforms: {
		'windows-x86_64': {
			signature: fs.readFileSync(`${built}.sig`, 'utf8'),
			url: `https://github.com/Parallax373/messy/releases/download/v${version}/Messy-Setup-${version}.exe`,
		},
	},
}, null, '\t'));

const notes = [
	...(changes.length > 0 ? changes : ['- Minor fixes / Drobne poprawki']),
	'',
	`**Download / Pobierz:** \`Messy-Setup-${version}.exe\` below / poniżej.`,
].join('\n');
execSync(`gh release create v${version} --verify-tag --title ${version} --notes-file - "${installer}" "${latest}"`, {input: notes, stdio: ['pipe', 'inherit', 'inherit']});
