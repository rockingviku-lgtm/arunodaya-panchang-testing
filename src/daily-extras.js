// आज की कुंडली (D1), ग्रह स्थिति, चंद्र कला, चौघड़िया और होरा: हर दिन अपने-आप, स्थान GPS से।
// मौजूदा timing-item / timing-icon क्लास इस्तेमाल होती हैं; बाकी स्टाइल inline है (नई CSS नहीं)।
import { DEFAULT_PLACE, todayIST, shiftDate } from './festival-calendar.js';
import { grahaPositions, ascendantSidereal, moonPhase, chaughadiya, horas, RASHI_HI, GRAHA_ORDER } from './graha-engine.js';

const TZ = 'Asia/Kolkata';
const STORE = 'arunodaya.place';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = d => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }).format(d);
const stamp = d => new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(d) + ', ' + clock(d);
const dms = x => { const d = Math.floor(x), m = Math.floor((x - d) * 60); return `${d}°${String(m).padStart(2, '0')}′`; };

let place = DEFAULT_PLACE;
try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); if (s && isFinite(s.lat) && isFinite(s.lon)) place = s; } catch (e) { /* ignore */ }

// ---------- उत्तर भारतीय D1 चार्ट (SVG) ----------
const HOUSE_CENTER = [[150, 70], [75, 30], [30, 75], [70, 150], [30, 225], [75, 270], [150, 230], [225, 270], [270, 225], [230, 150], [270, 75], [225, 30]];

function chartSvg(lagnaSign, pos) {
  const byHouse = Array.from({ length: 12 }, () => []);
  for (const g of GRAHA_ORDER) byHouse[(pos[g].sign - lagnaSign + 12) % 12].push(pos[g]);
  let t = '';
  for (let h = 0; h < 12; h++) {
    const [cx, cy] = HOUSE_CENTER[h];
    const sign = ((lagnaSign + h) % 12) + 1;
    t += `<text x="${cx}" y="${cy - 14}" font-size="10" text-anchor="middle" opacity=".55">${sign}</text>`;
    const items = byHouse[h].map(g => g.short + (g.retro && g.key !== 'rahu' && g.key !== 'ketu' ? '(व)' : ''));
    const rows = [];
    for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3).join(' '));
    rows.forEach((r, i) => { t += `<text x="${cx}" y="${cy + 2 + i * 14}" font-size="12" font-weight="700" text-anchor="middle">${esc(r)}</text>`; });
  }
  return `<svg viewBox="0 0 300 300" width="100%" style="max-width:340px;display:block;margin:6px auto" role="img" aria-label="D1 कुंडली">
    <polygon points="150,0 225,75 150,150 75,75" fill="currentColor" fill-opacity=".07"/>
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-opacity=".7">
      <rect x="1" y="1" width="298" height="298"/><line x1="0" y1="0" x2="300" y2="300"/><line x1="300" y1="0" x2="0" y2="300"/>
      <polygon points="150,0 300,150 150,300 0,150"/>
    </g>${t}</svg>`;
}

// ---------- पंक्तियाँ ----------
const sec = title => `<p style="margin:16px 0 6px"><b>${esc(title)}</b></p>`;
const row = (icon, title, sub, hl) => `
  <div class="timing-item" style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;margin:6px 0;border:1px solid rgba(128,128,128,.28);border-radius:12px;${hl ? 'outline:2px solid #e0771f;outline-offset:-2px;' : ''}">
    <span class="timing-icon" style="flex:0 0 auto;width:24px;text-align:center;line-height:1.4">${icon}</span>
    <div style="text-align:left;flex:1;min-width:0"><b style="display:block;font-size:.95em">${esc(title)}</b>${sub ? `<small style="display:block;line-height:1.6">${sub}</small>` : ''}</div>
  </div>`;

function render(container) {
  const now = new Date();
  const ms = now.getTime();
  const today = todayIST();
  const pos = grahaPositions(ms);
  const asc = ascendantSidereal(ms, place.lat, place.lon);
  const lagnaSign = Math.floor(asc / 30);
  const ph = moonPhase(ms);

  let ch = { day: [], night: [] }, prevNight = [], hr = [], prevHr = [];
  try {
    ch = chaughadiya(today, place); prevNight = chaughadiya(shiftDate(today, -1), place).night;
    hr = horas(today, place); prevHr = horas(shiftDate(today, -1), place).slice(12);
  } catch (e) { console.error(e); }
  const inRange = x => ms >= x.start.getTime() && ms < x.end.getTime();
  const curCh = [...prevNight, ...ch.day, ...ch.night].find(inRange);
  const curHr = [...prevHr, ...hr].find(inRange);

  let h = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
    <small>${esc(place.name)} · ${esc(stamp(now))} IST</small>
    <button id="extras-gps" type="button" style="font:inherit;font-size:.8em;padding:4px 10px;cursor:pointer">📍 मेरी लोकेशन</button></div>`;

  h += sec('आज की कुंडली (D1) · लग्न ' + RASHI_HI[lagnaSign] + ' ' + dms(asc % 30));
  h += chartSvg(lagnaSign, pos);
  h += '<small style="display:block;text-align:center;opacity:.7">संख्या = राशि (1 मेष … 12 मीन) · (व) = वक्री · उत्तर भारतीय शैली</small>';

  h += sec('ग्रह स्थिति (निरयण · लाहिरी)');
  h += GRAHA_ORDER.map(k => {
    const g = pos[k];
    return row('◉', `${g.name}${g.retro ? ' (वक्री)' : ''}`, `${esc(g.rashi)} ${dms(g.deg)} · ${esc(g.nakshatra)} पद ${g.pada}`);
  }).join('');

  h += sec('चंद्र कला');
  h += row('🌓', `${ph.illumination.toFixed(0)}% प्रकाशित`, `${esc(ph.paksha)} · दिन ${ph.pakshaDay}/15`);

  if (ch.day.length) {
    h += sec('चौघड़िया' + (curCh ? ' · अभी: ' + curCh.name : ''));
    const list = (title, arr) => `<p style="margin:8px 0 4px;opacity:.75"><small>${title}</small></p>` + arr.map(c =>
      row(c.good ? '🟢' : '🔴', c.name, `${clock(c.start)} – ${clock(c.end)}`, c === curCh)).join('');
    h += list('दिन', ch.day) + list('रात', ch.night);
  }
  if (hr.length) {
    h += sec('होरा' + (curHr ? ' · अभी: ' + curHr.lord : ''));
    h += `<details><summary style="cursor:pointer"><small>24 घंटे की होरा सूची दिखाएँ</small></summary>` +
      hr.map(x => row(x.night ? '🌙' : '☀️', x.lord + ' होरा', `${clock(x.start)} – ${clock(x.end)}`, x === curHr)).join('') + '</details>';
  }
  container.innerHTML = h;
  const btn = container.querySelector('#extras-gps');
  if (btn) btn.onclick = () => locate(container, true);
}

// ---------- स्थान: GPS अनुमति मिलते ही उसी स्थान की कुंडली ----------
function locate(container, userAsked) {
  if (!navigator.geolocation) { if (userAsked) alert('इस ब्राउज़र में GPS उपलब्ध नहीं है।'); return; }
  navigator.geolocation.getCurrentPosition(p => {
    place = { name: `आपकी लोकेशन (${p.coords.latitude.toFixed(2)}°, ${p.coords.longitude.toFixed(2)}°)`, lat: p.coords.latitude, lon: p.coords.longitude };
    try { localStorage.setItem(STORE, JSON.stringify(place)); } catch (e) { /* ignore */ }
    render(container);
  }, () => { if (userAsked) alert('GPS स्थान नहीं मिल सका। ब्राउज़र में लोकेशन की अनुमति दें।'); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
}

export function mountDailyExtras(container) {
  if (!container) return;
  try { render(container); } catch (e) { console.error('Daily extras failed:', e); container.innerHTML = '<p>कुंडली और ग्रह स्थिति लोड नहीं हो सकी।</p>'; return; }
  // अनुमति पहले से मिली हो तो तुरंत; बाद में मिले तो मिलते ही बदल जाए
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(st => {
      if (st.state === 'granted') locate(container, false);
      st.onchange = () => { if (st.state === 'granted') locate(container, false); };
    }).catch(() => {});
  }
  setInterval(() => { try { render(container); } catch (e) { console.error(e); } }, 60000); // हर मिनट: अभी का लग्न/चौघड़िया/होरा और तारीख़ बदलना
}
