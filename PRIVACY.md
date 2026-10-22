# Privacy / Prywatność

## English

Messy is a window around **facebook.com/messages**. It has no servers of its own and collects nothing.

- **Your login and messages** go only between your computer and Facebook, exactly as in a web browser.
  Messy never sees, stores or sends your password.
- **Stored on your computer** (in `%APPDATA%\Messy`): the Facebook session (cookies, like a browser
  profile), the panel size and your settings (mute, OLED mode). Uninstalling Messy and deleting this
  folder removes everything.
- **Network requests Messy itself makes:** only the update check, which downloads `latest.yml` and new
  installers from [github.com/Parallax373/messy-releases](https://github.com/Parallax373/messy-releases).
  No analytics, telemetry, crash reporting or tracking of any kind.
- **What Messy changes in the page:** it hides Facebook's top bar, adjusts colours and layout, adds the
  OLED, mute and update buttons, and counts unread chats on the chat list to colour the tray icon.
  The code that does this is in [`page/inject.js`](page/inject.js) and [`src/main.ts`](src/main.ts).

Facebook's own [privacy policy](https://www.facebook.com/privacy/policy/) applies to everything you do on Facebook.

## Polski

Messy to okno wokół **facebook.com/messages**. Nie ma własnych serwerów i niczego nie zbiera.

- **Logowanie i wiadomości** idą wyłącznie między Twoim komputerem a Facebookiem, tak jak w przeglądarce.
  Messy nie widzi, nie zapisuje ani nie wysyła Twojego hasła.
- **Na Twoim komputerze** (w `%APPDATA%\Messy`) zostaje: sesja Facebooka (ciasteczka, jak profil
  przeglądarki), rozmiar panelu i ustawienia (wyciszenie, tryb OLED). Odinstalowanie Messy i usunięcie
  tego folderu usuwa wszystko.
- **Połączenia, które robi sam Messy:** tylko sprawdzanie aktualizacji, czyli pobranie `latest.yml`
  i nowych instalatorów z [github.com/Parallax373/messy-releases](https://github.com/Parallax373/messy-releases).
  Żadnej analityki, telemetrii, raportów błędów ani śledzenia.
- **Co Messy zmienia na stronie:** chowa górny pasek Facebooka, poprawia kolory i układ, dodaje przyciski
  OLED, wyciszenia i aktualizacji oraz liczy nieprzeczytane czaty na liście, żeby pokolorować ikonę.
  Kod, który to robi, jest w [`page/inject.js`](page/inject.js) i [`src/main.ts`](src/main.ts).

Do wszystkiego, co robisz na Facebooku, stosuje się [polityka prywatności Facebooka](https://www.facebook.com/privacy/policy/).
