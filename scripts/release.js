// Wydanie nowej wersji: `npm run release` (poprawka, 1.0.0 → 1.0.1), `npm run release -- minor` (1.0.1 → 1.1.0)
// albo `npm run release -- major`. Podbija wersję (commit + tag), buduje instalator i publikuje go na GitHubie.
// `npm run release -- current` wydaje wersję z package.json bez podbijania (pierwsze wydanie).
const {execSync} = require('node:child_process');
const {version} = require('../package.json');

const bump = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major', 'current'].includes(bump)) {
	console.error(`Nieznany typ wydania: ${bump}. Dozwolone: patch, minor, major, current.`);
	process.exit(1);
}

const run = (command, env) => execSync(command, {stdio: 'inherit', env: {...process.env, ...env}});

if (execSync('git status --porcelain').toString().trim()) {
	console.error('Są niezacommitowane zmiany. Zacommituj je przed wydaniem.');
	process.exit(1);
}

// Token z zalogowanego `gh`, żeby nie trzymać go w repo ani w zmiennych środowiskowych.
const token = execSync('gh auth token').toString().trim();

if (bump === 'current') {
	run(`git tag -a v${version} -m ${version}`);
} else {
	run(`npm version ${bump} -m "%s"`);
}

// Tag musi być na GitHubie przed publikacją; inaczej electron-builder sam go zakłada na bieżącym main.
run('git push --follow-tags');
run('npx tsc');
run('npx electron-builder --win --publish always', {GH_TOKEN: token});
