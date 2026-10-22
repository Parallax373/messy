// Wydanie nowej wersji: `npm run release` (poprawka, 1.0.0 → 1.0.1), `npm run release -- minor` (1.0.1 → 1.1.0)
// albo `npm run release -- major`. Podbija wersję (commit + tag), buduje instalator, publikuje go na GitHubie
// i dopisuje do wydania listę zmian z tytułów commitów.
// `npm run release -- current` wydaje wersję z package.json bez podbijania (pierwsze wydanie).
const {execSync} = require('node:child_process');
const fs = require('node:fs');
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

// Token z zalogowanego `gh`, żeby nie trzymać go w repo ani w zmiennych środowiskowych.
const token = output('gh auth token');

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

// Tag musi być na GitHubie przed publikacją; inaczej electron-builder sam go zakłada na bieżącym main.
run('git push --follow-tags');
run('npx tsc');
run('npx electron-builder --win --publish always', {GH_TOKEN: token});

const notes = [
	...(changes.length > 0 ? changes : ['- Minor fixes / Drobne poprawki']),
	'',
	`**Download / Pobierz:** \`Messy-Setup-${version}.exe\` below / poniżej.`,
].join('\n');
execSync(`gh release edit v${version} --notes-file -`, {input: notes, stdio: ['pipe', 'inherit', 'inherit']});
