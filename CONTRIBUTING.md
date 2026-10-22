# Development

## Run

```sh
npm install
npm start
```

`npm run debug` starts with the DevTools port 9223, handy for inspecting the live page.

In the VS Code terminal run `Remove-Item Env:ELECTRON_RUN_AS_NODE` first: VS Code sets this variable
and Electron then starts as plain Node.

Preview the update button without publishing a release: `$env:MESSY_FAKE_UPDATE="9.9.9"; npm start`.
Force the English UI: `npx electron . --lang=en-US`.

## Layout

- `src/main.ts`: window, tray, settings, CSS injected into the page
- `src/i18n.ts`: Polish and English UI strings
- `src/updater.ts`: checking, downloading and installing updates from GitHub
- `src/preload.ts`: bridge between the page and the main process (`window.messy`)
- `page/inject.js`: script running in the page, buttons in the Chats header, unread count, muting `Notification`
- `assets/icon.svg`, `assets/icon-unread.svg`: icon sources; `npm run icons` renders the PNGs

Messy depends on how facebook.com/messages is built (CSS variables, `aria-controls="mw-inbox-settings-menu"`,
bold rows for unread chats). When Facebook changes the page, these are the places to look first.

## Build and release

- `npm run dist` builds `release/Messy-Setup-<version>.exe` without publishing.
- `npm run release` ships a patch (1.0.0 → 1.0.1), `npm run release -- minor` a feature (1.0.1 → 1.1.0),
  `npm run release -- major` a big change. The script bumps the version (commit + `v…` tag), pushes, builds
  and publishes the installer to [Parallax373/messy-releases](https://github.com/Parallax373/messy-releases).
  The upload token comes from `gh auth token`.
- Installed copies check for releases at start and every 4 hours, download them in the background, then show
  a green "Update" button in the Chats header and a restart item in the tray menu.

If the first build fails with "Cannot create symbolic link" in winCodeSign, extract the archive by hand:
`7za x <cache>\winCodeSign\<number>.7z -o<cache>\winCodeSign\winCodeSign-2.6.0`
(`<cache>` = `%LOCALAPPDATA%\electron-builder\Cache`). Errors about two `.dylib` files can be ignored.

## Microsoft Store

`npm run dist:store` builds `release/Messy-<version>.appx`. Before the first upload, replace the placeholder
`identityName` and `publisher` in the `appx` section of `package.json` with the values Partner Center shows
under *Product identity*. The Store build skips the built-in updater (the Store updates it) and its autostart
is managed by Windows (Settings → Apps → Startup).

## winget

After a release, `npm run winget` writes manifests for the current version to `winget/manifests/…`
(git-ignored) with the installer URL and SHA256. Check them with `winget validate --manifest <dir>` and
submit them as a pull request to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs),
for example with `wingetcreate submit <dir>`.
