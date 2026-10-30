// Wstrzykiwane do strony facebook.com/messages: przyciski Messy obok „…” w nagłówku „Czaty” (motyw, wyciszenie,
// menu trybów), motyw jasny/ciemny i klasy ustawień na <html> (same kolory są w page/style.css).
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
	const EDGE = 'M4.75 3A1.75 1.75 0 0 0 3 4.75v10.5c0 .97.78 1.75 1.75 1.75h10.5c.97 0 1.75-.78 1.75-1.75V4.75C17 3.78 16.22 3 15.25 3H4.75zM4.5 4.75c0-.14.11-.25.25-.25H12v11H4.75a.25.25 0 0 1-.25-.25V4.75z';
	const CHECK = 'M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0z';
	const PIN = 'M12.6 2.2a.75.75 0 0 1 1.06 0l4.14 4.14a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-.8.17l-2.6 2.6.3 2.84a.75.75 0 0 1-.21.6l-1.2 1.2a.75.75 0 0 1-1.06 0L7.5 13.06l-4.22 4.22a.75.75 0 0 1-1.06-1.06L6.44 12 3.2 8.76a.75.75 0 0 1 0-1.06l1.2-1.2a.75.75 0 0 1 .6-.22l2.85.3 2.6-2.6a.75.75 0 0 1 .17-.8l1.98-1.98z';

	// Tryby wyświetlania (src-tauri/src/main.rs, set_mode): ikona przycisku pokazuje bieżący.
	const MODES = [
		{mode: 'panel', icon: PANEL, name: () => strings.modePanel, hint: () => strings.modePanelHint},
		{mode: 'free', icon: PIN, name: () => strings.modeFree, hint: () => strings.modeFreeHint},
		{mode: 'window', icon: WINDOW, name: () => strings.modeWindow, hint: () => strings.modeWindowHint},
		{mode: 'edge', icon: EDGE, name: () => strings.modeEdge, hint: () => strings.modeEdgeHint},
	];
	const currentMode = () => settings.edge_mode ? 'edge' : settings.window_mode ? 'window' : settings.pinned ? 'free' : 'panel';
	const modeSpec = mode => MODES.find(spec => spec.mode === mode);

	// Przyciski w kolejności od lewej. Zwykły przełącza jedno ustawienie (ikona pokazuje, co się stanie po kliknięciu);
	// przycisk trybu otwiera menu trybów (openModeMenu).
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
			key: 'mode',
			menu: true,
			value: currentMode,
			label: mode => strings.mode.replace('{mode}', modeSpec(mode).name()),
			icon: mode => modeSpec(mode).icon,
			dimmed: () => false,
		},
	];

	let settings = {muted: false, light: false, oled: false, pinned: false, translucent: true, window_mode: false, edge_mode: false};
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
	// Style od razu, gdy jest <html>: Facebook rysuje ekran ładowania (z własnym paskiem i suwakiem), zanim
	// dokument się wczyta, a bez tego pierwszy start wyglądał jak zwykła strona facebook.com.
	const addStyle = () => {
		if (document.documentElement && !style.isConnected) {
			document.documentElement.append(style);
		}
		return style.isConnected;
	};
	if (!addStyle()) {
		const observer = new MutationObserver(() => addStyle() && observer.disconnect());
		observer.observe(document, {childList: true});
	}

	// Facebook przechodzi między swoimi stronami bez przeładowania (np. klik w zdjęcie profilowe otwiera profil),
	// więc Messy (on_navigation w main.rs) tego nie widzi, a w panelu nie da się takiej strony przewinąć ani z niej
	// wyjść. Linki spoza Messengera otwieramy w przeglądarce (window.open idzie do on_new_window), a gdy strona
	// mimo to się zmieni, otwieramy ją w przeglądarce i wracamy do czatu.
	const IN_APP = /^\/(messages|login|checkpoint|two_step_verification|recover|auth_platform|privacy\/consent|messenger_media)(\/|$)|^\/$/;
	const outsideMessenger = url => /(^|\.)facebook\.com$/.test(url.hostname) && !IN_APP.test(url.pathname);
	document.addEventListener('click', event => {
		const link = event.target instanceof Element && event.target.closest('a[href]');
		if (!link || event.button !== 0) {
			return;
		}
		const url = new URL(link.href, location.href);
		if (outsideMessenger(url)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			window.open(url.href, '_blank');
		}
	}, true);
	let lastInApp = location.href;
	const checkLocation = () => {
		// W trakcie logowania Facebook przekierowuje po swojemu; tym zajmuje się on_navigation w main.rs.
		if (!outsideMessenger(location) || !new URL(lastInApp).pathname.startsWith('/messages')) {
			lastInApp = location.href;
			return;
		}
		window.open(location.href, '_blank');
		history.replaceState(history.state, '', lastInApp);
		location.replace(lastInApp);
	};
	for (const method of ['pushState', 'replaceState']) {
		const original = history[method];
		history[method] = function (...args) {
			const result = original.apply(this, args);
			checkLocation();
			return result;
		};
	}
	window.addEventListener('popstate', checkLocation);

	function start() {
		addStyle();

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
			const on = spec.value ? spec.value() : settings[spec.key];
			button.setAttribute('aria-label', spec.label(on));
			button.title = spec.label(on);
			if (spec.menu) {
				button.setAttribute('aria-haspopup', 'menu');
			}
			const path = button.querySelector('path');
			path.setAttribute('d', spec.icon(on));
			path.setAttribute('fill-rule', 'evenodd');
			button.style.opacity = spec.dimmed(on) ? '0.55' : '';
		}

		// Klik w przycisk Messy: menu trybów albo przełączenie ustawienia.
		function onButtonClick(button, spec) {
			button.addEventListener('click', async event => {
				event.preventDefault();
				event.stopPropagation();
				if (spec.menu) {
					openModeMenu(button);
				} else {
					await window.messy.setSetting(spec.key, !settings[spec.key]);
				}
			});
		}

		// Menu trybów pod przyciskiem, w stylu menu Messengera. Wybór od razu przełącza tryb.
		const MODE_MENU_ID = 'messy-mode-menu';
		function closeModeMenu() {
			document.getElementById(MODE_MENU_ID)?.remove();
			document.removeEventListener('pointerdown', onPointerOutside, true);
			document.removeEventListener('keydown', onMenuKey, true);
			window.removeEventListener('blur', closeModeMenu);
		}
		function onPointerOutside(event) {
			if (!event.target.closest?.(`#${MODE_MENU_ID}, [aria-haspopup="menu"]`)) {
				closeModeMenu();
			}
		}
		function onMenuKey(event) {
			const items = [...document.querySelectorAll(`#${MODE_MENU_ID} [role^="menuitem"]`)];
			const index = items.indexOf(document.activeElement);
			if (event.key === 'Escape') {
				// Esc zamyka samo menu, nie chowa okna.
				closeModeMenu();
			} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				items.at((index + (event.key === 'ArrowDown' ? 1 : -1)) % items.length)?.focus();
			} else if (event.key === 'Tab') {
				closeModeMenu();
				return;
			} else {
				return;
			}
			event.preventDefault();
			event.stopImmediatePropagation();
		}
		const svgIcon = (path, size) => `<svg viewBox="0 0 20 20" width="${size}" height="${size}" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="${path}"></path></svg>`;
		function openModeMenu(anchor) {
			if (document.getElementById(MODE_MENU_ID)) {
				closeModeMenu();
				return;
			}
			const mode = currentMode();
			const menu = document.createElement('div');
			menu.id = MODE_MENU_ID;
			menu.setAttribute('role', 'menu');
			for (const spec of MODES) {
				const item = document.createElement('button');
				item.type = 'button';
				item.setAttribute('role', 'menuitemradio');
				item.setAttribute('aria-checked', String(spec.mode === mode));
				item.innerHTML = `<span class="messy-mode-icon">${svgIcon(spec.icon, 20)}</span><span class="messy-mode-text"><b></b><small></small></span>`
					+ `<span class="messy-mode-check">${spec.mode === mode ? svgIcon(CHECK, 16) : ''}</span>`;
				item.querySelector('b').textContent = spec.name();
				item.querySelector('small').textContent = spec.hint();
				item.addEventListener('click', () => {
					closeModeMenu();
					if (spec.mode !== mode) {
						window.messy.setMode(spec.mode);
					}
				});
				menu.append(item);
			}
			// Przezroczystość dotyczy tylko trybu swobodnego.
			if (mode === 'free') {
				const item = document.createElement('button');
				item.type = 'button';
				item.className = 'messy-mode-option';
				item.setAttribute('role', 'menuitemcheckbox');
				item.setAttribute('aria-checked', String(settings.translucent));
				item.innerHTML = `<span class="messy-mode-check">${settings.translucent ? svgIcon(CHECK, 16) : ''}</span><span></span>`;
				item.lastChild.textContent = strings.translucent;
				item.addEventListener('click', () => {
					closeModeMenu();
					window.messy.setSetting('translucent', !settings.translucent);
				});
				menu.append(item);
			}
			document.body.append(menu);
			// Pod przyciskiem, wyrównane do jego prawej krawędzi; bez miejsca pod spodem nad przyciskiem.
			const rect = anchor.getBoundingClientRect();
			const width = menu.offsetWidth;
			const height = menu.offsetHeight;
			const left = Math.min(Math.max(8, rect.right - width), innerWidth - width - 8);
			const top = rect.bottom + 6 + height <= innerHeight - 8 ? rect.bottom + 6 : Math.max(8, rect.top - 6 - height);
			menu.style.left = `${left}px`;
			menu.style.top = `${top}px`;
			document.addEventListener('pointerdown', onPointerOutside, true);
			document.addEventListener('keydown', onMenuKey, true);
			window.addEventListener('blur', closeModeMenu);
			menu.querySelector('[aria-checked="true"]')?.focus();
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

				onButtonClick(button, spec);
				render(button, spec);
				cell.before(clone);
			}
		}

		// Przycisk trybu także w nagłówku otwartej rozmowy, przed przyciskiem informacji (ostatni po prawej
		// przycisk nagłówka z aria-expanded bez aria-controls; etykiety zależą od języka, więc ich nie czytamy).

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
		// Przyciski Messy w nagłówku rozmowy, przed przyciskiem informacji: tylko wtedy, gdy nagłówka „Czaty” nie widać
		// (wąskie okno), i tyle, ile zmieści się obok tytułu. Tryb ma pierwszeństwo, potem wyciszenie i motyw.
		const THREAD_EXTRA = ['light', 'muted', 'mode'];
		function threadKeys(info) {
			const keys = [];
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
				button.id = 'messy-thread-' + key;
				button.dataset.messyKey = key;
				button.removeAttribute('aria-expanded');
				const svg = button.querySelector('svg');
				if (svg) {
					svg.setAttribute('viewBox', '0 0 36 36');
					svg.innerHTML = '<g transform="translate(18,18)scale(1.35)translate(-10,-10)"><path fill="var(--mwp-header-button-color)"></path></g>';
				}
				onButtonClick(button, spec);
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

		// Tryb krawędzi: wąski pasek po stronie zwróconej do środka ekranu, widoczny gdy okno jest schowane.
		// Pokazuje liczbę nieprzeczytanych i miga, gdy przybywa nowych.
		const STRIP_ID = 'messy-edge-strip';
		let edgeState = {edge: null, expanded: true};
		function renderStrip() {
			let strip = document.getElementById(STRIP_ID);
			// Schowane okno: strona znika (okno jest przezroczyste), zostaje sama zakładka.
			document.documentElement.classList.toggle('messy-edge-collapsed', Boolean(edgeState.edge && !edgeState.expanded));
			if (!edgeState.edge) {
				strip?.remove();
				return;
			}
			if (!strip) {
				strip = document.createElement('div');
				strip.id = STRIP_ID;
				strip.innerHTML = '<div class="messy-edge-grip"></div><div class="messy-edge-badge"></div>';
				strip.addEventListener('animationend', () => strip.classList.remove('blink'));
				document.body.append(strip);
			}
			strip.dataset.edge = edgeState.edge;
			strip.classList.toggle('messy-edge-shown', !edgeState.expanded);
			const badge = strip.querySelector('.messy-edge-badge');
			badge.textContent = lastUnread > 99 ? '99+' : String(lastUnread);
			badge.hidden = lastUnread === 0;
		}
		window.messy.onEdgeState(value => {
			edgeState = value;
			renderStrip();
		});
		let stripUnread = 0;
		setInterval(() => {
			if (lastUnread > stripUnread && edgeState.edge && !edgeState.expanded) {
				const strip = document.getElementById(STRIP_ID);
				if (strip) {
					strip.classList.remove('blink');
					void strip.offsetWidth;
					strip.classList.add('blink');
				}
			}
			if (lastUnread !== stripUnread) {
				stripUnread = lastUnread;
				renderStrip();
			}
		}, 500);

		// Facebook odrzuca programy, skrypty i inne nietypowe pliki. Wszystkiemu spoza listy zwykłych typów (zdjęcia,
		// filmy, muzyka, dokumenty; archiwa Facebook też odrzuca) dopisujemy „.txt” (setup.exe → setup.exe.txt), jak robi się to ręcznie:
		// odbiorca widzi pełną nazwę i sam zmienia ją z powrotem.
		const REGULAR_FILE = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|svg|mp4|mov|m4v|webm|avi|mkv|3gp|mp3|m4a|aac|wav|ogg|opus|flac|pdf|txt|md|csv|json|xml|log|docx?|xlsx?|pptx?|odt|ods|odp|rtf)$/i;
		const blocked = file => !REGULAR_FILE.test(file.name);
		// Pliki ponad limit Messengera nie trafiają do Facebooka: okienko pyta, czy wysłać je przez Gofile
		// (src-tauri/src/upload.rs) i wkleić link do pola wiadomości.
		const SIZE_LIMIT = 100 * 1024 * 1024;
		// Dzieli pliki: te do Facebooka (z „.txt” tam, gdzie trzeba) i za duże. changed: trzeba podmienić listę.
		const sortFiles = files => {
			const transfer = new DataTransfer();
			const big = [];
			let changed = false;
			for (const file of files) {
				if (file.size > SIZE_LIMIT) {
					big.push(file);
					changed = true;
				} else if (blocked(file)) {
					transfer.items.add(new File([file], `${file.name}.txt`, {type: 'text/plain', lastModified: file.lastModified}));
					changed = true;
				} else {
					transfer.items.add(file);
				}
			}
			return {transfer, big, changed};
		};
		// Upuszczony plik: zatrzymujemy oryginalne zdarzenie i puszczamy to samo z przemianowanymi plikami.
		window.addEventListener('drop', event => {
			if (!event.isTrusted || !event.dataTransfer?.files.length) {
				return;
			}
			const {transfer, big, changed} = sortFiles(event.dataTransfer.files);
			if (!changed) {
				return;
			}
			event.preventDefault();
			event.stopImmediatePropagation();
			// Bez plików do Facebooka też puszczamy (puste) upuszczenie, bo inaczej jego nakładka „Upuść pliki tutaj” zostaje na ekranie.
			event.target.dispatchEvent(new DragEvent('drop', {dataTransfer: transfer, bubbles: true, cancelable: true, composed: true, clientX: event.clientX, clientY: event.clientY}));
			offerUpload(big);
		}, true);
		// Plik wybrany przyciskiem „Dołącz”: podmieniamy listę, zanim zobaczy ją Facebook.
		window.addEventListener('change', event => {
			const input = event.target;
			if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.files?.length) {
				return;
			}
			const {transfer, big, changed} = sortFiles(input.files);
			if (!changed) {
				return;
			}
			if (transfer.files.length) {
				input.files = transfer.files;
			} else {
				event.stopImmediatePropagation();
				input.value = '';
			}
			offerUpload(big);
		}, true);

		const formatSize = bytes => bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
		const fillText = (text, values) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
		const uploadQueue = [];
		let uploadDialog = null;
		const offerUpload = files => {
			uploadQueue.push(...files);
			if (uploadDialog) {
				showQueue();
			} else {
				showNextUpload();
			}
		};
		// Kilka dużych plików idzie po kolei (Messy trzyma jeden naraz); karta pokazuje, ile czeka.
		const showQueue = () => {
			const queue = uploadDialog?.querySelector('.messy-upload-queue');
			if (queue) {
				queue.textContent = uploadQueue.length ? fillText(strings.uploadQueue, {count: uploadQueue.length}) : '';
			}
			uploadDialog?.querySelector('.messy-upload-waiting')?.toggleAttribute('hidden', !sendWhenDone);
		};

		// Wysłanie wiadomości (Enter albo przycisk) w trakcie wysyłania plików czeka, aż wszystkie linki trafią
		// do pola; wtedy Messy sam klika „wyślij” i tekst idzie razem z linkami.
		let uploading = false;
		let sendWhenDone = false;
		// Przycisk wysyłania Messengera ma w opisie „Enter” („Naciśnij Enter, aby wysłać” / „Press enter to send”).
		const findSendButton = () => [...document.querySelectorAll('[role="button"][aria-label]')].find(button => /enter/i.test(button.getAttribute('aria-label')));
		const holdSend = event => {
			event.preventDefault();
			event.stopImmediatePropagation();
			sendWhenDone = true;
			showQueue();
		};
		document.addEventListener('keydown', event => {
			if (uploading && event.key === 'Enter' && !event.shiftKey && event.target instanceof HTMLElement && event.target.closest('[role="textbox"][contenteditable="true"]')) {
				holdSend(event);
			}
		}, true);
		document.addEventListener('click', event => {
			if (uploading && event.isTrusted && event.target instanceof Element && event.target.closest('[role="button"]') === findSendButton()) {
				holdSend(event);
			}
		}, true);
		const sendHeldMessage = () => {
			if (!sendWhenDone) {
				return;
			}
			sendWhenDone = false;
			// Chwila, żeby Messenger zauważył wklejony tekst i pokazał przycisk wysyłania.
			setTimeout(() => findSendButton()?.click(), 150);
		};
		window.messy.onUploadProgress(percent => {
			const bar = uploadDialog?.querySelector('.messy-upload-bar > div');
			if (bar) {
				bar.style.width = `${percent}%`;
				uploadDialog.querySelector('.messy-upload-text').textContent = fillText(strings.uploadProgress, {percent});
			}
		});
		// Do pola wiadomości trafia nazwa, rozmiar i link; wysyłasz to sam (Enter), jak zwykłą wiadomość.
		const pasteLink = (file, link) => {
			const composer = document.querySelector('[role="textbox"][contenteditable="true"]');
			if (composer) {
				composer.focus();
				document.execCommand('insertText', false, `${file.name} (${formatSize(file.size)}): ${link} `);
			}
		};
		// Karta nad polem wiadomości, bez zasłaniania rozmowy: można dalej pisać i przewijać, także w trakcie wysyłania.
		const FILE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 1.5V9h5.5L13 3.5Z"/></svg>';
		function showNextUpload() {
			uploadDialog?.remove();
			uploadDialog = null;
			const file = uploadQueue.shift();
			if (!file || !strings) {
				uploading = false;
				sendHeldMessage();
				return;
			}
			const card = document.createElement('div');
			card.id = 'messy-upload';
			card.setAttribute('role', 'status');
			card.innerHTML = `<div class="messy-upload-icon">${FILE_ICON}</div>`
				+ '<div class="messy-upload-body"><div class="messy-upload-name"><span></span><small></small><em class="messy-upload-queue"></em></div>'
				+ '<div class="messy-upload-waiting" hidden></div>'
				+ '<div class="messy-upload-text"></div><div class="messy-upload-bar" hidden><div></div></div>'
				+ '<label class="messy-upload-dont-ask"><input type="checkbox" id="messy-upload-dont-ask"> <span></span></label></div>'
				+ '<div class="messy-upload-buttons"><button type="button" class="messy-upload-cancel"></button>'
				+ '<button type="button" class="messy-upload-send"></button></div>';
			const text = card.querySelector('.messy-upload-text');
			const bar = card.querySelector('.messy-upload-bar');
			const cancel = card.querySelector('.messy-upload-cancel');
			const send = card.querySelector('.messy-upload-send');
			const dontAsk = card.querySelector('.messy-upload-dont-ask');
			card.querySelector('.messy-upload-name span').textContent = file.name;
			card.querySelector('.messy-upload-name span').title = file.name;
			card.querySelector('.messy-upload-name small').textContent = formatSize(file.size);
			dontAsk.querySelector('span').textContent = strings.uploadDontAsk;
			card.querySelector('.messy-upload-waiting').textContent = strings.uploadWaiting;
			text.textContent = strings.uploadTooBig;
			cancel.textContent = strings.uploadCancel;
			send.textContent = strings.uploadSend;
			cancel.addEventListener('click', showNextUpload);
			const start = async () => {
				// „Nie pytaj więcej” zapisuje ustawienie; wyłącza się je w menu ikony.
				if (dontAsk.querySelector('input').checked) {
					window.messy.setSetting('auto_upload', true);
				}
				uploading = true;
				dontAsk.hidden = true;
				send.hidden = true;
				cancel.hidden = true;
				bar.hidden = false;
				text.textContent = fillText(strings.uploadProgress, {percent: 0});
				try {
					pasteLink(file, await window.messy.uploadFile(file));
					showNextUpload();
				} catch (error) {
					// Wstrzymana wiadomość wyjdzie po zamknięciu karty z błędem (bez tego linku).
					uploading = false;
					bar.hidden = true;
					card.classList.add('messy-upload-failed');
					text.textContent = fillText(strings.uploadError, {error: String(error)});
					cancel.textContent = strings.uploadClose;
					cancel.hidden = false;
				}
			};
			send.addEventListener('click', start);
			document.body.append(card);
			uploadDialog = card;
			showQueue();
			if (settings.auto_upload) {
				start();
			}
		}

		// Piszesz w polu tekstowym: okno przy krawędzi nie chowa się po zjechaniu kursorem.
		const isEditable = element => element instanceof HTMLElement && (element.isContentEditable || /^(INPUT|TEXTAREA)$/.test(element.tagName));
		document.addEventListener('focusin', event => {
			if (isEditable(event.target)) {
				window.messy.setTyping(true);
			}
		});
		document.addEventListener('focusout', event => {
			if (isEditable(event.target)) {
				window.messy.setTyping(false);
			}
		});

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
