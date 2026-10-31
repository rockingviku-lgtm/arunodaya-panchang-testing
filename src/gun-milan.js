// कुंडली मिलान: अष्टकूट (36 गुण) — वर और वधू के जन्म-चंद्र (राशि/नक्षत्र) से, साथ में मंगल दोष की तुलना। रंगीन तालिकाओं में।
// जन्म-विवरण (तारीख़, समय, स्थान) से अपने-आप चंद्र की गणना; समय पता न हो तो नक्षत्र-पद हाथ से चुन सकते हैं। ज़रूरत: kundli-doshas.js
import { computeKundli, birthToUtc } from './kundli-doshas.js';
import { NAKSHATRAS } from './festival-calendar.js';
import { RASHI_HI } from './graha-engine.js';

const VARNA_RASHI = [1, 2, 0, 3, 1, 2, 0, 3, 1, 2, 0, 3]; // 3=ब्राह्मण... इंडेक्स नीचे
// क्रम: 0 शूद्र, 1 वैश्य, 2 क्षत्रिय, 3 ब्राह्मण (ऊँचा क्रम = बड़ा मान)
const VARNA_OF_RASHI = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3];
const VARNA_NAME = ['शूद्र', 'वैश्य', 'क्षत्रिय', 'ब्राह्मण'];

// वश्य: 0 चतुष्पद, 1 मानव, 2 जलचर, 3 वनचर, 4 कीट
const VASHYA_NAME = ['चतुष्पद', 'मानव', 'जलचर', 'वनचर', 'कीट'];
const VASHYA_M = [[2, 1, 1, 0, 1], [1, 2, .5, 0, 1], [1, .5, 2, 1, 1], [0, 0, 1, 2, 0], [1, 1, 1, 0, 2]];
function vashyaOf(rashi, deg) {
  switch (rashi) {
    case 0: case 1: return 0;
    case 2: case 5: case 6: return 1;
    case 3: case 11: return 2;
    case 4: return 3;
    case 7: return 4;
    case 8: return deg < 15 ? 1 : 0;
    case 9: return deg < 15 ? 0 : 2;
    case 10: return 1;
    default: return 1;
  }
}

const YONI_NAME = ['अश्व', 'गज', 'मेष', 'सर्प', 'श्वान', 'मार्जार', 'मूषक', 'गौ', 'महिष', 'व्याघ्र', 'मृग', 'वानर', 'नकुल', 'सिंह'];
const YONI_OF_NAK = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
const YONI_M = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 1, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 1, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4]
];

const SIGN_LORD = ['मंगल', 'शुक्र', 'बुध', 'चंद्र', 'सूर्य', 'बुध', 'शुक्र', 'मंगल', 'गुरु', 'शनि', 'शनि', 'गुरु'];
const FRIEND = { सूर्य: ['चंद्र', 'मंगल', 'गुरु'], चंद्र: ['सूर्य', 'बुध'], मंगल: ['सूर्य', 'चंद्र', 'गुरु'], बुध: ['सूर्य', 'शुक्र'], गुरु: ['सूर्य', 'चंद्र', 'मंगल'], शुक्र: ['बुध', 'शनि'], शनि: ['बुध', 'शुक्र'] };
const ENEMY = { सूर्य: ['शुक्र', 'शनि'], चंद्र: [], मंगल: ['बुध'], बुध: ['चंद्र'], गुरु: ['बुध', 'शुक्र'], शुक्र: ['सूर्य', 'चंद्र'], शनि: ['सूर्य', 'चंद्र', 'मंगल'] };
const rel = (a, b) => a === b ? 2 : FRIEND[a].includes(b) ? 1 : ENEMY[a].includes(b) ? -1 : 0; // a की नज़र में b
function maitri(a, b) {
  if (a === b) return 5;
  const x = rel(a, b), y = rel(b, a), s = x + y;
  if (x === 1 && y === 1) return 5;
  if (s === 1) return 4;       // मित्र + सम
  if (x === 0 && y === 0) return 3;
  if (s === 0 && x !== 0) return 1; // मित्र + शत्रु
  if (s === -1) return .5;     // सम + शत्रु
  return 0;
}

const GANA_NAME = ['देव', 'मनुष्य', 'राक्षस'];
const GANA_OF_NAK = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const GANA_M = [[6, 6, 1], [5, 6, 0], [1, 0, 6]]; // [वर][वधू]
const NADI_NAME = ['आदि', 'मध्य', 'अंत्य'];
const NADI_OF_NAK = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// person: { rashi 0..11, nak 0..26, degInRashi }
export function ashtakoota(groom, bride) {
  const rows = [];
  // 1 वर्ण
  const vg = VARNA_OF_RASHI[groom.rashi], vb = VARNA_OF_RASHI[bride.rashi];
  rows.push({ koota: 'वर्ण', max: 1, got: vg >= vb ? 1 : 0, g: VARNA_NAME[vg], b: VARNA_NAME[vb], note: 'कार्य-क्षेत्र/अहं की अनुकूलता' });
  // 2 वश्य
  const wg = vashyaOf(groom.rashi, groom.deg), wb = vashyaOf(bride.rashi, bride.deg);
  rows.push({ koota: 'वश्य', max: 2, got: VASHYA_M[wg][wb], g: VASHYA_NAME[wg], b: VASHYA_NAME[wb], note: 'आपसी प्रभाव/नियंत्रण' });
  // 3 तारा
  const n1 = ((groom.nak - bride.nak + 27) % 27) + 1, n2 = ((bride.nak - groom.nak + 27) % 27) + 1;
  const bad = r => [3, 5, 7].includes(r % 9);
  const tg = (bad(n1) ? 0 : 1.5) + (bad(n2) ? 0 : 1.5);
  rows.push({ koota: 'तारा', max: 3, got: tg, g: NAKSHATRAS[groom.nak], b: NAKSHATRAS[bride.nak], note: 'भाग्य और स्वास्थ्य की अनुकूलता' });
  // 4 योनि
  const yg = YONI_OF_NAK[groom.nak], yb = YONI_OF_NAK[bride.nak];
  rows.push({ koota: 'योनि', max: 4, got: YONI_M[yg][yb], g: YONI_NAME[yg], b: YONI_NAME[yb], note: 'स्वभाव और शारीरिक/यौन अनुकूलता' });
  // 5 ग्रह मैत्री
  const lg = SIGN_LORD[groom.rashi], lb = SIGN_LORD[bride.rashi];
  rows.push({ koota: 'ग्रह मैत्री', max: 5, got: maitri(lg, lb), g: lg, b: lb, note: 'मानसिक तालमेल (राशि स्वामियों की मित्रता)' });
  // 6 गण
  const gg = GANA_OF_NAK[groom.nak], gb = GANA_OF_NAK[bride.nak];
  rows.push({ koota: 'गण', max: 6, got: GANA_M[gg][gb], g: GANA_NAME[gg], b: GANA_NAME[gb], note: 'स्वभाव (देव/मनुष्य/राक्षस)' });
  // 7 भकूट
  const d = ((groom.rashi - bride.rashi + 12) % 12) + 1, dd = ((bride.rashi - groom.rashi + 12) % 12) + 1;
  const bhBad = [[2, 12], [5, 9], [6, 8]].some(([a, b]) => d === a && dd === b || d === b && dd === a);
  rows.push({ koota: 'भकूट', max: 7, got: bhBad ? 0 : 7, g: RASHI_HI[groom.rashi], b: RASHI_HI[bride.rashi], note: bhBad ? `राशियाँ ${d}/${dd} (षडाष्टक/द्विर्द्वादश/नवपंचम) — भकूट दोष` : 'परिवार, धन और आपसी प्रेम' });
  // 8 नाड़ी
  const ng = NADI_OF_NAK[groom.nak], nb = NADI_OF_NAK[bride.nak];
  rows.push({ koota: 'नाड़ी', max: 8, got: ng === nb ? 0 : 8, g: NADI_NAME[ng], b: NADI_NAME[nb], note: ng === nb ? 'एक ही नाड़ी — नाड़ी दोष' : 'स्वास्थ्य और संतान' });
  const total = rows.reduce((s, r) => s + r.got, 0);
  const sameLordOrFriend = lg === lb || (rel(lg, lb) >= 1 && rel(lb, lg) >= 1);
  const doshas = [];
  if (rows[7].got === 0) doshas.push({ name: 'नाड़ी दोष', note: groom.rashi === bride.rashi && groom.nak !== bride.nak ? 'परिहार: राशि एक है पर नक्षत्र अलग' : groom.nak === bride.nak && groom.pada !== bride.pada ? 'परिहार: नक्षत्र एक है पर चरण अलग' : 'परिहार के लिए ज्योतिषी से सलाह लें' });
  if (rows[6].got === 0) doshas.push({ name: 'भकूट दोष', note: sameLordOrFriend ? 'परिहार: दोनों राशियों के स्वामी एक/मित्र हैं' : 'परिहार के लिए ज्योतिषी से सलाह लें' });
  if (rows[5].got === 0) doshas.push({ name: 'गण दोष', note: 'देव/मनुष्य बनाम राक्षस — स्वभावगत टकराव' });
  return { rows, total, doshas };
}

export function verdict(total) {
  if (total < 18) return { text: 'अनुकूल नहीं (न्यूनतम 18 गुण चाहिए)', bg: '#ff9b9b' };
  if (total < 25) return { text: 'मध्यम — स्वीकार्य', bg: '#ffe58f' };
  if (total < 33) return { text: 'उत्तम मिलान', bg: '#cdee9f' };
  return { text: 'अति उत्तम मिलान', bg: '#8fdc97' };
}

// ---------- पेज ----------
const HEAD = ['#e0771f', '#0f8f7d', '#7b4fd6', '#d6457f', '#2f7fd6', '#3f9a2a'];
const TINT = ['#ffd9b0', '#b8ebe0', '#d9ccf7', '#fbc6dc', '#c2dcf8', '#d0efbd'];
function tbl(headers, rows) {
  const th = headers.map((h, i) => `<th style="background:${HEAD[i % 6]};color:#fff;padding:7px 8px;text-align:left;border:1px solid rgba(0,0,0,.18)">${esc(h)}</th>`).join('');
  const tr = rows.map(r => '<tr>' + r.map((c, i) => { const o = typeof c === 'object' && c !== null ? c : { t: esc(c) }; return `<td style="background:${o.bg || TINT[i % 6]};color:#1b1b2f;padding:6px 8px;border:1px solid rgba(0,0,0,.15);${i === 0 ? 'font-weight:700;' : ''}vertical-align:top">${o.t}</td>`; }).join('') + '</tr>').join('');
  return `<div style="overflow-x:auto;margin:6px 0"><table style="border-collapse:collapse;width:100%;font-size:.86em;min-width:360px"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
const sec = t => `<p style="margin:16px 0 4px"><b>${esc(t)}</b></p>`;

function personForm(id, label) {
  const f = 'style="font:inherit;padding:6px;width:100%;box-sizing:border-box;margin:2px 0 6px"';
  return `<div style="flex:1 1 240px;min-width:240px;padding:10px;border-radius:12px;background:${id === 'g' ? '#c2dcf8' : '#fbc6dc'};color:#1b1b2f">
    <b>${label}</b>
    <input id="${id}-name" placeholder="नाम (वैकल्पिक)" ${f}>
    <label>जन्म तारीख़<input id="${id}-date" type="date" ${f}></label>
    <label>जन्म समय<input id="${id}-time" type="time" value="12:00" ${f}></label>
    <input id="${id}-city" value="Lucknow, India" placeholder="जन्म स्थान (शहर)" ${f}>
    <button id="${id}-gps" type="button" style="font:inherit;padding:5px 10px;cursor:pointer">GPS</button>
    <details style="margin-top:8px"><summary style="cursor:pointer">जन्म समय पता नहीं? नक्षत्र हाथ से चुनें</summary>
      <select id="${id}-nak" ${f}><option value="">— चुनें —</option>${NAKSHATRAS.map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
      <select id="${id}-pada" ${f}>${[1, 2, 3, 4].map(p => `<option value="${p}">चरण ${p}</option>`).join('')}</select></details></div>`;
}

export function mountGunMilan(container, opts = {}) {
  if (!container) return;
  const geocode = opts.geocode || null;
  const LKO = { name: 'Lucknow, India', lat: 26.8467, lon: 80.9462, timezone: 'Asia/Kolkata' };
  const places = { g: LKO, b: LKO };
  
container.innerHTML = `<div class="section-heading" style="display:block;margin-bottom:16px">
  <div class="eyebrow muted">KUNDLI MATCHING</div>
  <h2 style="margin:6px 0 4px">कुंडली मिलान</h2>
  <p style="margin:0;color:var(--muted)">वर और वधू की जन्म जानकारी भरकर गुण मिलान करें।</p>
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap">${personForm('g', 'वर (लड़का)')}${personForm('b', 'वधू (लड़की)')}</div>
    <button id="gm-go" type="button" style="font:inherit;font-weight:700;padding:8px 16px;margin:10px 0;cursor:pointer">गुण मिलान करें</button>
    <small id="gm-msg" style="display:block"></small><div id="gm-out"></div>`;
  const $ = s => container.querySelector(s), msg = t => { $('#gm-msg').textContent = t || ''; };
  for (const id of ['g', 'b']) $(`#${id}-gps`).onclick = () => {
    if (!navigator.geolocation) return msg('इस ब्राउज़र में GPS उपलब्ध नहीं है।');
    navigator.geolocation.getCurrentPosition(p => { places[id] = { name: `GPS (${p.coords.latitude.toFixed(3)}°, ${p.coords.longitude.toFixed(3)}°)`, lat: p.coords.latitude, lon: p.coords.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' }; $(`#${id}-city`).value = places[id].name; msg('GPS स्थान मिल गया।'); run(); }, () => msg('GPS स्थान नहीं मिला; शहर लिखें।'), { timeout: 12000 });
  };

  async function person(id) {
    const nakSel = $(`#${id}-nak`).value;
    if (nakSel !== '') { const nak = +nakSel, pada = +$(`#${id}-pada`).value, lon = nak * (360 / 27) + (pada - 1) * (360 / 108); return { nak, pada, rashi: Math.floor(lon / 30), deg: lon % 30, k: null }; }
    const date = $(`#${id}-date`).value, time = $(`#${id}-time`).value || '12:00', city = $(`#${id}-city`).value.trim();
    if (!date) throw new Error('जन्म तारीख़ भरें (या नक्षत्र चुनें)।');
    let pl = places[id] && places[id].name === city ? places[id] : null;
    if (!pl) { if (!city) throw new Error('जन्म स्थान लिखें या GPS दबाएँ।'); if (!geocode) throw new Error('शहर खोज उपलब्ध नहीं; GPS दबाएँ।'); pl = await geocode(city); places[id] = pl; }
    const ms = birthToUtc(date, time, pl.timezone || 'Asia/Kolkata');
    const k = computeKundli({ ms, lat: +pl.lat, lon: +pl.lon });
    const m = k.pos.moon;
    return { nak: NAKSHATRAS.indexOf(m.nakshatra), pada: m.pada, rashi: m.sign, deg: m.deg, k };
  }

  const run = async () => {
    try {
      if (!(($('#g-date').value || $('#g-nak').value !== '') && ($('#b-date').value || $('#b-nak').value !== ''))) { msg('दोनों की जन्म तारीख़ (या नक्षत्र) भरें — भरते ही मिलान अपने-आप हो जाएगा।'); return; }
      msg('गणना हो रही है…');
      const [g, b] = [await person('g'), await person('b')];
      const r = ashtakoota(g, b), v = verdict(r.total);
      const gn = $('#g-name').value.trim() || 'वर', bn = $('#b-name').value.trim() || 'वधू';
      let h = sec('जन्म-चंद्र');
      h += tbl(['', gn, bn], [['चंद्र राशि', RASHI_HI[g.rashi], RASHI_HI[b.rashi]], ['नक्षत्र · चरण', `${NAKSHATRAS[g.nak]} · ${g.pada}`, `${NAKSHATRAS[b.nak]} · ${b.pada}`]]);
      h += sec('अष्टकूट मिलान');
      h += tbl(['कूट', 'अधिकतम', 'प्राप्त', gn, bn, 'अर्थ'], r.rows.map(x => [x.koota, String(x.max), { t: `<b>${x.got}</b>`, bg: x.got === 0 ? '#ff9b9b' : x.got >= x.max ? '#8fdc97' : '#ffe58f' }, x.g, x.b, x.note]));
      h += tbl(['कुल गुण', 'निष्कर्ष'], [[{ t: `${r.total} / 36`, bg: v.bg }, { t: `<b>${esc(v.text)}</b>`, bg: v.bg }]]);
      if (r.doshas.length) { h += sec('दोष और परिहार'); h += tbl(['दोष', 'टिप्पणी'], r.doshas.map(d => [d.name, d.note])); }
      if (g.k && b.k) {
        const mg = g.k.doshas.find(d => d.key === 'mangal'), mb = b.k.doshas.find(d => d.key === 'mangal');
        const cmp = mg.present && mb.present ? 'दोनों मांगलिक — परस्पर संतुलन माना जाता है' : !mg.present && !mb.present ? 'दोनों में मंगल दोष नहीं' : 'एक मांगलिक, दूसरा नहीं — परिहार/उपाय के लिए ज्योतिषी से सलाह लें';
        h += sec('मंगल दोष तुलना');
        h += tbl(['', gn, bn], [['मंगल दोष', mg.level || 'नहीं', mb.level || 'नहीं'], ['विवरण', esc(mg.detail), esc(mb.detail)], ['निष्कर्ष', { t: esc(cmp), bg: '#ffe58f' }, { t: '', bg: '#ffe58f' }]]);
      }
      h += '<small style="display:block;margin-top:10px;opacity:.8">अष्टकूट परंपरागत 36-गुण पद्धति है (न्यूनतम 18)। यह केवल चंद्र-आधारित मिलान है; विवाह जैसे निर्णय में पूरी कुंडली, दशा और परिवार/ज्योतिषी की सलाह भी लें।</small>';
      $('#gm-out').innerHTML = h; msg('');
    } catch (e) { console.error(e); msg(e.message || 'गणना नहीं हो सकी।'); }
  };
  $('#gm-go').onclick = run;
  for (const id of ['g', 'b']) for (const f of ['date', 'time', 'city', 'nak', 'pada']) $(`#${id}-${f}`).onchange = run; // भरते/बदलते ही अपने-आप
}
