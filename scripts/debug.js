// `npm run debug`: Messy z DevTools WebView2 na porcie 9223 (np. chrome://inspect albo edge://inspect).
const {spawnSync} = require('node:child_process');

const env = {...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9223'};
process.exit(spawnSync('npx', ['tauri', 'dev'], {stdio: 'inherit', shell: true, env}).status ?? 1);
