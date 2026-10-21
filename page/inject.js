// Wstrzykiwane do strony facebook.com/messages: przyciski trybu OLED i wyciszenia obok „…”
// w nagłówku „Czaty” oraz klasa trybu OLED na <html> (same kolory są w CSS wstrzykiwanym przez główny proces).
(() => {
	if (window.__messyInjected) {
		return;
	}

	window.__messyInjected = true;

	const BELL = 'M10 2a5.5 5.5 0 0 0-5.5 5.5v2.74l-1.4 2.8A1 1 0 0 0 4 14.5h12a1 1 0 0 0 .9-1.46l-1.4-2.8V7.5A5.5 5.5 0 0 0 10 2zm-2.45 13.75a2.5 2.5 0 0 0 4.9 0h-4.9z';
	const BELL_OFF = 'M2.22 2.22a.75.75 0 0 1 1.06 0l14.5 14.5a.75.75 0 1 1-1.06 1.06l-2.22-2.22H4a1 1 0 0 1-.9-1.46l1.4-2.8V7.5c0-.86.2-1.68.55-2.4L2.22 3.28a.75.75 0 0 1 0-1.06zM10 2a5.5 5.5 0 0 1 5.5 5.5v2.74l1.03 2.06L7.2 2.97A5.48 5.48 0 0 1 10 2zm-2.45 13.75a2.5 2.5 0 0 0 4.9 0h-4.9z';
	const MOON = 'M8.2 2.1a.75.75 0 0 1 .17.83A6.25 6.25 0 0 0 17.07 11.6a.75.75 0 0 1 1 .9A8 8 0 1 1 7.5 1.93a.75.75 0 0 1 .7.17z';

	// Przyciski w kolejności od lewej; każdy przełącza jedno ustawienie.
	const BUTTONS = [
		{
			id: 'messy-oled-button',
			key: 'oled',
			label: on => on ? 'Wyłącz tryb OLED' : 'Włącz tryb OLED',
			icon: () => MOON,
			dimmed: on => !on,
		},
		{
			id: 'messy-mute-button',
			key: 'muted',
			label: on => on ? 'Włącz powiadomienia' : 'Wycisz powiadomienia',
			icon: on => on ? BELL_OFF : BELL,
			dimmed: on => on,
		},
	];

	let settings = {muted: false, oled: false};

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
	}

	function ensureButtons() {
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

	// Liczba w tytule („(3) Messenger | Facebook”) to suma nieprzeczytanych wiadomości i powiadomień
	// Facebooka (dzwonek). Odejmujemy dzwonek, którego licznik jest jedyną etykietą z liczbą w ukrytym pasku.
	let lastUnread = -1;
	function reportUnread() {
		const title = /^\((\d+)\)/.exec(document.title);
		const total = title ? Number(title[1]) : 0;
		let notifications = 0;
		for (const element of document.querySelectorAll('[role="banner"] [aria-label]')) {
			const match = /\d+/.exec(element.getAttribute('aria-label'));
			if (match) {
				notifications = Number(match[0]);
				break;
			}
		}

		const unread = Math.max(0, total - notifications);
		if (unread !== lastUnread) {
			lastUnread = unread;
			window.messy.setUnread(unread);
		}
	}

	setInterval(reportUnread, 2000);
	reportUnread();

	window.messy.onSettingsChange(apply);

	window.messy.getSettings().then(value => {
		apply(value);
		ensureButtons();
	});

	// Facebook przebudowuje nagłówek przy nawigacji, więc przyciski dokładamy ponownie, gdy znikną.
	new MutationObserver(ensureButtons).observe(document.body, {childList: true, subtree: true});
})();
