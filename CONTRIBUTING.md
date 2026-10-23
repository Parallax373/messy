# Development

Messy is a [Tauri 2](https://tauri.app) app: a small Rust program around a WebView2 window that loads
facebook.com/messages.

## Run

Needs Node.js and Rust (`rustup`, MSVC toolchain).

```sh
npm install
npm start
```

`npm start` first closes an installed Messy (only one copy can run, and the installed one would take over),
then watches `src-tauri/` and `page/`: saving a file rebuilds and restarts the app. The dev build shows a
"DEV" badge in the panel corner and "[DEV]" in the tray tooltip.

`npm run debug` does the same with the WebView2 DevTools port 9223 (open `edge://inspect`), handy for inspecting
the live page. The tray menu also has a "Developer tools" item.

Preview the update button without publishing a release: `$env:MESSY_FAKE_UPDATE="9.9.9"; npm start`.
Force the English UI: `$env:MESSY_LANG="en"; npm start`.

## Layout

- `src-tauri/src/main.rs`: window, tray, settings, page permissions, the commands the page calls
- `src-tauri/src/i18n.rs`: Polish and English UI strings
- `src-tauri/src/updater.rs`: checking, downloading and installing updates from GitHub
- `src-tauri/capabilities/messenger.json`: which commands facebook.com may call
- `page/bridge.js`: `window.messy` in the page, on top of Tauri IPC
- `page/inject.js`: script running in the page, buttons in the Chats header, unread count, muting `Notification`
- `page/style.css`: CSS injected into the page (hidden top bar, scrollbars, OLED mode)
- `assets/icon.svg`, `assets/icon-unread.svg`: icon sources; `npm run icons` renders the PNGs and
  `src-tauri/icons`

The three `page/` files are compiled into the exe and injected before Facebook's own scripts on every page load.

Messy depends on how facebook.com/messages is built (CSS variables, `aria-controls="mw-inbox-settings-menu"`,
bold rows for unread chats). When Facebook changes the page, these are the places to look first.

## Build and release

- `npm run dist` builds `src-tauri/target/release/bundle/nsis/Messy_<version>_x64-setup.exe` without publishing.
- `npm run release` ships a patch (1.0.0 → 1.0.1), `npm run release -- minor` a feature (1.0.1 → 1.1.0),
  `npm run release -- major` a big change. The script bumps the version (commit + `v…` tag), pushes, builds,
  signs the update and publishes `Messy-Setup-<version>.exe` and `latest.json` to the
  [releases](https://github.com/Parallax373/messy/releases) of this repo with `gh`.
- Updates are signed with a minisign key kept outside the repo (`~/.tauri/messy.key`, or the
  `TAURI_SIGNING_PRIVATE_KEY` variable). The public key is in `src-tauri/tauri.conf.json`. Without the
  private key, installed copies reject new versions.
- Installed copies check for releases at start and every 4 hours, download them in the background, then show
  a green "Update" button in the Chats header and a restart item in the tray menu.

## winget

After a release, `npm run winget` writes manifests for the current version to `winget/manifests/…`
(git-ignored) with the installer URL and SHA256. Check them with `winget validate --manifest <dir>` and
submit them as a pull request to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs),
for example with `wingetcreate submit <dir>`.
