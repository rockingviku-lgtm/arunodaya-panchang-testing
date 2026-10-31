// राशिफल: दैनिक / साप्ताहिक / मासिक / वार्षिक (1900–2099), मेष से मीन तक — सब तालिकाओं में, रंगीन।
// आधार: असली ग्रह-गोचर (निरयण, लाहिरी) जन्म-चंद्र राशि से; शास्त्रीय गोचर-फल के नियम (शुभ/अशुभ भाव)।
// किसी भी तारीख़ पर अपने-आप गणना; कोई तैयार/नकली पाठ-तारीख़ सूची नहीं। 2050 के बाद ग्रह-गणना अनुमानित है।
import { grahaPositions, planetSign, RASHI_HI, GRAHA_HI, GRAHA_ORDER } from './graha-engine.js';
import { moonSidereal, todayIST, shiftDate, WEEKDAYS_HI } from './festival-calendar.js';

const H = 3600000, DAYMS = 86400000;
const SYM = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const FAV = { sun: [3, 6, 10, 11], moon: [1, 3, 6, 7, 10, 11], mars: [3, 6, 11], mercury: [2, 4, 6, 8, 10, 11], jupiter: [2, 5, 7, 9, 11], venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], saturn: [3, 6, 11], rahu: [3, 6, 10, 11], ketu: [3, 6, 11] };
const AREAS = [['overall', 'सामान्य'], ['career', 'करियर'], ['money', 'धन'], ['love', 'प्रेम/संबंध'], ['health', 'स्वास्थ्य']];
const W = {
  overall: { sun: 1.5, moon: 3, mars: 1.5, mercury: 1, jupiter: 2, venus: 1, saturn: 2, rahu: 1.5, ketu: 1 },
  career: { sun: 2, moon: 1, mars: 1.5, mercury: 1, jupiter: 1, saturn: 2, rahu: 1, ketu: 0 },
  money: { sun: .5, moon: 1.5, mars: 0, mercury: 1.5, jupiter: 2.5, venus: 1.5, saturn: 1, rahu: .5, ketu: 0 },
  love: { sun: 0, moon: 2, mars: 1.5, mercury: .5, jupiter: 1.5, venus: 2.5, saturn: .5, rahu: 1, ketu: .5 },
  health: { sun: 2, moon: 1.5, mars: 2, mercury: .5, jupiter: 1, venus: .5, saturn: 1.5, rahu: 1, ketu: .5 }
};
const BOOST = { career: [10, 6, 11], money: [2, 11], love: [5, 7], health: [1, 6] };
const BENEFIC = ['moon', 'mercury', 'jupiter', 'venus'];
const GOOD = { sun: 'आत्मविश्वास और मान-सम्मान बढ़ता है', moon: 'मन प्रसन्न और स्थिर रहता है', mars: 'साहस-ऊर्जा से काम बनते हैं', mercury: 'बुद्धि, संवाद और व्यापार में लाभ', jupiter: 'बड़ों का आशीर्वाद और अवसर मिलते हैं', venus: 'सुख-सुविधा और संबंधों में मधुरता', saturn: 'मेहनत का फल, अनुशासन से प्रगति', rahu: 'अचानक लाभ, नए अवसर', ketu: 'आध्यात्मिक झुकाव, विरोधियों पर विजय' };
const BAD = { sun: 'अहं-टकराव और थकान', moon: 'मन अस्थिर, भावनात्मक उतार-चढ़ाव', mars: 'क्रोध, जल्दबाज़ी और विवाद से सावधान', mercury: 'संवाद में भ्रम; जल्दबाज़ी में निर्णय न लें', jupiter: 'सहयोग कम, खर्च बढ़ने के संकेत', venus: 'संबंधों में दूरी या ग़लतफ़हमी', saturn: 'देरी, बोझ और थकान', rahu: 'भ्रम और अनिश्चितता', ketu: 'बेचैनी, अलगाव की भावना' };
const HOUSE = ['', 'स्वयं/स्वास्थ्य', 'धन/वाणी/परिवार', 'पराक्रम/भाई-बहन/यात्रा', 'घर/माता/वाहन/सुख', 'संतान/शिक्षा/प्रेम', 'रोग/ऋण/शत्रु', 'जीवनसाथी/साझेदारी', 'बाधा/अचानक घटनाएँ', 'भाग्य/धर्म/यात्रा', 'कर्म/करियर', 'लाभ/मित्र', 'व्यय/नींद/विदेश'];
const LORD_NUM = [9, 6, 5, 2, 1, 5, 6, 9, 3, 8, 8, 3];
const LORD_COLOR = ['लाल', 'सफ़ेद/गुलाबी', 'हरा', 'सफ़ेद', 'नारंगी', 'हरा', 'गुलाबी', 'लाल', 'पीला', 'नीला', 'नीला', 'पीला'];
const SLOW_YEAR = ['jupiter', 'saturn', 'rahu', 'ketu', 'mars'];

const dayStart = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) - 330 * 60000; };
const ORD = ['', 'पहला', 'दूसरा', 'तीसरा', 'चौथा', 'पाँचवाँ', 'छठा', 'सातवाँ', 'आठवाँ', 'नौवाँ', 'दसवाँ', 'ग्यारहवाँ', 'बारहवाँ'];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const toStars = S => clamp(Math.round(3 + 1.8 * S), 1, 5);
const pad = n => String(n).padStart(2, '0');
const hhmm = ms => { const d = new Date(ms + 330 * 60000); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const fdate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const fshort = iso => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1].slice(0, 3)}`; };
const wd = iso => WEEKDAYS_HI[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- एक दिन के ग्रह ----------
const cache = new Map();
function dayData(iso) {
  if (cache.has(iso)) return cache.get(iso);
  const t0 = dayStart(iso), pos = grahaPositions(t0 + 12 * H);
  const planets = {};
  for (const g of GRAHA_ORDER) if (g !== 'moon') planets[g] = { sign: pos[g].sign, retro: pos[g].retro };
  const sg = ms => Math.floor(moonSidereal(ms) / 30);
  const segs = []; let prev = sg(t0), start = t0;
  for (let h = 1; h <= 24; h++) {
    const s = sg(t0 + h * H);
    if (s !== prev) {
      let lo = t0 + (h - 1) * H, hi = t0 + h * H;
      while (hi - lo > 30000) { const mid = (lo + hi) / 2; if (sg(mid) === prev) lo = mid; else hi = mid; }
      segs.push({ sign: prev, start, end: hi }); prev = s; start = hi;
    }
  }
  segs.push({ sign: prev, start, end: t0 + 24 * H });
  const d = { iso, planets, moon: segs };
  if (cache.size > 800) cache.clear();
  cache.set(iso, d);
  return d;
}

const houseFrom = (natal, sign) => ((sign - natal + 12) % 12) + 1;
function val(g, house, area) {
  const fav = FAV[g].includes(house);
  let v = fav ? 1 : -1;
  if (area !== 'overall') {
    if (fav && BOOST[area] && BOOST[area].includes(house) && (area === 'health' ? true : BENEFIC.includes(g) || true)) v += 0.5;
    if (!fav && area === 'health' && [6, 8, 12].includes(house) && !BENEFIC.includes(g)) v -= 0.5;
  }
  return v;
}
// एक दिन, एक चंद्र राशि के लिए: हर क्षेत्र का अंक (-1.5..1.5)
function scoreDay(day, natal) {
  const out = {};
  for (const [a] of AREAS) {
    let num = 0, den = 0;
    for (const g of GRAHA_ORDER) {
      const w = W[a][g]; if (!w) continue;
      let v;
      if (g === 'moon') { v = 0; for (const s of day.moon) v += val('moon', houseFrom(natal, s.sign), a) * (s.end - s.start) / DAYMS; }
      else v = val(g, houseFrom(natal, day.planets[g].sign), a);
      num += w * v; den += w;
    }
    out[a] = num / den;
  }
  return out;
}
const avg = list => { const o = {}; for (const [a] of AREAS) o[a] = list.reduce((s, x) => s + x[a], 0) / list.length; return o; };
const starsOf = S => { const o = {}; for (const [a] of AREAS) o[a] = toStars(S[a]); return o; };

// ग्रह की राशि-अवस्थाएँ (तारीख़ सीमा) किसी अवधि में
function ingressTime(g, fromMs, toMs, fromSign) {
  let lo = fromMs, hi = toMs;
  while (hi - lo > 60000) { const mid = (lo + hi) / 2; if (grahaPositions(mid)[g].sign === fromSign) lo = mid; else hi = mid; }
  return hi;
}
function stages(g, days) { // days: [iso...]
  const out = []; let cur = null;
  for (const iso of days) {
    const p = dayData(iso).planets[g];
    if (!cur || cur.sign !== p.sign) { cur = { sign: p.sign, from: iso, to: iso, retro: p.retro }; out.push(cur); } else { cur.to = iso; cur.retro = cur.retro || p.retro; }
  }
  return out;
}
function events(days) {
  const ev = [];
  for (let i = 1; i < days.length; i++) {
    const a = dayData(days[i - 1]), b = dayData(days[i]);
    for (const g of ['sun', 'mars', 'mercury', 'venus', 'jupiter', 'saturn', 'rahu', 'ketu']) {
      const pa = a.planets[g], pb = b.planets[g];
      if (pa.sign !== pb.sign) {
        const ms = ingressTime(g, dayStart(days[i - 1]) + 12 * H, dayStart(days[i]) + 12 * H, pa.sign);
        ev.push({ ms, iso: days[i], text: `${GRAHA_HI[g]} ${RASHI_HI[pa.sign]} से ${RASHI_HI[pb.sign]} में (${hhmm(ms)})` });
      }
      if (!['sun', 'rahu', 'ketu'].includes(g) && pa.retro !== pb.retro) ev.push({ ms: dayStart(days[i]), iso: days[i], text: `${GRAHA_HI[g]} ${pb.retro ? 'वक्री' : 'मार्गी'} होता है` });
    }
  }
  return ev.sort((x, y) => x.ms - y.ms);
}


// ---------- शनि की राशि-अवधियाँ (साढ़ेसाती/ढैया की सटीक तारीख़ें) ----------
const isoOf = ms => new Date(ms + 330 * 60000).toISOString().slice(0, 10);
const satCache = new Map();
function satSegments(year) {
  if (satCache.has(year)) return satCache.get(year);
  const from = Date.UTC(year - 9, 0, 1), to = Date.UTC(year + 9, 0, 1), segs = [];
  let t = from, cur = planetSign('saturn', t), start = from;
  while (t < to) {
    const n = Math.min(t + 4 * DAYMS, to), sg = planetSign('saturn', n);
    if (sg !== cur) {
      let lo = t, hi = n;
      while (hi - lo > 60000) { const mid = (lo + hi) / 2; if (planetSign('saturn', mid) === cur) lo = mid; else hi = mid; }
      segs.push({ sign: cur, start, end: hi }); cur = sg; start = hi;
    }
    t = n;
  }
  segs.push({ sign: cur, start, end: to });
  satCache.set(year, segs);
  return segs;
}
// ms वाले समय पर शनि की राशि का खंड; relSet (चंद्र राशि से दूरी 0..11) वाले जुड़े खंडों का पूरा काल (वक्री-वापसी ≤ 300 दिन जोड़कर)
function satSpan(natal, ms, relSet) {
  const segs = satSegments(new Date(ms).getUTCFullYear());
  const rel = x => (x.sign - natal + 12) % 12;
  const i = segs.findIndex(x => ms >= x.start && ms < x.end);
  if (i < 0) return null;
  let a = i, b = i;
  for (let k = i - 1; k >= 0; k--) { if (segs[a].start - segs[k].end > 300 * DAYMS) break; if (relSet.includes(rel(segs[k]))) a = k; }
  for (let k = i + 1; k < segs.length; k++) { if (segs[k].start - segs[b].end > 300 * DAYMS) break; if (relSet.includes(rel(segs[k]))) b = k; }
  return { seg: segs[i], start: segs[a].start, end: segs[b].end };
}

// ---------- अवधि ----------
function periodDays(kind, iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (kind === 'day') return [iso];
  if (kind === 'week') { const dow = new Date(`${iso}T12:00:00Z`).getUTCDay(), back = (dow + 6) % 7; const s = shiftDate(iso, -back); return Array.from({ length: 7 }, (_, i) => shiftDate(s, i)); }
  if (kind === 'month') { const n = new Date(Date.UTC(y, m, 0)).getUTCDate(); return Array.from({ length: n }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`); }
  const out = []; for (let mm = 1; mm <= 12; mm++) { const n = new Date(Date.UTC(y, mm, 0)).getUTCDate(); for (let dd = 1; dd <= n; dd++) out.push(`${y}-${pad(mm)}-${pad(dd)}`); }
  return out;
}

export function rashifal(kind, iso) {
  const days = periodDays(kind, iso), data = days.map(dayData), mid = data[Math.floor(data.length / 2)];
  const res = { kind, days, signs: [], events: kind === 'day' ? [] : events(days), beyond: +iso.slice(0, 4) > 2050 };
  for (let s = 0; s < 12; s++) {
    const per = data.map(d => scoreDay(d, s)), S = avg(per);
    const sign = { index: s, name: RASHI_HI[s], sym: SYM[s], S, stars: starsOf(S), lucky: { num: LORD_NUM[s], color: LORD_COLOR[s] }, per, influences: [], notes: [], rows: [] };
    // ग्रह-प्रभाव
    if (kind === 'day') {
      for (const seg of mid.moon) { const h = houseFrom(s, seg.sign); sign.influences.push({ g: 'moon', label: `चंद्र (${RASHI_HI[seg.sign]}, ${hhmm(seg.start)}–${seg.end - seg.start >= DAYMS ? '24:00' : hhmm(seg.end)})`, house: h, fav: FAV.moon.includes(h) }); if (h === 8) sign.notes.push(`${RASHI_HI[s]} राशि: चंद्राष्टम (${hhmm(seg.start)}–${hhmm(seg.end)}) — चंद्र ${RASHI_HI[seg.sign]} में, यानी ${RASHI_HI[s]} से 8वें भाव में; नए कार्य और बड़े निर्णय टालें।`); }
      for (const g of GRAHA_ORDER) if (g !== 'moon') { const h = houseFrom(s, mid.planets[g].sign); sign.influences.push({ g, label: `${GRAHA_HI[g]} (${RASHI_HI[mid.planets[g].sign]})${mid.planets[g].retro && !['rahu', 'ketu'].includes(g) ? ' वक्री' : ''}`, house: h, fav: FAV[g].includes(h) }); }
    } else {
      const set = kind === 'year' ? SLOW_YEAR : GRAHA_ORDER.filter(g => g !== 'moon');
      for (const g of set) for (const st of stages(g, days)) { const h = houseFrom(s, st.sign); sign.rows.push({ g, from: st.from, to: st.to, label: `${GRAHA_HI[g]} (${RASHI_HI[st.sign]})${st.retro && !['rahu', 'ketu'].includes(g) ? ' वक्री' : ''}`, house: h, fav: FAV[g].includes(h) }); }
    }
    // साढ़ेसाती/ढैया — सटीक: राशि का नाम, शनि कहाँ है, किस चरण में, और तारीख़ें
    {
      const stg = stages('saturn', days), whole = stg.length === 1, when = ms => fdate(isoOf(ms));
      for (const st of stg) {
        const h = houseFrom(s, st.sign), ref = dayStart(st.from) + 12 * H;
        const where = `शनि ${RASHI_HI[st.sign]} में है (${RASHI_HI[s]} से ${ORD[h]} भाव)`;
        const during = whole ? 'चल रही है' : `${fshort(st.from)} से ${fshort(st.to)} तक (इस अवधि में) रहेगी`;
        if ([12, 1, 2].includes(h)) {
          const sp = satSpan(s, ref, [11, 0, 1]);
          const ph = h === 12 ? 'प्रथम चरण (चंद्र से 12वीं राशि)' : h === 1 ? 'द्वितीय चरण (चंद्र राशि पर)' : 'तृतीय चरण (चंद्र से 2री राशि)';
          sign.notes.push(`${RASHI_HI[s]} राशि पर साढ़ेसाती ${during} — ${ph}; ${where}।` + (sp ? ` शनि इस राशि के इस खंड में ${when(sp.seg.start)} से ${when(sp.seg.end)} तक; पूरी साढ़ेसाती ${when(sp.start)} से ${when(sp.end)} तक (वक्री गति से बीच में राशि-वापसी संभव)।` : ''));
        } else if ([4, 8].includes(h)) {
          const sp = satSpan(s, ref, [h === 4 ? 3 : 7]);
          sign.notes.push(`${RASHI_HI[s]} राशि पर ${h === 4 ? 'छोटी (चतुर्थ)' : 'बड़ी (अष्टम)'} ढैया ${during}; ${where}।` + (sp ? ` यह ${when(sp.start)} से ${when(sp.end)} तक रहेगी।` : ''));
        }
      }
    }
    // अवधि-विशेष तालिकाएँ
    if (kind === 'week') sign.dayRows = days.map((dd, i) => ({ iso: dd, moonSigns: data[i].moon.map(x => RASHI_HI[x.sign]).filter((v, j, a) => a.indexOf(v) === j).join(' → '), S: per[i], stars: starsOf(per[i]) }));
    if (kind === 'month') {
      const ws = []; for (let i = 0; i < days.length; i += 7) { const seg = per.slice(i, i + 7); ws.push({ from: days[i], to: days[Math.min(i + 6, days.length - 1)], stars: starsOf(avg(seg)) }); }
      sign.weekRows = ws;
      const rank = days.map((dd, i) => ({ iso: dd, o: per[i].overall })).sort((a, b) => b.o - a.o);
      sign.best = rank.slice(0, 3); sign.caution = rank.slice(-3).reverse();
    }
    if (kind === 'year') {
      const rows = []; let i = 0;
      for (let mm = 1; mm <= 12; mm++) { const n = new Date(Date.UTC(+iso.slice(0, 4), mm, 0)).getUTCDate(); rows.push({ m: mm, stars: starsOf(avg(per.slice(i, i + n))) }); i += n; }
      sign.monthRows = rows;
    }
    res.signs.push(sign);
  }
  return res;
}

// ---------- पेज ----------
const HEAD = ['#e0771f', '#0f8f7d', '#7b4fd6', '#d6457f', '#2f7fd6', '#3f9a2a'];
const TINT = ['#ffd9b0', '#b8ebe0', '#d9ccf7', '#fbc6dc', '#c2dcf8', '#d0efbd'];
const STAR_BG = { 1: '#ff9b9b', 2: '#ffbf8a', 3: '#ffe58f', 4: '#cdee9f', 5: '#8fdc97' };
const star = n => `<span title="${n}/5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
const sc = n => ({ t: star(n), bg: STAR_BG[n] });

function tbl(headers, rows) {
  const th = headers.map((h, i) => `<th style="background:${HEAD[i % 6]};color:#fff;padding:7px 8px;text-align:left;font-weight:700;border:1px solid rgba(0,0,0,.18)">${esc(h)}</th>`).join('');
  const tr = rows.map(r => '<tr>' + r.map((c, i) => {
    const o = typeof c === 'object' && c !== null ? c : { t: esc(c) };
    return `<td style="background:${o.bg || TINT[i % 6]};color:#1b1b2f;padding:6px 8px;border:1px solid rgba(0,0,0,.15);${i === 0 ? 'font-weight:700;' : ''}vertical-align:top">${o.t}</td>`;
  }).join('') + '</tr>').join('');
  return `<div style="overflow-x:auto;margin:6px 0"><table style="border-collapse:collapse;width:100%;font-size:.86em;min-width:360px"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
const sec = t => `<p style="margin:16px 0 4px"><b>${esc(t)}</b></p>`;
const verdict = n => n >= 4 ? 'शुभ' : n === 3 ? 'मिला-जुला' : 'सावधानी';
const fx = (fav, g, h) => fav ? { t: `शुभ · ${esc(GOOD[g])}`, bg: STAR_BG[4] } : { t: `अशुभ · ${esc(BAD[g])}`, bg: STAR_BG[2] };

function title(kind, iso, res) {
  if (kind === 'day') return `${wd(iso)}, ${fdate(iso)}`;
  if (kind === 'week') return `${fdate(res.days[0])} से ${fdate(res.days[6])}`;
  if (kind === 'month') return `${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
  return `वर्ष ${iso.slice(0, 4)}`;
}

function render(container, st) {
  const { kind, iso, sign } = st, res = rashifal(kind, iso), s = res.signs[sign];
  const KIND = { day: 'दैनिक', week: 'साप्ताहिक', month: 'मासिक', year: 'वार्षिक' }[kind];
  let h = `<p style="margin:10px 0 2px"><b>${KIND} राशिफल · ${esc(title(kind, iso, res))}</b></p>`;
  if (res.beyond) h += '<small style="display:block;margin-bottom:6px">2050 के बाद के ग्रह-स्थान अनुमानित गणना हैं (राशि-बदल की तारीख़ें कुछ दिन आगे-पीछे हो सकती हैं)।</small>';

  h += sec('सभी 12 राशियाँ (चंद्र राशि के अनुसार)');
  h += tbl(['राशि', ...AREAS.map(a => a[1]), 'शुभ अंक · रंग'], res.signs.map(x => [`${x.sym} ${x.name}`, ...AREAS.map(([a]) => sc(x.stars[a])), `${x.lucky.num} · ${x.lucky.color}`]));

  h += sec(`${s.sym} ${s.name} राशि — विस्तार`);
  h += tbl(['क्षेत्र', 'अंक', 'फल'], AREAS.map(([a, n]) => [n, sc(s.stars[a]), verdict(s.stars[a])]));
  if (s.notes.length) h += tbl(['विशेष सूचना'], [...new Set(s.notes)].map(n => [{ t: esc(n), bg: STAR_BG[3] }]));

  if (kind === 'day') {
    h += sec('आज के ग्रह-प्रभाव (आपकी चंद्र राशि से)');
    h += tbl(['ग्रह', 'भाव', 'क्षेत्र', 'असर'], s.influences.map(i => [i.label, ORD[i.house], HOUSE[i.house], fx(i.fav, i.g, i.house)]));
  }
  if (kind === 'week') {
    h += sec('दिन-वार');
    h += tbl(['दिन', 'चंद्र राशि', ...AREAS.map(a => a[1])], s.dayRows.map(r => [`${wd(r.iso)} ${fshort(r.iso)}`, r.moonSigns, ...AREAS.map(([a]) => sc(r.stars[a]))]));
  }
  if (kind === 'month') {
    h += sec('सप्ताह-वार');
    h += tbl(['अवधि', ...AREAS.map(a => a[1])], s.weekRows.map(r => [`${fshort(r.from)} – ${fshort(r.to)}`, ...AREAS.map(([a]) => sc(r.stars[a]))]));
    h += sec('सबसे शुभ और सावधानी वाले दिन');
    h += tbl(['शुभ दिन', 'सावधानी के दिन'], [0, 1, 2].map(i => [{ t: `${wd(s.best[i].iso)} ${fshort(s.best[i].iso)}`, bg: STAR_BG[5] }, { t: `${wd(s.caution[i].iso)} ${fshort(s.caution[i].iso)}`, bg: STAR_BG[1] }]));
  }
  if (kind === 'year') {
    h += sec('महीने-वार');
    h += tbl(['महीना', ...AREAS.map(a => a[1])], s.monthRows.map(r => [MONTHS[r.m - 1], ...AREAS.map(([a]) => sc(r.stars[a]))]));
  }
  if (kind !== 'day') {
    h += sec(kind === 'year' ? 'मुख्य ग्रहों के गोचर (आपकी राशि से)' : 'ग्रहों के गोचर (आपकी चंद्र राशि से)');
    h += tbl(['ग्रह', 'अवधि', 'भाव', 'क्षेत्र', 'असर'], s.rows.map(r => [r.label, r.from === r.to ? fshort(r.from) : `${fshort(r.from)} – ${fshort(r.to)}`, ORD[r.house], HOUSE[r.house], fx(r.fav, r.g, r.house)]));
    if (res.events.length) {
      h += sec('इस अवधि की खगोलीय घटनाएँ');
      h += tbl(['तारीख़', 'घटना'], res.events.filter(e => kind !== 'year' || !/सूर्य|बुध|शुक्र/.test(e.text)).map(e => [`${wd(e.iso)} ${fshort(e.iso)}`, e.text]));
    }
  }
  h += '<small style="display:block;margin-top:10px;opacity:.8">आधार: गोचर के ग्रह जन्म-चंद्र राशि से कौन-से भाव में हैं (शास्त्रीय शुभ/अशुभ भाव नियम)। यह सामान्य मार्गदर्शन है, व्यक्तिगत कुंडली/दशा के बिना निश्चित भविष्यवाणी नहीं; महत्वपूर्ण निर्णय के लिए ज्योतिषी से सलाह लें।</small>';
  st.out.innerHTML = h;
}

export function mountRashifal(container) {
  if (!container) return;
  const st = { kind: 'day', iso: todayIST(), sign: 0, out: null };
  try { const v = +localStorage.getItem('arunodaya.rashi'); if (v >= 0 && v < 12) st.sign = v; } catch (e) { /* ignore */ }
  const f = 'style="font:inherit;padding:6px;margin:2px 6px 8px 0"';
  container.innerHTML = `<div>
    <select id="rf-kind" ${f}><option value="day">दैनिक</option><option value="week">साप्ताहिक</option><option value="month">मासिक</option><option value="year">वार्षिक</option></select>
    <input id="rf-date" type="date" min="1900-01-01" max="2099-12-31" value="${st.iso}" ${f}>
    <select id="rf-sign" ${f}>${RASHI_HI.map((n, i) => `<option value="${i}"${i === st.sign ? ' selected' : ''}>${SYM[i]} ${n}</option>`).join('')}</select>
    <button id="rf-today" type="button" ${f}>आज</button></div><div id="rf-out"></div>`;
  st.out = container.querySelector('#rf-out');
  const go = () => { try { render(container, st); } catch (e) { console.error(e); st.out.innerHTML = '<p>राशिफल गणना नहीं हो सकी।</p>'; } };
  const $ = s => container.querySelector(s);
  $('#rf-kind').onchange = e => { st.kind = e.target.value; go(); };
  $('#rf-date').onchange = e => { if (e.target.value) { st.iso = e.target.value; go(); } };
  $('#rf-sign').onchange = e => { st.sign = +e.target.value; try { localStorage.setItem('arunodaya.rashi', String(st.sign)); } catch (x) { /* ignore */ } go(); };
  $('#rf-today').onclick = () => { st.iso = todayIST(); $('#rf-date').value = st.iso; go(); };
  go();
  setInterval(() => { /* आधी रात के बाद "आज" चुना हो तो ताज़ा करें */ }, 60000);
}
