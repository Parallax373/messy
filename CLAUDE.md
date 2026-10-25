# Messy: instrukcja dla kolejnych sesji

Messy to aplikacja Tauri 2 (Rust + WebView2): facebook.com/messages w panelu nad zasobnikiem Windows. Repo publiczne:
https://github.com/Parallax373/messy (MIT). Użytkownik pisze po polsku; odpowiadaj po polsku.

Opis kodu i struktury: `CONTRIBUTING.md`. Ten plik opisuje **wdrażanie aktualizacji** i pułapki.

## Jak działa aktualizacja u użytkowników

1. Zainstalowany Messy (`%LOCALAPPDATA%\Messy`) przy starcie i co 4 godziny pyta GitHuba o
   `https://github.com/Parallax373/messy/releases/latest/download/latest.json` (`src-tauri/src/updater.rs`,
   tauri-plugin-updater). Adres i klucz publiczny są w `plugins.updater` w `src-tauri/tauri.conf.json`
   i trafiają do exe przy buildzie. Bez tokenu, repo jest publiczne.
2. Gdy `latest.json` ma wyższą wersję, instalator pobiera się w tle do pamięci i jest sprawdzany podpisem minisign.
3. Po pobraniu: zielony przycisk „Zaktualizuj do X” w nagłówku „Czaty” (`page/inject.js`), pozycja w menu ikony,
   dymek Windows i tooltip ikony. Klik uruchamia instalator (tryb passive), który zamyka i ponownie uruchamia Messy.
   Bez kliku instaluje się przy „Zakończ” z menu ikony.

**Zmiana adresu w `endpoints` albo klucza `pubkey` psuje aktualizacje u wszystkich zainstalowanych kopii**, bo mają
stare wartości w exe. Tak już było trzy razy (prywatne repo → `messy-releases` → `messy`, potem przejście z Electrona
na Tauri w 2.0.0); ludzie musieli przeinstalować ręcznie. Nie zmieniaj tego bez wyraźnej potrzeby i bez uprzedzenia
użytkownika.

**Klucz prywatny do podpisu aktualizacji** leży w `%USERPROFILE%\.tauri\messy.key` (bez hasła), poza repo. Jego utrata
oznacza, że żadna zainstalowana kopia nie przyjmie już aktualizacji. Użytkownik powinien mieć jego kopię zapasową.
Tak już się stało: klucz z wydania 2.0.0 przepadł przy reinstalacji systemu (22.10.2026), w 2.7.1 jest nowy klucz,
więc 2.0.0 trzeba było przeinstalować ręcznie. Kopia nowego klucza ma leżeć na dysku USB „Backup”.

Wersje 1.x (Electron) sprawdzają `latest.yml`, którego wydania 2.x nie mają, więc same się nie zaktualizują
(decyzja użytkownika: ręczna reinstalacja). Instalator 2.x po instalacji po cichu odinstalowuje starą wersję
z `%LOCALAPPDATA%\Programs\messy` (`src-tauri/installer-hooks.nsh`). Sesja Facebooka się nie przenosi, trzeba
zalogować się ponownie.

## Wydanie nowej wersji (krok po kroku)

1. Zmiany zacommitowane i wypchnięte na `main` (skrypt odmawia przy brudnym drzewie).
2. Zamknij uruchomiony Messy, bo trzyma pliki w `src-tauri/target`:
   `Get-Process Messy, messy -ErrorAction SilentlyContinue | Stop-Process -Force`
3. Uruchom jedno z:
   - `npm run release`: poprawka, 2.0.0 → 2.0.1
   - `npm run release -- minor`: nowa funkcja, 2.0.1 → 2.1.0
   - `npm run release -- major`: duża zmiana, 2.x → 3.0.0
4. `scripts/release.js` robi po kolei:
   - zbiera tytuły commitów od ostatniego tagu (bez commitów typu `1.2.3`) do listy zmian,
   - `npm version …` (commit „X.Y.Z” + tag `vX.Y.Z`, annotowany; `tauri.conf.json` bierze wersję z `package.json`),
   - `git push --follow-tags`,
   - `tauri build` z kluczem z `~/.tauri/messy.key` (release build Rusta trwa kilka minut),
   - kopiuje instalator do `release/Messy-Setup-X.Y.Z.exe` i zapisuje `release/latest.json` z podpisem,
   - `gh release create vX.Y.Z` z oboma plikami i listą zmian.
5. Sprawdź:
   ```sh
   gh release list --repo Parallax373/messy --limit 2
   curl -s -L https://github.com/Parallax373/messy/releases/latest/download/latest.json
   ```
6. Opcjonalnie popraw opis wydania na bardziej ludzki (EN + PL), jak w `v1.1.1`:
   `gh release edit vX.Y.Z --repo Parallax373/messy --notes-file -`.
7. winget (gdy pakiet jest już w winget-pkgs): `npm run winget`, `winget validate --manifest winget/manifests/p/Parallax373/Messy/X.Y.Z`,
   potem PR z nową wersją do microsoft/winget-pkgs (fork Parallax373/winget-pkgs, pliki przez `gh api` jak w PR #458726).

Test aktualizacji end-to-end: zainstaluj starszy instalator po cichu (`Messy-Setup-<stara>.exe /S`), wydaj nową
wersję, uruchom zainstalowanego Messy i po chwili sprawdź menu ikony („Uruchom ponownie i zaktualizuj do …”).
Zielony przycisk bez wydawania: `$env:MESSY_FAKE_UPDATE="9.9.9"; npm start` (działa tylko w buildzie deweloperskim).

## Pułapki

- **Strona facebook.com woła Rusta** przez `window.__TAURI_INTERNALS__.invoke` (`page/bridge.js`). Nowe polecenie
  trzeba dopisać w trzech miejscach: `generate_handler!` w `main.rs`, `COMMANDS` w `src-tauri/build.rs`
  i `allow-…` w `src-tauri/capabilities/messenger.json`. Bez tego strona dostaje „not allowed”.
- **Rust → strona** idzie przez `window.eval("window.__messyEmit(...)")`, nie przez zdarzenia Tauri (te wymagałyby
  dodatkowych uprawnień dla zdalnej domeny).
- **Zgody WebView2** (powiadomienia, mikrofon, kamera) nadaje `allow_permissions` w `main.rs` przez `webview2-com`;
  jego wersja musi być ta sama co w wry (`cargo tree -i webview2-com`).
- **Pierwszy build** na nowej maszynie (`npm start` i `tauri build`) kompiluje kilkaset crate'ów i trwa kilka minut.
- **Polskie teksty instalatora:** NSIS Tauri nie ma polskiego tłumaczenia kilku własnych komunikatów (ostrzeżenie
  przy buildzie), te pokazują się po angielsku.
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
  Microsoftu). Po przejściu na Tauri nie ma już paczki appx: zgłasza się aplikację typu „EXE or MSI”, podając
  link do `Messy-Setup-X.Y.Z.exe` z GitHuba i przełącznik cichej instalacji `/S`. Aktualizuje się wtedy sama
  przez updater.
- **winget:** PR https://github.com/microsoft/winget-pkgs/pull/458726 (1.1.1): CLA podpisane, walidacja przeszła,
  czeka na zatwierdzenie przez moderatora Microsoftu (nic do zrobienia po naszej stronie). Po scaleniu kolejne
  wersje zgłaszać nowym PR.

Przypomnij użytkownikowi o Microsoft Store, dopóki nie jest zrobiony.
