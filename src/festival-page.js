import { getFestivalsForDate, getUpcomingFestivals, getDayBasics, todayIST, shiftDate, DEFAULT_PLACE } from './festival-calendar.js';
import { geocodePanchangPlace } from './panchak-engine.js';

const root = document.querySelector('#festival-app');
const TZ = 'Asia/Kolkata'; // पूरा पेज हमेशा भारतीय मानक समय में चलता है
const UPCOMING_DAYS = 30;  // "आने वाले दिन" में कितने दिन आगे तक दिखाना है
const MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

// ---------------------------------------------------------------------------
// तस्वीरें: id -> फ़ाइल का पथ। सिर्फ़ अपनी या लाइसेंस वाली तस्वीरें रखें (किसी साइट से कॉपी/hotlink नहीं)।
// जिसकी फ़ाइल न मिले या जो इस सूची में न हो, उसके लिए kind वाला आइकन दिखता है, इसलिए पेज नहीं बिगड़ता।
// नई तस्वीर जोड़ने के लिए बस नीचे एक पंक्ति जोड़ें। वर्गाकार (square) तस्वीर सबसे अच्छी दिखती है।
// ---------------------------------------------------------------------------
const IMG_DIR = 'assets/festivals/';
const FESTIVAL_IMAGES = Object.fromEntries([
  'diwali', 'dhanteras', 'narak-chaturdashi', 'govardhan-puja', 'bhai-dooj', 'chhath', 'karwa-chauth', 'ahoi-ashtami',
  'dussehra', 'durga-ashtami', 'maha-navami', 'sharad-navratri', 'chaitra-navratri', 'sharad-purnima', 'dev-uthani', 'tulsi-vivah',
  'kartik-purnima', 'dev-diwali', 'holi', 'holika-dahan', 'maha-shivaratri', 'ram-navami', 'hanuman-jayanti', 'janmashtami',
  'raksha-bandhan', 'ganesh-chaturthi', 'anant-chaturdashi', 'guru-purnima', 'rath-yatra', 'makar-sankranti', 'lohri', 'vasant-panchami',
  'akshaya-tritiya', 'buddha-purnima', 'mahavir-jayanti', 'ugadi', 'nag-panchami', 'hartalika-teej', 'hariyali-teej', 'pitru-paksha',
  'sarva-pitru-amavasya', 'ekadashi', 'pradosh', 'sankashti', 'purnima', 'amavasya', 'chandra-grahan', 'surya-grahan',
  'republic-day', 'independence-day', 'gandhi-jayanti'
].map(id => [id, `${IMG_DIR}${id}.webp`]));
// तस्वीर न हो तो kind के हिसाब से आइकन
const KIND_ICON = { festival: '🪔', vrat: '🕉', grahan: '🌘', national: '✪' };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = d => (d ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }).format(d) : '—');
const fmtDay = d => new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'short', timeZone: TZ }).format(d);
const istDay = d => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
const fmtDT = d => `${fmtDay(d)}, ${fmtTime(d)}`;
// जिस तारीख़ का त्योहार है उसी दिन का समय हो तो सिर्फ़ घड़ी का समय, वरना तारीख़ भी (अगली तारीख़ वाले समय पर तारीख़ साथ में)
const fmtAt = (d, baseDate) => (istDay(d) === baseDate ? fmtTime(d) : fmtDT(d));
const weekday = date => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
const longDate = date => { const [y, m, d] = date.split('-').map(Number); return `${weekday(date)}, ${d} ${MONTHS[m - 1]} ${y}`; };
const shortDate = date => { const [, m, d] = date.split('-').map(Number); return `${weekday(date)}, ${d} ${MONTHS[m - 1]}`; };
const relLabel = n => (n === 0 ? 'आज' : n === 1 ? 'कल' : n === 2 ? 'परसों' : `${n} दिन बाद`);

let followToday = true;   // तारीख़ को हाथ से न बदला हो तो आधी रात (IST) के बाद अपने-आप आगे बढ़ती है
let shownDate = todayIST();
let cityText = DEFAULT_PLACE.name;
let placeCache = { key: '', place: DEFAULT_PLACE, note: '' };

async function resolvePlace(city) {
  if (placeCache.key === city) return placeCache;
  let place = DEFAULT_PLACE, note = '';
  try {
    const p = await geocodePanchangPlace(city);
    if (p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon)) place = { name: p.name || city, lat: +p.lat, lon: +p.lon };
    else note = 'स्थान नहीं मिला, लखनऊ के अनुसार दिखा रहे हैं।';
  } catch {
    note = 'स्थान नहीं मिला, लखनऊ के अनुसार दिखा रहे हैं।';
  }
  placeCache = { key: city, place, note };
  return placeCache;
}

function iconHtml(it) {
  const src = FESTIVAL_IMAGES[it.id];
  if (!src) return `<span aria-hidden="true">${KIND_ICON[it.kind] || '✦'}</span>`;
  return `<img class="fest-img" src="${esc(src)}" alt="${esc(it.name)}" width="28" height="28" loading="lazy" data-kind="${esc(it.kind)}">`;
}

// एक व्रत/त्योहार की पंक्ति: साइट की मौजूदा daily-lagna-row बनावट (आइकन · नाम · ब्योरा), कोई नया कार्ड नहीं
function rowHtml(it, date, rel) {
  const lines = [];
  if (rel) lines.push(`${esc(shortDate(date))} · ${esc(rel)}`);
  if (it.tithiStart && it.tithiEnd) lines.push(`${esc(it.tithiLabel)} तिथि: ${esc(fmtDT(it.tithiStart))} से ${esc(fmtDT(it.tithiEnd))} तक`);
  else if (it.note && !(it.muhurtas && it.muhurtas.length)) lines.push(esc(it.note));
  for (const m of it.muhurtas || []) {
    lines.push(`${esc(m.label)}: ${esc(fmtAt(m.start, date))}${m.end ? ` – ${esc(fmtAt(m.end, date))}` : ''}`);
  }
  const title = esc(it.name) + (it.dayNo ? ` · दिन ${it.dayNo}/${it.dayTotal}` : '');
  return `<div class="daily-lagna-row fest-item fest-${esc(it.kind)}"><span class="daily-zodiac">${iconHtml(it)}</span><b>${title}</b><span>${lines.join('<br>')}</span></div>`;
}

// तस्वीर न खुले तो बिना लेआउट बिगाड़े आइकन
function wireImages() {
  root.querySelectorAll('img.fest-img').forEach(img => {
    const fallback = () => {
      const s = document.createElement('span');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = KIND_ICON[img.dataset.kind] || '✦';
      img.replaceWith(s);
    };
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });
}

async function render() {
  const { place, note } = await resolvePlace(cityText);
  const date = shownDate;
  const isToday = date === todayIST();

  const items = getFestivalsForDate(date, place);                          // उस दिन के; कुछ न हो तो खाली
  const upcoming = getUpcomingFestivals(date, UPCOMING_DAYS, place);       // अगले 30 दिन, खाली दिन छोड़कर
  const basics = getDayBasics(date, place);

  const todayBlock = items.length
    ? `<div class="daily-subhead"><h3>${isToday ? 'आज के' : esc(longDate(date)) + ' के'} व्रत और त्योहार</h3><span>${items.length}</span></div>
       <div class="daily-lagna-list">${items.map(it => rowHtml(it, date, '')).join('')}</div>`
    : '';
  const upRows = upcoming.flatMap(u => u.items.map(it => rowHtml(it, u.date, relLabel(u.daysAway)))).join('');
  const upcomingBlock = upRows
    ? `<div class="daily-subhead"><h3>आने वाले दिन</h3><span>अगले ${UPCOMING_DAYS} दिन</span></div><div class="daily-lagna-list">${upRows}</div>`
    : '';

  root.innerHTML = `<section class="daily-board">
    <div class="daily-board-head"><div><div class="daily-kicker">ARUNODAYA PANCHANG</div><h2>व्रत और त्योहार</h2>
      <p>${esc(place.name)} · ${esc(longDate(date))} · ${TZ} (UTC+05:30)</p></div><span class="daily-om">✦</span></div>
    <div class="daily-place-form">
      <label for="festival-city">स्थान</label><input id="festival-city" value="${esc(cityText)}">
      <label for="festival-date">तारीख</label><input id="festival-date" type="date" value="${esc(date)}">
      <button type="button" id="festival-prev" aria-label="पिछला दिन">‹</button>
      <button type="button" id="festival-today">आज</button>
      <button type="button" id="festival-next" aria-label="अगला दिन">›</button>
      <button type="button" id="festival-refresh">देखें</button>
    </div>
    ${note ? `<p class="daily-note">${esc(note)}</p>` : ''}
    <div class="daily-facts">
      <div class="daily-fact"><small>वार</small><b>${esc(basics.weekday)}</b></div>
      <div class="daily-fact"><small>तिथि (सूर्योदय पर)</small><b>${esc(basics.paksha)} · ${esc(basics.tithiLabel.replace(/^(शुक्ल|कृष्ण) /, ''))}</b><small>${esc(fmtDT(basics.tithiEnd))} तक</small></div>
      <div class="daily-fact"><small>नक्षत्र</small><b>${esc(basics.nakshatra)}</b><small>${esc(fmtDT(basics.nakshatraEnd))} तक</small></div>
      <div class="daily-fact"><small>योग</small><b>${esc(basics.yoga)}</b><small>${esc(fmtDT(basics.yogaEnd))} तक</small></div>
      <div class="daily-fact"><small>करण</small><b>${esc(basics.karana)}</b><small>${esc(fmtDT(basics.karanaEnd))} तक</small></div>
      <div class="daily-fact"><small>चांद्र मास</small><b>${esc(basics.amantaMonth)} (अमांत)</b><small>${esc(basics.purnimantaMonth)} (पूर्णिमांत)</small></div>
      <div class="daily-fact"><small>संवत</small><b>विक्रम ${esc(basics.vikramSamvat)}</b><small>शक ${esc(basics.shakaSamvat)}</small></div>
      <div class="daily-fact"><small>सूर्योदय · सूर्यास्त</small><b>${esc(fmtTime(basics.sunrise))} · ${esc(fmtTime(basics.sunset))}</b></div>
    </div>
    ${todayBlock}
    ${upcomingBlock}
    <p class="daily-disclaimer">तिथि, नक्षत्र, चांद्र मास और अधिक मास की गणना सूर्य-चंद्र की स्थिति से हर साल अपने-आप होती है (लाहिरी अयनांश, अमांत मास)। पूजा, पारण, चंद्रोदय आदि के समय स्थानीय सूर्योदय-सूर्यास्त और तिथि से निकाले जाते हैं; जो समय पक्का न निकले वह दिखाया नहीं जाता। पालन का दिन स्मार्त परंपरा से तय होता है; वैष्णव, क्षेत्रीय परंपरा या अलग शहर में एक दिन का अंतर संभव है। धार्मिक निर्णय से पहले स्थानीय पंचांग से मिला लें। ईद, मुहर्रम जैसे चाँद देखकर तय होने वाले त्योहार इसमें शामिल नहीं हैं।</p>
  </section>`;

  const go = d => { shownDate = d; followToday = d === todayIST(); safeRender(); };
  const read = () => { cityText = document.querySelector('#festival-city').value.trim() || DEFAULT_PLACE.name; };
  document.querySelector('#festival-refresh').onclick = () => { read(); go(document.querySelector('#festival-date').value || todayIST()); };
  document.querySelector('#festival-date').onchange = e => { read(); go(e.target.value || todayIST()); };
  document.querySelector('#festival-city').onkeydown = e => { if (e.key === 'Enter') { read(); go(shownDate); } };
  document.querySelector('#festival-prev').onclick = () => { read(); go(shiftDate(shownDate, -1)); };
  document.querySelector('#festival-next').onclick = () => { read(); go(shiftDate(shownDate, 1)); };
  document.querySelector('#festival-today').onclick = () => { read(); go(todayIST()); };
  wireImages();
}

function safeRender() {
  render().catch(e => {
    root.innerHTML = `<section class="daily-board"><h2>पंचांग उपलब्ध नहीं</h2><p class="daily-note">${esc(e.message || e)}</p><button id="festival-retry">फिर कोशिश करें</button></section>`;
    document.querySelector('#festival-retry').onclick = safeRender;
  });
}

// आधी रात (IST) बीतते ही "आज" वाली तारीख़ अपने-आप बदल जाए, और आज/आगे की सूची नई तारीख़ से बन जाए
setInterval(() => {
  const t = todayIST();
  if (followToday && shownDate !== t) { shownDate = t; safeRender(); }
}, 60_000);

safeRender();
