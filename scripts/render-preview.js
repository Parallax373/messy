// Renderuje docs/preview.png: makietę panelu Messy nad zasobnikiem, z wymyślonymi rozmowami
// (bez prawdziwych danych). Uruchamiać przez `npm run preview`.
const fs = require('node:fs');
const path = require('node:path');
const screenshot = require('./screenshot');

const root = path.join(__dirname, '..');
const icon = svg => `data:image/svg+xml;base64,${Buffer.from(fs.readFileSync(path.join(root, 'assets', svg))).toString('base64')}`;
const avatar = (hue, letter) => `<div class="av" style="background:hsl(${hue} 55% 45%)">${letter}</div>`;
const chats = [
	[210, 'A', 'Ania Nowak', 'Widzimy się o 18? 🍕', '2 min', true],
	[30, 'K', 'Kuba', 'Ty: wysłałem pliki', '15 min', false],
	[280, 'W', 'Wyjazd w góry', 'Ola: biorę namiot', '1 godz.', true],
	[150, 'M', 'Mama', 'Zadzwoń jak będziesz mógł', '3 godz.', false],
	[0, 'P', 'Piotr', 'Reakcja ❤️ na Twoją wiadomość', '5 godz.', false],
	[60, 'D', 'Drużyna', 'Marek: trening przeniesiony', '1 dzień', false],
];

const html = `<html><head><meta charset="utf-8"><style>
	* { box-sizing: border-box; }
	body { margin: 0; width: 1200px; height: 760px; font-family: 'Segoe UI', sans-serif; color: #e4e6eb;
		background: radial-gradient(1200px 700px at 30% 20%, #2a3b63, #0d1220 70%); position: relative; overflow: hidden; }
	.panel { position: absolute; right: 120px; bottom: 64px; width: 400px; height: 600px; background: #000;
		border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,.6); overflow: hidden; border: 1px solid #222; }
	.head { display: flex; align-items: center; padding: 16px 16px 8px; }
	.head h1 { font-size: 24px; margin: 0; flex: 1; font-weight: 700; }
	.btn { width: 36px; height: 36px; border-radius: 50%; background: #1c1c1c; display: grid; place-items: center; margin-left: 8px; }
	.btn svg { width: 20px; height: 20px; fill: #e4e6eb; }
	.btn.on svg { fill: #e4e6eb; } .btn.dim { opacity: .55; }
	.search { margin: 8px 16px; background: #121212; border-radius: 20px; padding: 9px 14px; color: #8a8d91; font-size: 15px; }
	.tabs { display: flex; gap: 8px; padding: 6px 16px 10px; font-size: 15px; font-weight: 600; }
	.tabs span { padding: 7px 12px; border-radius: 18px; color: #b0b3b8; } .tabs .sel { background: #1d2b45; color: #4599ff; }
	.row { display: flex; align-items: center; padding: 8px 16px; }
	.av { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; font-size: 22px; font-weight: 700; color: #fff; flex: none; }
	.txt { margin-left: 12px; flex: 1; min-width: 0; }
	.name { font-size: 15px; font-weight: 500; } .prev { font-size: 13px; color: #b0b3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.unread .name, .unread .prev { font-weight: 700; color: #e4e6eb; }
	.dot { width: 12px; height: 12px; border-radius: 50%; background: #0866ff; margin-left: 8px; }
	.taskbar { position: absolute; left: 0; right: 0; bottom: 0; height: 48px; background: rgba(28,28,30,.92); display: flex; align-items: center; justify-content: flex-end; padding-right: 24px; gap: 18px; font-size: 13px; }
	.taskbar img { width: 24px; height: 24px; }
	.clock { text-align: right; line-height: 1.25; }
</style></head><body>
	<div class="panel">
		<div class="head"><h1>Czaty</h1>
			<div class="btn"><svg viewBox="0 0 20 20"><path d="M8.2 2.1a.75.75 0 0 1 .17.83A6.25 6.25 0 0 0 17.07 11.6a.75.75 0 0 1 1 .9A8 8 0 1 1 7.5 1.93a.75.75 0 0 1 .7.17z"/></svg></div>
			<div class="btn"><svg viewBox="0 0 20 20"><path d="M10 2a5.5 5.5 0 0 0-5.5 5.5v2.74l-1.4 2.8A1 1 0 0 0 4 14.5h12a1 1 0 0 0 .9-1.46l-1.4-2.8V7.5A5.5 5.5 0 0 0 10 2zm-2.45 13.75a2.5 2.5 0 0 0 4.9 0h-4.9z"/></svg></div>
			<div class="btn"><svg viewBox="0 0 20 20"><path d="M2.25 10a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0zM10 8.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5zm6 0a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5z"/></svg></div>
		</div>
		<div class="search">Szukaj w Messengerze</div>
		<div class="tabs"><span class="sel">Wszystkie</span><span>Nieprzeczytane</span><span>Grupy</span></div>
		${chats.map(([hue, letter, name, preview, time, unread]) => `
			<div class="row ${unread ? 'unread' : ''}">${avatar(hue, letter)}
				<div class="txt"><div class="name">${name}</div><div class="prev">${preview} · ${time}</div></div>
				${unread ? '<div class="dot"></div>' : ''}
			</div>`).join('')}
	</div>
	<div class="taskbar"><span>^</span><img src="${icon('icon-unread.svg')}"><span>POL</span><div class="clock">18:42<br>22.10.2026</div></div>
</body></html>`;

fs.mkdirSync(path.join(root, 'docs'), {recursive: true});
screenshot(html, path.join(root, 'docs', 'preview.png'), 1200, 760);
