// होम "डैशबोर्ड": दिन की समय-रेखा + कार्ड (पंचांग, कुंडली D1, ग्रह स्थिति, चंद्र कला, घटी घड़ी, त्योहार,
// राशिफल, चौघड़िया, होरा, आने वाली ग्रह-घटनाएँ)। हर दिन अपने-आप; स्थान डिफ़ॉल्ट Lucknow, GPS मिलते ही बदल जाता है।
// हर कार्ड के नीचे "और देखें →" (data-page) आपके मौजूदा main.js के पेज/सेक्शन खोलता है। नई CSS फ़ाइल की ज़रूरत नहीं।
import { DEFAULT_PLACE, todayIST, shiftDate, getPanchangDay, getDayTimes, getFestivalsForDate, getUpcomingFestivals, WEEKDAYS_HI } from './festival-calendar.js';
import { grahaPositions, ascendantSidereal, moonPhase, chaughadiya, horas, planetaryEvents, RASHI_HI, GRAHA_ORDER } from './graha-engine.js';
import { rashifal } from './rashifal.js';

const TZ = 'Asia/Kolkata';
const STORE = 'arunodaya.place';
const NAVY = 'var(--navy, #10264a)';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = d => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }).format(d);
const dayOf = d => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
const MON = ['जन॰', 'फ़र॰', 'मार्च', 'अप्रै॰', 'मई', 'जून', 'जुला॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰'];
const MONFULL = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const stamp = d => { const [y, m, dd] = dayOf(d).split('-').map(Number); return `${dd} ${MONFULL[m - 1]} ${y}, ${clock(d)}`; };
const dms = x => { const d = Math.floor(x), m = Math.floor((x - d) * 60); return `${d}°${String(m).padStart(2, '0')}′`; };
const shortDate = d => { const [, m, dd] = dayOf(d).split('-').map(Number); return `${dd} ${MON[m - 1]}, ${clock(d)}`; };
const wdOf = iso => WEEKDAYS_HI[new Date(`${iso}T12:00:00Z`).getUTCDay()];

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
    t += `<text x="${cx}" y="${cy - 14}" font-size="10" text-anchor="middle" opacity=".55">${((lagnaSign + h) % 12) + 1}</text>`;
    const items = byHouse[h].map(g => g.short + (g.retro && g.key !== 'rahu' && g.key !== 'ketu' ? '(व)' : ''));
    for (let i = 0; i < items.length; i += 3) t += `<text x="${cx}" y="${cy + 2 + (i / 3) * 14}" font-size="12" font-weight="700" text-anchor="middle">${esc(items.slice(i, i + 3).join(' '))}</text>`;
  }
  return `<svg viewBox="0 0 300 300" width="100%" style="max-width:300px;display:block;margin:6px auto;color:#1b2150" role="img" aria-label="D1 कुंडली">
    <polygon points="150,0 225,75 150,150 75,75" fill="#ffe3c4"/>
    <g fill="none" stroke="#1f2a5a" stroke-width="1.5"><rect x="1" y="1" width="298" height="298"/><line x1="0" y1="0" x2="300" y2="300"/><line x1="300" y1="0" x2="0" y2="300"/><polygon points="150,0 300,150 150,300 0,150"/></g>
    <g fill="#1b2150">${t}</g></svg>`;
}

// ---------- कार्ड / पंक्ति ----------
const ROW_BASE = 'display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start;gap:10px;padding:8px 10px;margin:6px 0;border:1px solid #e1e4ee;border-radius:12px;background:#fff;';
const row = (icon, title, sub, hl) => `
  <div class="timing-item" style="${ROW_BASE}${hl ? 'outline:2px solid #e0771f;outline-offset:-2px;' : ''}">
    <span class="timing-icon" style="flex:0 0 auto;width:24px;text-align:center;line-height:1.4">${icon}</span>
    <div style="text-align:left;flex:1;min-width:0"><b style="display:block;font-size:.95em">${esc(title)}</b>${sub ? `<small style="display:block;line-height:1.6;color:#4b5563">${sub}</small>` : ''}</div>
  </div>`;
const kv = (k, v, last) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;${last ? '' : 'border-bottom:1px solid #e7e9f3'}"><span style="color:#5b6283">${esc(k)}</span><b style="text-align:right">${v}</b></div>`;
const card = (title, body, more, right = '') => `
  <article style="flex:1 1 320px;min-width:0;background:#fff;border:1px solid #dce0ee;border-radius:16px;overflow:hidden;display:flex;flex-direction:column">
    <header style="background:${NAVY};color:#fff;padding:11px 16px;display:flex;justify-content:space-between;align-items:baseline;gap:8px"><h3 style="margin:0;font-size:1rem;color:#fff;line-height:1.4">${title}</h3>${right ? `<small style="opacity:.85;color:#fff">${right}</small>` : ''}</header>
    <div style="padding:6px 16px 10px;flex:1;min-width:0">${body}</div>
    ${more ? `<footer style="padding:9px 16px 13px;text-align:right;border-top:1px solid #e7e9f3"><button type="button" data-page="${more[0]}" style="background:none;border:0;padding:0;color:#b35a0e;font-weight:700;cursor:pointer;font:inherit;font-weight:700">${esc(more[1])} →</button></footer>` : ''}
  </article>`;

// ---------- समय-रेखा ----------
const TINTS = [['#dde2f7', '#c9d1f0'], ['#ffe3c4', '#ffd3a3'], ['#cfede6', '#b6e3d8'], ['#f5d6e6', '#ebbfd6']];
function timelineHtml(pd, dt) {
  const start = pd.start.getTime(), end = pd.end.getTime(), span = end - start;
  const pct = ms => Math.max(0, Math.min(100, ((ms - start) / span) * 100));
  const bar = (label, segs, tint) => {
    let from = 0, out = '';
    segs.forEach((s, i) => {
      const to = s.end ? pct(s.end.getTime()) : 100;
      if (to - from < 0.4) { from = to; return; }
      out += `<div style="position:absolute;left:${from}%;width:${to - from}%;top:0;bottom:0;background:${TINTS[tint][i % 2]};color:#1b2150;padding:0 6px;line-height:30px;font-size:13px;white-space:nowrap;overflow:hidden;${i === 0 ? 'border-radius:6px 0 0 6px;' : ''}${!s.end || to >= 99.9 ? 'border-radius:0 6px 6px 0;' : ''}">${esc(s.label)}${s.end ? ' · ' + clock(s.end) + ' तक' : ''}</div>`;
      from = to;
    });
    return `<div style="position:relative;height:30px"><span style="position:absolute;left:-78px;width:70px;text-align:right;line-height:30px;font-weight:700;font-size:13px">${label}</span>${out}</div>`;
  };
  const band = (name, w, c) => `<div title="${name} ${clock(w.start)}–${clock(w.end)}" style="position:absolute;left:${pct(w.start.getTime())}%;width:${pct(w.end.getTime()) - pct(w.start.getTime())}%;top:0;bottom:0;background:#ffd0cb;border:1px solid #c8473d;border-radius:6px;line-height:28px;font-size:12px;text-align:center;white-space:nowrap;overflow:hidden;color:#7a1f18">${c}</div>`;
  const sunset = pct(pd.sunset.getTime());
  return `<div style="overflow-x:auto;margin-top:10px"><div style="min-width:760px;position:relative;padding-left:78px">
    <div style="position:relative;height:22px;font-size:12px;color:#5b6283"><span style="position:absolute;left:0">${clock(pd.start)}</span><span style="position:absolute;left:${sunset}%;color:#b35a0e;font-weight:700;transform:translateX(-50%)">सूर्यास्त ${clock(pd.sunset)}</span><span style="position:absolute;right:0">${clock(pd.end)}</span></div>
    <div style="position:relative;display:flex;flex-direction:column;gap:6px">
      <div style="position:absolute;left:${sunset}%;top:-2px;bottom:-2px;width:2px;background:#e0771f;z-index:2"></div>
      ${bar('तिथि', pd.tithis, 0)}${bar('नक्षत्र', pd.nakshatras, 1)}${bar('योग', pd.yogas, 2)}${bar('करण', pd.karanas, 3)}
      <div style="position:relative;height:30px"><span style="position:absolute;left:-78px;width:70px;text-align:right;line-height:30px;font-weight:700;font-size:13px">अशुभ काल</span><div style="position:absolute;left:0;right:0;top:13px;height:4px;background:#e7e9f3;border-radius:2px"></div>${dt ? band('गुलिक काल', dt.gulika, 'गुलिक') + band('राहुकाल', dt.rahu, 'राहु') + band('यमगंड', dt.yama, 'यम') : ''}</div>
    </div></div></div>`;
}

// ---------- दिन में एक बार निकलने वाली गणनाएँ (कैश) ----------
const memo = { key: '', data: null };
function dayData(today) {
  const key = today + '|' + place.lat + '|' + place.lon;
  if (memo.key === key && memo.data) return memo.data;
  const d = {};
  try { d.pd = getPanchangDay(today, place); } catch (e) { console.error(e); }
  try { d.dt = getDayTimes(today, place); } catch (e) { console.error(e); }
  try { d.todayFest = getFestivalsForDate(today, place); d.upcoming = getUpcomingFestivals(today, 30, place); } catch (e) { console.error(e); d.todayFest = []; d.upcoming = []; }
  try { d.rashi = rashifal('day', today).signs; } catch (e) { console.error(e); d.rashi = []; }
  memo.key = key; memo.data = d;
  return d;
}
let evMemo = { hour: -1, list: [] };
function eventsNow(ms) {
  const hour = Math.floor(ms / 3600000);
  if (evMemo.hour !== hour) { try { evMemo = { hour, list: planetaryEvents(ms, 60, 8) }; } catch (e) { console.error(e); evMemo = { hour, list: [] }; } }
  return evMemo.list;
}

function render(container) {
  const now = new Date(), ms = now.getTime(), today = todayIST();
  const D = dayData(today), pd = D.pd, dt = D.dt;
  const pos = grahaPositions(ms), asc = ascendantSidereal(ms, place.lat, place.lon), lagnaSign = Math.floor(asc / 30), ph = moonPhase(ms);

  let ch = { day: [], night: [] }, prevNight = [], hr = [], prevHr = [];
  try { ch = chaughadiya(today, place); prevNight = chaughadiya(shiftDate(today, -1), place).night; hr = horas(today, place); prevHr = horas(shiftDate(today, -1), place).slice(12); } catch (e) { console.error(e); }
  const inRange = x => ms >= x.start.getTime() && ms < x.end.getTime();
  const curCh = [...prevNight, ...ch.day, ...ch.night].find(inRange), curHr = [...prevHr, ...hr].find(inRange);

  let h = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
    <small>${esc(place.name)} · ${esc(stamp(now))} IST</small>
    <button id="extras-gps" type="button" style="font:inherit;font-size:.8em;padding:6px 12px;cursor:pointer">📍 मेरी लोकेशन</button></div>`;

  // समय-रेखा
  if (pd) h += `<section style="background:#fff;border:1px solid #dce0ee;border-radius:16px;padding:14px 16px;margin-bottom:16px"><h3 style="margin:0;font-size:1.05rem">दिन की समय-रेखा <span style="color:#5b6283;font-weight:400;font-size:.85rem">· सूर्योदय से अगले सूर्योदय तक</span></h3>${timelineHtml(pd, dt)}</section>`;

  const cards = [];

  // आज का पंचांग
  if (pd) {
    const chain = list => list.map(s => esc(s.label) + (s.end ? ' · ' + (dayOf(s.end) === today ? clock(s.end) : shortDate(s.end)) + ' तक' : '')).join('<br>');
    const body = kv('वार · पक्ष', `${esc(pd.weekday)} · ${esc(pd.paksha)}`) + kv('तिथि', chain(pd.tithis)) + kv('नक्षत्र', chain(pd.nakshatras)) + kv('योग', chain(pd.yogas)) + kv('करण', chain(pd.karanas))
      + kv('चंद्र राशि', chain(pd.moonRashi)) + kv('सूर्य राशि · नक्षत्र', `${esc(pd.sunRashi)} · ${esc(pd.sunNakshatra)}`)
      + kv('चांद्र मास', `अमांत ${esc(pd.amantaMonth)} · पूर्णिमांत ${esc(pd.purnimantaMonth)}`)
      + kv('सूर्योदय / सूर्यास्त', `${clock(pd.sunrise)} / ${clock(pd.sunset)}`) + kv('चंद्रोदय / चंद्रास्त', `${pd.moonrise ? clock(pd.moonrise) : '—'} / ${pd.moonset ? clock(pd.moonset) : '—'}`)
      + kv('संवत', `विक्रम ${pd.vikramSamvat} · शक ${pd.shakaSamvat} · गुजराती ${pd.gujaratiSamvat}`, !dt)
      + (dt ? kv('राहुकाल', `${clock(dt.rahu.start)} – ${clock(dt.rahu.end)}`) + kv('यमगंड · गुलिक', `${clock(dt.yama.start)} – ${clock(dt.yama.end)} · ${clock(dt.gulika.start)} – ${clock(dt.gulika.end)}`) + kv('अभिजीत मुहूर्त', `${clock(dt.abhijit.start)} – ${clock(dt.abhijit.end)}`) + kv('ब्रह्म मुहूर्त', `${clock(dt.brahma.start)} – ${clock(dt.brahma.end)}`, true) : '');
    cards.push(card('आज का पंचांग', body, ['panchang', 'पूरा पंचांग देखें'], `${esc(pd.weekday)}`));
  }

  // आज की कुंडली (D1)
  const chips = GRAHA_ORDER.slice(0, 7).map(k => `<span style="background:#eef1fb;border-radius:8px;padding:3px 9px;font-size:13px">${esc(pos[k].name)}${pos[k].retro ? ' (व)' : ''} · ${esc(pos[k].rashi)} ${dms(pos[k].deg)}</span>`).join('');
  cards.push(card('आज की कुंडली (D1)', chartSvg(lagnaSign, pos)
    + '<small style="display:block;text-align:center;color:#5b6283">संख्या = राशि (1 मेष … 12 मीन) · (व) = वक्री · उत्तर भारतीय शैली</small>'
    + `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${chips}</div>`, ['kundli', 'जन्म कुंडली बनाएँ'], `लग्न ${esc(RASHI_HI[lagnaSign])} ${dms(asc % 30)}`));

  // ग्रह स्थिति
  cards.push(card('ग्रह स्थिति (निरयण · लाहिरी)', GRAHA_ORDER.map(k => { const g = pos[k]; return row('◉', `${g.name}${g.retro ? ' (वक्री)' : ''}`, `${esc(g.rashi)} ${dms(g.deg)} · ${esc(g.nakshatra)} पद ${g.pada}`); }).join(''), null));

  // त्योहार
  {
    let items = '';
    const fest = (day, month, name, when, bg) => `<div style="display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid #e7e9f3"><div style="flex:none;width:52px;text-align:center;border-radius:10px;background:${bg};padding:6px 0;line-height:1.15"><b style="font-size:1.2rem;display:block">${day}</b><small>${month}</small></div><div style="min-width:0;flex:1"><b style="display:block">${esc(name)}</b><small style="color:#5b6283">${esc(when)}</small></div></div>`;
    const bgs = ['#ffe3c4', '#cfede6', '#f5d6e6', '#dde2f7', '#ffd3a3', '#d0efbd'];
    let i = 0;
    const [ty, tm, td] = today.split('-').map(Number);
    for (const f of D.todayFest || []) items += fest(td, MON[tm - 1], f.name + (f.dayNo ? ` · दिन ${f.dayNo}/${f.dayTotal}` : ''), 'आज', '#f4b9a8');
    for (const u of D.upcoming || []) {
      if (i >= 10) break;
      const [, um, ud] = u.date.split('-').map(Number);
      for (const f of u.items) { if (i >= 10) break; items += fest(ud, MON[um - 1], f.name + (f.dayNo ? ` · दिन ${f.dayNo}/${f.dayTotal}` : ''), `${u.daysAway === 1 ? 'कल' : u.daysAway + ' दिन बाद'} · ${wdOf(u.date)}`, bgs[i % bgs.length]); i++; }
    }
    cards.push(card('आने वाले व्रत और त्योहार', items || '<p>अगले 30 दिनों में कोई व्रत या त्योहार दर्ज नहीं है।</p>', ['calendar', 'पूरा त्योहार कैलेंडर']));
  }

  // आज का राशिफल
  if (D.rashi && D.rashi.length) {
    const word = n => n >= 4 ? ['शुभ', '#cdeea0'] : n === 3 ? ['मिला-जुला', '#ffe58f'] : ['सावधानी', '#ffbf8a'];
    cards.push(card('आज का राशिफल', D.rashi.map(s => { const n = s.stars.overall, [w, bg] = word(n); return `<div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid #e7e9f3"><b style="flex:0 0 74px">${esc(s.name)}</b><span style="flex:1;letter-spacing:.08em;color:#b35a0e" aria-label="${n} में से 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span><span style="flex:none;border-radius:999px;padding:2px 10px;font-size:12px;background:${bg};color:#1b2150">${w}</span></div>`; }).join(''), ['rashifal', 'साप्ताहिक, मासिक, वार्षिक देखें'], 'चंद्र राशि के अनुसार'));
  }

  // चौघड़िया
  if (ch.day.length) {
    const list = (title, arr) => `<p style="margin:8px 0 4px;color:#5b6283"><small>${title}</small></p>` + arr.map(c => `<div style="display:flex;gap:10px;align-items:center;padding:8px 10px;margin:4px 0;border-radius:10px;background:${c.good ? '#e3f4ee' : '#fbe6e3'};${c === curCh ? 'outline:2px solid #e0771f;' : ''}"><span style="flex:none;width:10px;height:10px;border-radius:50%;background:${c.good ? '#0f8f7d' : '#c8473d'}"></span><b style="flex:0 0 62px">${esc(c.name)}</b><span style="flex:1;color:#1b2150">${clock(c.start)} – ${clock(c.end)}</span>${c === curCh ? '<small style="flex:none;font-weight:700;color:#b35a0e">अभी</small>' : ''}</div>`).join('');
    cards.push(card('चौघड़िया' + (curCh ? ' · अभी: ' + esc(curCh.name) : ''), list('दिन', ch.day) + list('रात', ch.night), ['muhurat', 'शुभ मुहूर्त देखें'], esc(place.name.split(',')[0])));
  }

  // होरा
  if (hr.length) cards.push(card('होरा' + (curHr ? ' · अभी: ' + esc(curHr.lord) : ''), `<details open><summary style="cursor:pointer;margin:6px 0"><small>24 घंटे की सूची दिखाएँ/छिपाएँ</small></summary><div style="max-height:430px;overflow:auto">${hr.map(x => row(x.night ? '🌙' : '☀️', x.lord + ' होरा', `${clock(x.start)} – ${clock(x.end)}`, x === curHr)).join('')}</div></details>`, null));

  // आने वाली ग्रह-घटनाएँ
  {
    const ev = eventsNow(ms);
    cards.push(card('आने वाली ग्रह-घटनाएँ', ev.length ? ev.map(e => `<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #e7e9f3"><span style="flex:none;width:8px;height:8px;border-radius:50%;background:#e0771f;margin-top:8px"></span><div style="min-width:0"><b style="display:block">${esc(e.text)}</b><small style="color:#5b6283">${esc(shortDate(new Date(e.ms)))} · ${Math.max(0, Math.ceil((e.ms - ms) / 86400000))} दिन बाद</small></div></div>`).join('') : '<p>अगले 60 दिनों में कोई प्रमुख ग्रह-घटना नहीं।</p>', ['rashifal', 'राशिफल और गोचर देखें'], 'राशि-परिवर्तन · वक्री · कोण'));
  }

  // चंद्र कला + घटी घड़ी
  {
    let ghati = '';
    if (pd) {
      const sr = ms >= pd.sunrise.getTime() ? pd.sunrise.getTime() : getPanchangDay(shiftDate(today, -1), place).sunrise.getTime();
      const g = Math.max(0, (ms - sr) / (24 * 60000)), gh = Math.floor(g), pal = Math.floor((g - gh) * 60), vi = Math.floor(((g - gh) * 60 - pal) * 60);
      ghati = `<div style="text-align:center;padding:10px 0"><div style="color:#5b6283;font-size:.8rem">घटी : पल : विपल (सूर्योदय से)</div><div style="font-size:2.2rem;font-weight:700;color:#b35a0e;margin:4px 0">${gh} : ${String(pal).padStart(2, '0')} : ${String(vi).padStart(2, '0')}</div><small style="color:#5b6283">1 घटी = 24 मिनट · 60 घटी = एक दिन-रात</small></div>`;
    }
    cards.push(card('चंद्र कला और घटी घड़ी', row('🌓', `${ph.illumination.toFixed(0)}% प्रकाशित`, `${esc(ph.paksha)} · दिन ${ph.pakshaDay}/15`) + ghati, null));
  }

  h += `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:stretch">${cards.join('')}</div>`;
  container.innerHTML = h;
  const btn = container.querySelector('#extras-gps');
  if (btn) btn.onclick = () => locate(container, true);
}

// ---------- स्थान: GPS अनुमति मिलते ही उसी स्थान के हिसाब से ----------
function locate(container, userAsked) {
  if (!navigator.geolocation) { if (userAsked) alert('इस ब्राउज़र में GPS उपलब्ध नहीं है।'); return; }
  navigator.geolocation.getCurrentPosition(p => {
    place = { name: `आपकी लोकेशन (${p.coords.latitude.toFixed(2)}°, ${p.coords.longitude.toFixed(2)}°)`, lat: p.coords.latitude, lon: p.coords.longitude };
    try { localStorage.setItem(STORE, JSON.stringify(place)); } catch (e) { /* ignore */ }
    render(container);
  }, () => { if (userAsked) alert('GPS स्थान नहीं मिल सका। ब्राउज़र में लोकेशन की अनुमति दें।'); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
}

export function mountDailyExtras(container) {
  if (!container || container.dataset.extrasMounted === '1') return; // main.js में दो बार बुलाने पर दोहराव नहीं
  container.dataset.extrasMounted = '1';
  try { render(container); } catch (e) { console.error('Daily extras failed:', e); container.innerHTML = '<p>कुंडली और ग्रह स्थिति लोड नहीं हो सकी।</p>'; return; }
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(st => {
      if (st.state === 'granted') locate(container, false);
      st.onchange = () => { if (st.state === 'granted') locate(container, false); };
    }).catch(() => {});
  }
  setInterval(() => { try { render(container); } catch (e) { console.error(e); } }, 60000); // हर मिनट: अभी का लग्न/चौघड़िया/होरा/घटी और तारीख़ बदलना
}
