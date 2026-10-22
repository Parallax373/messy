# Messy: instrukcja dla kolejnych sesji

Messy to aplikacja Electron: facebook.com/messages w panelu nad zasobnikiem Windows. Repo publiczne:
https://github.com/Parallax373/messy (MIT). Użytkownik pisze po polsku; odpowiadaj po polsku.

Opis kodu i struktury: `CONTRIBUTING.md`. Ten plik opisuje **wdrażanie aktualizacji** i pułapki.

## Jak działa aktualizacja u użytkowników

1. Zainstalowany Messy (`%LOCALAPPDATA%\Programs\messy`) przy starcie i co 4 godziny pyta GitHuba o
   `https://github.com/Parallax373/messy/releases/latest/download/latest.yml` (`src/updater.ts`, electron-updater).
   Adres pochodzi z sekcji `build.publish` w `package.json` i jest zaszywany w instalatorze
   (`resources/app-update.yml`). Bez tokenu, repo jest publiczne.
2. Gdy `latest.yml` ma wyższą wersję, instalator pobiera się w tle do `%LOCALAPPDATA%\messy-updater\pending`.
3. Po pobraniu: zielony przycisk „Zaktualizuj do X” w nagłówku „Czaty” (`page/inject.js`), pozycja w menu ikony,
   dymek Windows i tooltip ikony. Klik = `quitAndInstall`. Bez kliku instaluje się przy zamknięciu Messy.
4. Wersja z Microsoft Store (`process.windowsStore`) nie używa tego mechanizmu, aktualizuje ją Sklep.

**Zmiana `build.publish` (owner/repo) psuje aktualizacje u wszystkich zainstalowanych kopii**, bo mają stary adres
zaszyty na stałe. Tak już było dwa razy (prywatne repo → `messy-releases` → `messy`); ludzie musieli raz
przeinstalować ręcznie. Nie zmieniaj tego bez wyraźnej potrzeby i bez uprzedzenia użytkownika.

## Wydanie nowej wersji (krok po kroku)

1. Zmiany zacommitowane i wypchnięte na `main` (skrypt odmawia przy brudnym drzewie).
2. Zamknij uruchomiony Messy/Electron, bo trzyma pliki w `release/`:
   `Get-Process Messy, electron -ErrorAction SilentlyContinue | Stop-Process -Force`
3. W PowerShellu z VS Code najpierw `Remove-Item Env:ELECTRON_RUN_AS_NODE` (patrz pułapki).
4. Uruchom jedno z:
   - `npm run release`: poprawka, 1.1.1 → 1.1.2
   - `npm run release -- minor`: nowa funkcja, 1.1.1 → 1.2.0
   - `npm run release -- major`: duża zmiana, 1.x → 2.0.0
5. `scripts/release.js` robi po kolei:
   - zbiera tytuły commitów od ostatniego tagu (bez commitów typu `1.2.3`) do listy zmian,
   - `npm version …` (commit „X.Y.Z” + tag `vX.Y.Z`, annotowany),
   - `git push --follow-tags` (**przed** buildem, inaczej electron-builder sam zakłada tag na złym commicie),
   - `tsc` + `electron-builder --win --publish always` z `GH_TOKEN` z `gh auth token`
     (wrzuca `Messy-Setup-X.Y.Z.exe`, `.blockmap` i `latest.yml` do wydania `vX.Y.Z`),
   - `gh release edit` z listą zmian jako opisem.
6. Sprawdź:
   ```sh
   gh release list --repo Parallax373/messy --limit 2
   curl -s -o /dev/null -w "%{http_code}\n" -L https://github.com/Parallax373/messy/releases/latest/download/latest.yml
   ```
7. Opcjonalnie popraw opis wydania na bardziej ludzki (EN + PL), jak w `v1.1.1`:
   `gh release edit vX.Y.Z --repo Parallax373/messy --notes-file -`.
8. winget (gdy pakiet jest już w winget-pkgs): `npm run winget`, `winget validate --manifest winget/manifests/p/Parallax373/Messy/X.Y.Z`,
   potem PR z nową wersją do microsoft/winget-pkgs (fork Parallax373/winget-pkgs, pliki przez `gh api` jak w PR #458726).

Test aktualizacji end-to-end: zainstaluj starszy instalator po cichu (`Messy-Setup-<stara>.exe /S`), wydaj nową
wersję, uruchom zainstalowanego Messy i po ~45 s sprawdź `%LOCALAPPDATA%\messy-updater\pending`.
Zielony przycisk bez wydawania: `$env:MESSY_FAKE_UPDATE="9.9.9"; npm start`.

## Pułapki

- **`ELECTRON_RUN_AS_NODE=1`** w terminalach VS Code: Electron (także zbudowany `Messy.exe`) startuje wtedy jako
  Node i od razu się kończy albo rzuca „Not running in an Electron environment”. Zawsze usuwaj zmienną przed
  `npm start`, `npm run …` z Electronem i uruchamianiem exe.
- **winCodeSign „Cannot create symbolic link”** przy pierwszym buildzie na nowej maszynie: rozpakuj ręcznie
  `7za x <cache>\winCodeSign\<numer>.7z -o<cache>\winCodeSign\winCodeSign-2.6.0`
  (`<cache>` = `%LOCALAPPDATA%\electron-builder\Cache`, `7za` z `node_modules\7zip-bin\win\x64`), błędy o `.dylib` ignoruj.
- **electron-builder 25.1.8** nie zna `electronFuses`; nie dodawaj tej opcji.
- **E-mail:** commity i tagi idą jako `Parallax373 <98035652+Parallax373@users.noreply.github.com>` (ustawione w
  `git config` tego repo). Nigdy nie commituj z prywatnym adresem użytkownika, repo jest publiczne.
- **Brak śladów Caprine:** Messy wyrósł z Caprine, ale użytkownik chce, żeby nigdzie nie było po nim śladu
  (kod, historia, opisy). Nie dodawaj wzmianek o Caprine.
- **Instalator niepodpisany:** SmartScreen ostrzega („Więcej informacji → Uruchom mimo to”). Podpis wymagałby
  certyfikatu (Azure Trusted Signing albo OV); użytkownik na razie z niego zrezygnował.
- **Strona i grafiki:** `docs/` to GitHub Pages (https://parallax373.github.io/messy/), aktualizuje się samo po pushu.
  `npm run preview` renderuje `docs/preview.png` z makiety (bez prawdziwych rozmów), `npm run icons` PNG z `assets/*.svg`.
- **Facebook zmienia stronę:** gdy coś się psuje po stronie wyglądu, zacznij od `npm run debug` (DevTools na porcie
  9223) i sprawdź selektory: `aria-controls="mw-inbox-settings-menu"`, zmienne CSS `--header-height`,
  `--messenger-card-spacing`, pogrubienie (600+) nieprzeczytanych wierszy w `[role="row"]`.

## Do dokończenia (stan 2026-10-22)

- **Microsoft Store:** konto Partner Center jeszcze niezałożone (weryfikacja tożsamości miała awarię po stronie
  Microsoftu). Potem wpisać `identityName` i `publisher` z *Product identity* do `build.appx` w `package.json`
  (teraz wartości `TODO…`), `npm run dist:store`, zgłoszenie w Partner Center.
- **winget:** PR https://github.com/microsoft/winget-pkgs/pull/458726 (1.1.1) czeka na komentarz użytkownika
  `@microsoft-github-policy-service agree` (etykieta `Needs-CLA`). Umowę akceptuje sam użytkownik, nie agent.

Przypomnij użytkownikowi o obu punktach, dopóki nie są zrobione.
