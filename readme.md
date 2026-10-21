# Messy

Messenger (facebook.com/messages) w zasobniku systemowym Windows. Kliknięcie ikony otwiera panel nad zasobnikiem.
Kliknięcie poza panelem go chowa.

- przy nieprzeczytanych wiadomościach dymek w ikonie robi się czerwony
- ikona przypięta na pasku zadań (jak Steam), a nie w schowanym menu
- bez górnego paska Facebooka, czat wypełnia całe okno
- zmiana rozmiaru panelu, zapamiętywana
- cienkie paski przewijania
- w nagłówku „Czaty”: tryb OLED (czysta czerń) i wyciszenie powiadomień, oba też w menu ikony

## Uruchomienie

```sh
npm install
npm start
```

`npm run debug` uruchamia z portem DevTools 9223, do podglądania strony na żywo.

W terminalu VS Code najpierw `Remove-Item Env:ELECTRON_RUN_AS_NODE`, bo VS Code ustawia tę zmienną
i Electron startuje wtedy jako zwykły Node.

## Build i wydania

- `npm run dist` buduje instalator `release/Messy-Setup-<wersja>.exe` bez publikowania.
- `npm run release` wydaje poprawkę (1.0.0 → 1.0.1), `npm run release -- minor` nową funkcję (1.0.1 → 1.1.0),
  `npm run release -- major` dużą zmianę. Skrypt podbija wersję (commit + tag `v…`), buduje i publikuje wydanie
  na GitHubie (Parallax373/messy). Token bierze z `gh auth token`.
- Zainstalowany Messy sprawdza wydania przy starcie i co 4 godziny, pobiera je w tle i proponuje restart
  w menu ikony. Repo jest prywatne, więc do aktualizacji potrzebny jest zalogowany GitHub CLI (`gh auth login`)
  albo zmienna `GH_TOKEN`.

Gdy pierwszy build zgłasza „Cannot create symbolic link” przy winCodeSign, rozpakuj archiwum ręcznie:
`7za x <cache>\winCodeSign\<numer>.7z -o<cache>\winCodeSign\winCodeSign-2.6.0`
(`<cache>` = `%LOCALAPPDATA%\electron-builder\Cache`). Błędy o dwóch plikach `.dylib` można zignorować.

## Struktura

- `src/main.ts`: okno, zasobnik, ustawienia, CSS wstrzykiwany do strony
- `src/updater.ts`: sprawdzanie, pobieranie i instalacja aktualizacji z GitHuba
- `src/preload.ts`: most między stroną a głównym procesem (`window.messy`)
- `page/inject.js`: skrypt w stronie, przyciski w nagłówku „Czaty” i wyciszanie `Notification`

