// Wstrzykiwane do strony facebook.com/messages: przyciski Messy obok „…” w nagłówku „Czaty” (motyw, wyciszenie,
// tryb okna/panelu, pinezka), motyw jasny/ciemny i klasy ustawień na <html> (same kolory są w page/style.css).
// Messy wstrzykuje go przed skryptami Facebooka, więc atrapa Notification działa od początku,
// a reszta czeka na DOM.
(() => {
	if (window.__messyInjected) {
		return;
	}

	window.__messyInjected = true;

	const BELL = 'M10 2a5.5 5.5 0 0 0-5.5 5.5v2.74l-1.4 2.8A1 1 0 0 0 4 14.5h12a1 1 0 0 0 .9-1.46l-1.4-2.8V7.5A5.5 5.5 0 0 0 10 2zm-2.45 13.75a2.5 2.5 0 0 0 4.9 0h-4.9z';
	const BELL_OFF = 'M2.22 2.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06l-2.22-2.22H4a1 1 0 0 1-.9-1.46l1.4-2.8V7.5c0-.86.2-1.68.55-2.4L2.22 3.28a.75.75 0 0 1 0-1.06zM10 2a5.5 5.5 0 0 1 5.5 5.5v2.74l1.03 2.06L7.2 2.97A5.48 5.48 0 0 1 10 2zm-2.45 13.75a2.5 2.5 0 0 0 4.9 0h-4.9z';
	const MOON = 'M8.2 2.1a.75.75 0 0 1 .17.83A6.25 6.25 0 0 0 17.07 11.6a.75.75 0 0 1 1 .9A8 8 0 1 1 7.5 1.93a.75.75 0 0 1 .7.17z';
	const SUN = 'M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM10 1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 1.5zm0 14a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75zM1.5 10a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 1.5 10zm14 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75z';
	const WINDOW = 'M4.75 3A1.75 1.75 0 0 0 3 4.75v10.5c0 .97.78 1.75 1.75 1.75h10.5c.97 0 1.75-.78 1.75-1.75V4.75C17 3.78 16.22 3 15.25 3H4.75zM4.5 7.5h11v7.75a.25.25 0 0 1-.25.25H4.75a.25.25 0 0 1-.25-.25V7.5z';
	const PANEL = 'M3 4.75A1.75 1.75 0 0 1 4.75 3h10.5A1.75 1.75 0 0 1 17 4.75v10.5A1.75 1.75 0 0 1 15.25 17H4.75A1.75 1.75 0 0 1 3 15.25V4.75zM4.5 12v3.25c0 .14.11.25.25.25h10.5a.25.25 0 0 0 .25-.25V12h-11z';
	const PIN = 'M12.6 2.2a.75.75 0 0 1 1.06 0l4.14 4.14a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-.8.17l-2.6 2.6.3 2.84a.75.75 0 0 1-.21.6l-1.2 1.2a.75.75 0 0 1-1.06 0L7.5 13.06l-4.22 4.22a.75.75 0 0 1-1.06-1.06L6.44 12 3.2 8.76a.75.75 0 0 1 0-1.06l1.2-1.2a.75.75 0 0 1 .6-.22l2.85.3 2.6-2.6a.75.75 0 0 1 .17-.8l1.98-1.98z';

	// Przyciski w kolejności od lewej; każdy przełącza jedno ustawienie. Ikona pokazuje, co się stanie po kliknięciu.
	const BUTTONS = [
		{
			id: 'messy-theme-button',
			key: 'light',
			label: on => on ? strings.lightOn : strings.lightOff,
			icon: on => on ? MOON : SUN,
			dimmed: () => false,
		},
		{
			id: 'messy-mute-button',
			key: 'muted',
			label: on => on ? strings.muteOn : strings.muteOff,
			icon: on => on ? BELL_OFF : BELL,
			dimmed: on => on,
		},
		{
			id: 'messy-mode-button',
			key: 'window_mode',
			label: on => on ? strings.backToPanel : strings.toWindow,
			icon: on => on ? PANEL : WINDOW,
			dimmed: () => false,
		},
		{
			// Tylko w trybie panelu (page/style.css ukrywa ją w trybie okna).
			id: 'messy-pin-button',
			key: 'pinned',
			label: on => on ? strings.pinOn : strings.pinOff,
			icon: () => PIN,
			dimmed: on => !on,
		},
	];

	let settings = {muted: false, light: false, oled: false, pinned: false, window_mode: false};
	// Teksty w języku Windowsa z src/i18n.ts; dopóki nie dotrą, przycisków nie wstawiamy.
	let strings = null;

	// Facebook może pamiętać zgodę na powiadomienia sprzed wyciszenia, więc podczas wyciszenia
	// zamiast systemowego dymka zwracamy atrapę z tym samym interfejsem.
	const NativeNotification = window.Notification;
	window.Notification = new Proxy(NativeNotification, {
		construct(target, args) {
			if (!settings.muted) {
				return new target(...args);
			}

			const silent = new EventTarget();
			silent.close = () => {};
			return silent;
		},
	});

	const style = document.createElement('style');
	style.textContent = __MESSY_CSS__;

	function start() {
		document.head.append(style);

		// Przypięty panel bez kursora nad sobą ma prawie przezroczyste tło (page/style.css, messy-dim).
		// Wyjątek: piszesz, czyli okno ma fokus, a kursor tekstowy stoi w polu wiadomości.
		let hovered = document.documentElement.matches(':hover');
		function updateDim() {
			const active = document.activeElement;
			const typing = document.hasFocus() && active && (active.isContentEditable || /^(INPUT|TEXTAREA)$/.test(active.tagName));
			const dim = Boolean(settings.pinned && !settings.window_mode && settings.translucent && !hovered && !typing);
			document.documentElement.classList.toggle('messy-dim', dim);
		}
		document.documentElement.addEventListener('mouseenter', () => {
			hovered = true;
			updateDim();
		});
		document.documentElement.addEventListener('mouseleave', () => {
			hovered = false;
			updateDim();
		});
		for (const name of ['focusin', 'focusout']) {
			document.addEventListener(name, () => setTimeout(updateDim));
		}
		window.addEventListener('blur', updateDim);
		window.addEventListener('focus', updateDim);

		function render(button, spec) {
			const on = settings[spec.key];
			button.setAttribute('aria-label', spec.label(on));
			button.title = spec.label(on);
			const path = button.querySelector('path');
			path.setAttribute('d', spec.icon(on));
			path.setAttribute('fill-rule', 'evenodd');
			button.style.opacity = spec.dimmed(on) ? '0.55' : '';
			// Przypięty panel: wyraźna obwódka, sama jaśniejsza ikona była prawie niewidoczna.
			button.classList.toggle('messy-on', spec.key === 'pinned' && on);
		}

		// Motyw: Facebook oznacza ciemne i jasne fragmenty klasami __fb-dark-mode / __fb-light-mode (zmienne
		// kolorów), więc wystarczy je zamienić, także w elementach dokładanych później.
		function applyTheme() {
			const [from, to] = settings.light ? ['__fb-dark-mode', '__fb-light-mode'] : ['__fb-light-mode', '__fb-dark-mode'];
			for (const element of document.getElementsByClassName(from)) {
				element.classList.add(to);
			}
			for (const element of [...document.getElementsByClassName(from)]) {
				element.classList.remove(from);
			}
		}
		new MutationObserver(applyTheme).observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});

		function apply(value) {
			settings = value;
			document.documentElement.classList.toggle('messy-oled', settings.oled);
			document.documentElement.classList.toggle('messy-no-video', settings.hide_video_call);
			document.documentElement.classList.toggle('messy-window-mode', settings.window_mode);
			applyTheme();
			updateDim();
			ensureThreadPin();
			for (const spec of BUTTONS) {
				const button = document.getElementById(spec.id);
				if (button) {
					render(button, spec);
				}
			}
			for (const button of document.querySelectorAll('[data-messy-key]')) {
				render(button, BUTTONS.find(spec => spec.key === button.dataset.messyKey));
			}
		}

		function ensureButtons() {
			if (!strings) {
				return;
			}

			// „…” ma stały identyfikator menu niezależny od języka interfejsu.
			const menuButton = document.querySelector('[aria-controls="mw-inbox-settings-menu"]');
			if (!menuButton || BUTTONS.every(spec => document.getElementById(spec.id))) {
				return;
			}

			// Najwyższy przodek „…”, który zawiera tylko jego, czyli komórka w rzędzie przycisków.
			let cell = menuButton;
			while (cell.parentElement && cell.parentElement.children.length < 2) {
				cell = cell.parentElement;
			}

			for (const spec of BUTTONS) {
				document.getElementById(spec.id)?.closest('.messy-cell')?.remove();
				const clone = cell.cloneNode(true);
				clone.classList.add('messy-cell');
				const button = clone.querySelector('[role="button"]') ?? clone;
				button.id = spec.id;
				for (const attribute of ['aria-controls', 'aria-expanded', 'aria-haspopup']) {
					button.removeAttribute(attribute);
				}

				button.addEventListener('click', async event => {
					event.preventDefault();
					event.stopPropagation();
					await window.messy.setSetting(spec.key, !settings[spec.key]);
				});

				render(button, spec);
				cell.before(clone);
			}
		}

		// Pinezka także w nagłówku otwartej rozmowy, przed przyciskiem informacji (ostatni po prawej
		// przycisk nagłówka z aria-expanded bez aria-controls; etykiety zależą od języka, więc ich nie czytamy).
		const THREAD_PIN_ID = 'messy-thread-pin';

		// Najwyższy przodek przycisku, który zawiera tylko jego, czyli komórka w rzędzie przycisków.
		function cellOf(button) {
			let cell = button;
			while (cell.parentElement && cell.parentElement.children.length < 2) {
				cell = cell.parentElement;
			}
			return cell;
		}

		// Przyciski rozmowy w nagłówku idą: głosowa, wideo, (pinezka), informacje. Ostatni przycisk przed
		// informacjami, który nie jest nasz, to wideo; klasa pozwala go ukryć (ustawienie hide_video_call).
		function markVideoCall(infoCell) {
			const cells = [...infoCell.parentElement.children].filter(cell =>
				cell !== infoCell && !cell.classList.contains('messy-cell') && cell.querySelector('[role="button"]:not([aria-expanded])'));
			const video = cells.at(-1);
			for (const cell of infoCell.parentElement.querySelectorAll(':scope > .messy-video-cell')) {
				if (cell !== video) {
					cell.classList.remove('messy-video-cell');
				}
			}
			if (video && cells.length >= 2 && !video.classList.contains('messy-video-cell')) {
				video.classList.add('messy-video-cell');
			}
		}
		// Przyciski Messy w nagłówku rozmowy, przed przyciskiem informacji. Pinezka zawsze w trybie panelu; motyw,
		// wyciszenie i tryb tylko wtedy, gdy nagłówka „Czaty” nie widać (wąskie okno) i zmieszczą się obok tytułu.
		const THREAD_EXTRA = ['light', 'muted', 'window_mode'];
		function threadKeys(info) {
			const keys = settings.window_mode ? [] : ['pinned'];
			const listHeader = document.getElementById('messy-mode-button');
			if (listHeader?.checkVisibility({visibilityProperty: true})) {
				return keys;
			}
			// Miejsce: od lewej krawędzi rozmowy do przycisku informacji, minus „Wstecz”, tytuł (min. 160 px)
			// i przyciski Facebooka w tym samym rzędzie; każdy przycisk zajmuje ok. 44 px.
			const main = document.querySelector('[role="main"]')?.getBoundingClientRect();
			const row = cellOf(info).parentElement;
			const facebookButtons = [...row.children].filter(cell => !cell.classList.contains('messy-cell') && cell.getBoundingClientRect().width > 0).length - 1;
			const room = main ? info.getBoundingClientRect().left - main.left - 60 - 160 - facebookButtons * 44 - keys.length * 44 : 0;
			const extra = THREAD_EXTRA.slice(Math.max(0, THREAD_EXTRA.length - Math.floor(room / 44)));
			return [...extra, ...keys];
		}
		function ensureThreadPin() {
			const info = [...document.querySelectorAll('[role="button"][aria-expanded]:not([aria-controls])')]
				.filter(button => {
					const rect = button.getBoundingClientRect();
					return rect.width >= 28 && rect.width <= 48 && rect.top >= 0 && rect.top < 80;
				})
				.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0];
			if (!info) {
				return;
			}
			const infoCell = cellOf(info);
			markVideoCall(infoCell);
			if (!strings) {
				return;
			}
			const current = [...document.querySelectorAll('[data-messy-key]')];
			const keys = threadKeys(info);
			const same = current.length === keys.length && current.every((button, i) => button.dataset.messyKey === keys[i] && button.isConnected && button.getBoundingClientRect().width > 0);
			if (same) {
				return;
			}
			for (const button of current) {
				button.closest('.messy-cell')?.remove();
			}
			for (const key of keys) {
				const spec = BUTTONS.find(spec => spec.key === key);
				// Kopia przycisku informacji: ten sam wygląd i kolor motywu rozmowy, tylko inna ikona.
				const clone = infoCell.cloneNode(true);
				clone.classList.add('messy-cell');
				const button = clone.querySelector('[role="button"]') ?? clone;
				button.id = key === 'pinned' ? THREAD_PIN_ID : 'messy-thread-' + key;
				button.dataset.messyKey = key;
				button.removeAttribute('aria-expanded');
				const svg = button.querySelector('svg');
				if (svg) {
					svg.setAttribute('viewBox', '0 0 36 36');
					svg.innerHTML = '<g transform="translate(18,18)scale(1.35)translate(-10,-10)"><path fill="var(--mwp-header-button-color)"></path></g>';
				}
				button.addEventListener('click', async event => {
					event.preventDefault();
					event.stopPropagation();
					await window.messy.setSetting(key, !settings[key]);
				});
				render(button, spec);
				infoCell.before(clone);
			}
		}

		// Liczymy nieprzeczytane rozmowy na liście czatów: Facebook pogrubia ich nazwę i podgląd (600+,
		// przeczytane mają 500/400). Liczba w tytule strony się nie nadaje, bo obejmuje powiadomienia
		// Facebooka (dzwonek) i nie zawsze nadąża za wiadomościami.
		let lastUnread = -1;
		function reportUnread() {
			const rows = [...document.querySelectorAll('[role="row"]')].filter(row => row.querySelector('a[href*="/t/"]'));
			const unread = rows.filter(row => [...row.querySelectorAll('span')].some(span => Number(getComputedStyle(span).fontWeight) >= 600)).length;
			if (unread !== lastUnread) {
				lastUnread = unread;
				window.messy.setUnread(unread);
			}
		}

		setInterval(reportUnread, 2000);
		reportUnread();

		// Zielony przycisk „Zaktualizuj” przed pozostałymi, widoczny tylko gdy aktualizacja jest pobrana.
		const UPDATE_ID = 'messy-update-button';
		const DOWNLOAD = 'M10 2.5a.75.75 0 0 1 .75.75v8.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.25A.75.75 0 0 1 10 2.5zM3.75 16a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75z';
		let updateVersion = null;

		function ensureUpdateButton() {
			const existing = document.getElementById(UPDATE_ID);
			if (!updateVersion || !strings) {
				existing?.closest('.messy-cell')?.remove();
				return;
			}

			const first = document.getElementById(BUTTONS[0].id)?.closest('.messy-cell');
			if (existing || !first) {
				return;
			}

			const clone = first.cloneNode(true);
			const button = clone.querySelector('[role="button"]') ?? clone;
			button.id = UPDATE_ID;
			button.setAttribute('aria-label', strings.update.replace('{version}', updateVersion));
			button.title = strings.updateHint.replace('{version}', updateVersion);
			button.style.opacity = '';
			button.style.color = '#31A24C';
			button.querySelector('svg').style.setProperty('--x-color', '#31A24C');
			button.querySelector('path').setAttribute('d', DOWNLOAD);
			button.addEventListener('click', event => {
				event.preventDefault();
				event.stopPropagation();
				window.messy.installUpdate();
			});
			first.before(clone);
		}

		window.messy.onUpdateReady(version => {
			updateVersion = version;
			document.getElementById(UPDATE_ID)?.closest('.messy-cell')?.remove();
			ensureUpdateButton();
		});

		window.messy.getUpdateReady().then(version => {
			updateVersion = version;
			ensureUpdateButton();
		});


		window.messy.onSettingsChange(apply);

		Promise.all([window.messy.getSettings(), window.messy.getStrings()]).then(([value, texts]) => {
			strings = texts;
			apply(value);
			ensureButtons();
			ensureUpdateButton();
		});


		// Przytrzymany prawy przycisk przesuwa panel (od 6 px ruchu); krótki klik dalej otwiera zwykłe menu.
		const dpr = () => window.devicePixelRatio || 1;
		let drag = null;
		let swallowContextMenu = false;
		document.addEventListener('pointerdown', event => {
			if (event.button === 2) {
				drag = {x: event.screenX, y: event.screenY, moving: false, frame: 0, pointer: event.pointerId, target: event.target};
			}
		}, true);
		document.addEventListener('pointermove', event => {
			if (!drag || !(event.buttons & 2)) {
				return;
			}
			const dx = event.screenX - drag.x;
			const dy = event.screenY - drag.y;
			if (!drag.moving) {
				if (Math.hypot(dx, dy) < 6) {
					return;
				}
				drag.moving = true;
				drag.target.setPointerCapture?.(drag.pointer);
				window.messy.dragWindow('start');
			}
			cancelAnimationFrame(drag.frame);
			drag.frame = requestAnimationFrame(() => window.messy.dragWindow('move', dx * dpr(), dy * dpr()));
		}, true);
		document.addEventListener('pointerup', event => {
			if (event.button !== 2 || !drag) {
				return;
			}
			if (drag.moving) {
				cancelAnimationFrame(drag.frame);
				window.messy.dragWindow('move', (event.screenX - drag.x) * dpr(), (event.screenY - drag.y) * dpr());
				window.messy.dragWindow('end');
				swallowContextMenu = true;
				event.preventDefault();
				event.stopPropagation();
			}
			drag = null;
		}, true);
		document.addEventListener('contextmenu', event => {
			if (swallowContextMenu) {
				swallowContextMenu = false;
				event.preventDefault();
				event.stopPropagation();
			}
		}, true);

		// Boczne przyciski myszy: „wstecz” z otwartej rozmowy wraca do listy czatów (zamiast skakać po historii
		// między rozmowami), „dalej” nic nie robi. Podglądu zdjęć nie ruszamy, tam „wstecz” go zamyka.
		const isBack = event => event.button === 3;
		const isSideButton = event => event.button === 3 || event.button === 4;
		const inThread = () => /\/(messages|messages\/e2ee)\/t\//.test(location.pathname);
		for (const name of ['pointerdown', 'mousedown', 'mouseup', 'auxclick']) {
			document.addEventListener(name, event => {
				if (isSideButton(event) && !mediaOpen) {
					event.preventDefault();
					event.stopPropagation();
				}
			}, true);
		}
		// Akcja na auxclick: po zablokowanym pointerdown przeglądarka nie wysyła mouseup ani pointerup.
		document.addEventListener('auxclick', event => {
			if (!isSideButton(event) || mediaOpen) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			if (isBack(event) && inThread()) {
				// Wąskie okno: rozmowa zasłania listę, a w nagłówku jest przycisk „Wstecz” Facebooka (mały przycisk
				// przy lewej krawędzi rozmowy; etykieta zależy od języka). Szerokie okno: lista obok, wystarczy zmienić adres.
				const main = document.querySelector('[role="main"]')?.getBoundingClientRect();
				const arrow = main && [...document.querySelectorAll('[role="main"] [role="button"]')].find(button => {
					const rect = button.getBoundingClientRect();
					return rect.width >= 28 && rect.width <= 48 && rect.top >= 0 && rect.top < 60 && rect.left - main.left < 40;
				});
				if (arrow) {
					arrow.click();
				} else {
					// Router Facebooka czyta adres przy popstate, więc lista otwiera się bez przeładowania strony.
					history.pushState(null, '', '/messages/');
					window.dispatchEvent(new PopStateEvent('popstate', {state: null}));
				}
			}
		}, true);

		// Błąd Facebooka: w wąskim oknie bez otwartej rozmowy (/messages/) lista czatów jest ukryta, a całe okno
		// zajmuje „Nie wybrano czatów”. W dobrym stanie (po „Wstecz” Facebooka) oba kontenery mają zamienione
		// klasy, więc zamieniamy je sami. Po otwarciu rozmowy cofamy zamianę, bo React pamięta swoje klasy
		// i sam by ich nie poprawił.
		let swapped = null;
		function swapClasses(pair) {
			const [a, b] = pair;
			const c = a.className;
			a.className = b.className;
			b.className = c;
		}
		function fixEmptyList() {
			if (swapped && (inThread() || !swapped.every(element => element.isConnected))) {
				if (swapped.every(element => element.isConnected)) {
					swapClasses(swapped);
				}
				swapped = null;
			}
			if (swapped || inThread()) {
				return;
			}
			const nav = document.querySelector('[role="navigation"] [role="row"]')?.closest('[role="navigation"]');
			const main = document.querySelector('[role="main"]');
			if (!nav || !main) {
				return;
			}
			let common = main;
			while (common && !common.contains(nav)) {
				common = common.parentElement;
			}
			const branch = element => {
				while (element.parentElement !== common) {
					element = element.parentElement;
				}
				return element;
			};
			const list = branch(nav);
			const chat = branch(main);
			if (getComputedStyle(list).visibility === 'hidden' && chat.getBoundingClientRect().width >= innerWidth - 1) {
				swapped = [list, chat];
				swapClasses(swapped);
			}
		}
		// Po zmianie szerokości układ Facebooka może być inny, więc zaczynamy od jego własnych klas.
		window.addEventListener('resize', () => {
			if (swapped?.every(element => element.isConnected)) {
				swapClasses(swapped);
			}
			swapped = null;
			fixEmptyList();
		});

		// Błąd Facebooka: okienko emoji (i podobne) otwiera się pod przyciskiem w polu wiadomości, czyli poza
		// dolną krawędzią okna albo na polu wiadomości. Taką warstwę przypinamy dolną krawędzią nad polem wiadomości
		// (treść okienka doładowuje się później i wtedy rośnie w górę, a nie znowu za krawędź).
		// Facebook przy każdym odświeżeniu okienka ustawia styl warstwy od nowa, więc pilnujemy jej atrybutu style.
		const watchedLayers = new WeakSet();
		function fixOffscreenPopups() {
			for (const dialog of document.querySelectorAll('[role="dialog"]')) {
				let layer = dialog;
				while (layer && !(layer.style.position === 'absolute' && layer.style.top)) {
					layer = layer.parentElement;
				}
				if (!layer?.offsetParent || !layer.style.top.endsWith('px')) {
					continue;
				}
				if (!watchedLayers.has(layer)) {
					watchedLayers.add(layer);
					new MutationObserver(fixOffscreenPopups).observe(layer, {attributes: true, attributeFilter: ['style']});
				}
				// Nad polem wiadomości (i przyciskiem, który otworzył okienko), żeby było widać, co się pisze.
				const tops = [...document.querySelectorAll('[aria-expanded="true"], [role="textbox"][contenteditable="true"]')]
					.map(element => element.getBoundingClientRect())
					.filter(rect => rect.height > 0 && rect.top > innerHeight / 2)
					.map(rect => rect.top);
				const above = (tops.length ? Math.min(...tops) : innerHeight) - 8;
				const box = dialog.getBoundingClientRect();
				if (box.height === 0 || box.bottom <= above + 1) {
					continue;
				}
				const parent = layer.offsetParent.getBoundingClientRect();
				layer.classList.add('messy-popup-above');
				layer.style.top = 'auto';
				layer.style.bottom = parent.bottom - above + 'px';
				// Facebook przycina warstwę do miejsca pod przyciskiem; nad nim jest go więcej.
				layer.style.maxHeight = above - 8 + 'px';
			}
		}

		// Po długim schowaniu Messy otwiera się na liście czatów, ale nie wtedy, gdy w polu wiadomości jest
		// niewysłany tekst (przeładowanie strony by go skasowało).
		window.messy.onBackToList(() => {
			const draft = [...document.querySelectorAll('[role="textbox"][contenteditable="true"]')].some(box => box.textContent.trim());
			if (!draft) {
				location.assign('/messages/');
			}
		});

		// Esc chowa okno do zasobnika, chyba że zamyka coś na stronie (menu, okno dialogowe, podgląd zdjęć).
		window.addEventListener('keydown', event => {
			if (event.key !== 'Escape' || event.defaultPrevented || mediaOpen || [...document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"]')].some(open => open.getBoundingClientRect().width > 0)) {
				return;
			}
			window.messy.hideWindow();
		});

		// Podgląd zdjęć i filmów na pełnym ekranie, po zamknięciu z powrotem panel. Zwykłe czaty otwierają go
		// pod /messenger_media, szyfrowane (/messages/e2ee) jako warstwę bez zmiany adresu. Tę rozpoznajemy po
		// przycisku pobierania (link do pliku blob:), który zajmuje cały ekran razem z warstwą.
		const isMediaViewer = () => [...document.querySelectorAll('a[download][href^="blob:"]')].some(link => {
			let layer = link;
			for (let i = 0; i < 8 && layer; i++) {
				layer = layer.parentElement;
				if (layer && layer.offsetWidth >= document.documentElement.clientWidth && layer.offsetHeight >= innerHeight * 0.9) {
					return true;
				}
			}
			return false;
		});
		let mediaOpen = false;
		function checkMediaViewer() {
			const open = location.pathname.startsWith('/messenger_media') || isMediaViewer();
			if (open !== mediaOpen) {
				mediaOpen = open;
				window.messy.setFullscreen(open);
			}
		}

		// Facebook zmienia DOM bez przerwy (nowe wiadomości, „pisze…”, animacje) i przebudowuje nagłówek przy
		// nawigacji. Poprawki mierzą układ strony, więc zamiast przy każdej zmianie odpalamy je razem, raz na klatkę
		// (przed jej narysowaniem, więc nic nie mignie).
		let fixFrame = 0;
		new MutationObserver(() => {
			fixFrame ||= requestAnimationFrame(() => {
				fixFrame = 0;
				ensureButtons();
				ensureUpdateButton();
				ensureThreadPin();
				fixEmptyList();
				fixOffscreenPopups();
				checkMediaViewer();
			});
		}).observe(document.body, {childList: true, subtree: true});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start, {once: true});
	} else {
		start();
	}
})();
