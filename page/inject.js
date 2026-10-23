// Wstrzykiwane do strony facebook.com/messages: przyciski trybu OLED i wyciszenia obok „…”
// w nagłówku „Czaty” oraz klasa trybu OLED na <html> (same kolory są w page/style.css).
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
	const PIN = 'M12.6 2.2a.75.75 0 0 1 1.06 0l4.14 4.14a.75.75 0 0 1 0 1.06l-1.5 1.5a.75.75 0 0 1-.8.17l-2.6 2.6.3 2.84a.75.75 0 0 1-.21.6l-1.2 1.2a.75.75 0 0 1-1.06 0L7.5 13.06l-4.22 4.22a.75.75 0 0 1-1.06-1.06L6.44 12 3.2 8.76a.75.75 0 0 1 0-1.06l1.2-1.2a.75.75 0 0 1 .6-.22l2.85.3 2.6-2.6a.75.75 0 0 1 .17-.8l1.98-1.98z';

	// Przyciski w kolejności od lewej; każdy przełącza jedno ustawienie.
	const BUTTONS = [
		{
			id: 'messy-oled-button',
			key: 'oled',
			label: on => on ? strings.oledOn : strings.oledOff,
			icon: () => MOON,
			dimmed: on => !on,
		},
		{
			id: 'messy-mute-button',
			key: 'muted',
			label: on => on ? strings.muteOn : strings.muteOff,
			icon: on => on ? BELL_OFF : BELL,
			dimmed: on => on,
		},
		{
			id: 'messy-pin-button',
			key: 'pinned',
			label: on => on ? strings.pinOn : strings.pinOff,
			icon: () => PIN,
			dimmed: on => !on,
		},
	];

	let settings = {muted: false, oled: false, pinned: false};
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

		function render(button, spec) {
			const on = settings[spec.key];
			button.setAttribute('aria-label', spec.label(on));
			button.title = spec.label(on);
			button.querySelector('path').setAttribute('d', spec.icon(on));
			button.style.opacity = spec.dimmed(on) ? '0.55' : '';
		}

		function apply(value) {
			settings = value;
			document.documentElement.classList.toggle('messy-oled', settings.oled);
			for (const spec of BUTTONS) {
				const button = document.getElementById(spec.id);
				if (button) {
					render(button, spec);
				}
			}
			const threadPin = document.getElementById('messy-thread-pin');
			if (threadPin) {
				render(threadPin, BUTTONS.find(spec => spec.key === 'pinned'));
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
		const PIN_SPEC = BUTTONS.find(spec => spec.key === 'pinned');
		function ensureThreadPin() {
			const info =[...document.querySelectorAll('[role="button"][aria-expanded]:not([aria-controls])')]
				.filter(button => {
					const rect = button.getBoundingClientRect();
					return rect.width >= 28 && rect.width <= 48 && rect.top >= 0 && rect.top < 80;
				})
				.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left)[0];
			const existing = document.getElementById(THREAD_PIN_ID);
			if (!strings || !info || (existing && existing.isConnected && existing.getBoundingClientRect().width > 0)) {
				return;
			}
			existing?.closest('.messy-cell')?.remove();

			let cell = info;
			while (cell.parentElement && cell.parentElement.children.length < 2) {
				cell = cell.parentElement;
			}
			// Kopia przycisku informacji: ten sam wygląd i kolor motywu rozmowy, tylko ikona pinezki.
			const clone = cell.cloneNode(true);
			clone.classList.add('messy-cell');
			const button = clone.querySelector('[role="button"]') ?? clone;
			button.id = THREAD_PIN_ID;
			button.removeAttribute('aria-expanded');
			const svg = button.querySelector('svg');
			if (svg) {
				svg.setAttribute('viewBox', '0 0 36 36');
				svg.innerHTML = '<g transform="translate(18,18)scale(1.35)translate(-10,-10)"><path fill="var(--mwp-header-button-color)"></path></g>';
			}
			button.addEventListener('click', async event => {
				event.preventDefault();
				event.stopPropagation();
				await window.messy.setSetting('pinned', !settings.pinned);
			});
			render(button, PIN_SPEC);
			cell.before(clone);
		}
		new MutationObserver(ensureThreadPin).observe(document.body, {childList: true, subtree: true});

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

		new MutationObserver(ensureUpdateButton).observe(document.body, {childList: true, subtree: true});

		window.messy.onSettingsChange(apply);

		Promise.all([window.messy.getSettings(), window.messy.getStrings()]).then(([value, texts]) => {
			strings = texts;
			apply(value);
			ensureButtons();
			ensureUpdateButton();
		});

		// Facebook przebudowuje nagłówek przy nawigacji, więc przyciski dokładamy ponownie, gdy znikną.
		new MutationObserver(ensureButtons).observe(document.body, {childList: true, subtree: true});

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

		// Kursor nad panelem: przypięty panel ma wtedy pełne tło (update_opacity w main.rs).
		window.messy.onDim(on => document.documentElement.classList.toggle('messy-dim', on));
		// Po przeładowaniu strona nie zna stanu: zgłoszenie kursora sprawia, że Messy odeśle „dim”.
		window.messy.setHover(document.documentElement.matches(':hover'));
		document.documentElement.addEventListener('mouseenter', () => window.messy.setHover(true));
		document.documentElement.addEventListener('mouseleave', () => window.messy.setHover(false));

		// Podgląd zdjęć i filmów (/messenger_media) na pełnym ekranie, po zamknięciu z powrotem panel.
		let mediaOpen = false;
		new MutationObserver(() => {
			const open = location.pathname.startsWith('/messenger_media');
			if (open !== mediaOpen) {
				mediaOpen = open;
				window.messy.setFullscreen(open);
			}
		}).observe(document.body, {childList: true, subtree: true});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', start, {once: true});
	} else {
		start();
	}
})();
