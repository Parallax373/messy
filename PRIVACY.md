# Privacy / Prywatność

## English

Messy is a window around **facebook.com/messages**. It has no servers of its own and collects nothing.

- **Your login and messages** go only between your computer and Facebook, exactly as in a web browser.
  Messy never sees, stores or sends your password.
- **Stored on your computer**: the Facebook session (cookies, like a browser profile) in
  `%LOCALAPPDATA%\pl.messy.app`, the panel size and your settings (mute, OLED mode) in
  `%APPDATA%\pl.messy.app`. Uninstalling Messy and deleting these folders removes everything.
- **Network requests Messy itself makes:** only the update check, which downloads `latest.json` and new
  installers from [github.com/Parallax373/messy](https://github.com/Parallax373/messy).
  No analytics, telemetry, crash reporting or tracking of any kind.
- **What Messy changes in the page:** it hides Facebook's top bar, adjusts colours and layout, adds the
  OLED, mute and update buttons, and counts unread chats on the chat list to colour the tray icon.
  The code that does this is in [`page/inject.js`](page/inject.js) and [`page/style.css`](page/style.css).

Facebook's own [privacy policy](https://www.facebook.com/privacy/policy/) applies to everything you do on Facebook.

## Polski

Messy to okno wokół **facebook.com/messages**. Nie ma własnych serwerów i niczego nie zbiera.

- **Logowanie i wiadomości** idą wyłącznie między Twoim komputerem a Facebookiem, tak jak w przeglądarce.
  Messy nie widzi, nie zapisuje ani nie wysyła Twojego hasła.
- **Na Twoim komputerze** zostaje: sesja Facebooka (ciasteczka, jak profil przeglądarki)
  w `%LOCALAPPDATA%\pl.messy.app`, rozmiar panelu i ustawienia (wyciszenie, tryb OLED)
  w `%APPDATA%\pl.messy.app`. Odinstalowanie Messy i usunięcie tych folderów usuwa wszystko.
- **Połączenia, które robi sam Messy:** tylko sprawdzanie aktualizacji, czyli pobranie `latest.json`
  i nowych instalatorów z [github.com/Parallax373/messy](https://github.com/Parallax373/messy).
  Żadnej analityki, telemetrii, raportów błędów ani śledzenia.
- **Co Messy zmienia na stronie:** chowa górny pasek Facebooka, poprawia kolory i układ, dodaje przyciski
  OLED, wyciszenia i aktualizacji oraz liczy nieprzeczytane czaty na liście, żeby pokolorować ikonę.
  Kod, który to robi, jest w [`page/inject.js`](page/inject.js) i [`page/style.css`](page/style.css).

Do wszystkiego, co robisz na Facebooku, stosuje się [polityka prywatności Facebooka](https://www.facebook.com/privacy/policy/).
