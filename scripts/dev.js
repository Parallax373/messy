// `npm start`: Messy z kodu źródłowego, zawsze z DevTools WebView2 na porcie 9223 (np. edge://inspect).
// Zainstalowany Messy ma ten sam identyfikator, a działać może tylko jedna kopia: gdyby był włączony,
// wersja deweloperska pokazałaby tylko jego okno i się zamknęła. Dlatego najpierw go zamykamy.
// Pliki page/ są wkompilowane w exe, więc obserwujemy je razem z src-tauri: zapis = przebudowa i restart.
const {spawnSync} = require('node:child_process');

spawnSync('taskkill', ['/F', '/IM', 'messy.exe'], {stdio: 'ignore'});

const env = {...process.env};
env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = '--remote-debugging-port=9223';
const args = ['tauri', 'dev', '--additional-watch-folders', '../page']; // względem src-tauri
process.exit(spawnSync('npx', args, {stdio: 'inherit', shell: true, env}).status ?? 1);
