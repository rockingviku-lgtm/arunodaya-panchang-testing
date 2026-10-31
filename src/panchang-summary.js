// "आज का पंचांग" खंड: सूर्योदय-सूर्यास्त, चंद्रोदय, तिथि, नक्षत्र, योग, करण, राशि, संवत।
// हर तारीख़ पर अपने-आप गणना (Asia/Kolkata); आपकी मौजूदा timing-item / timing-icon क्लास ही इस्तेमाल।
import { getPanchangDay, todayIST, DEFAULT_PLACE } from './festival-calendar.js';

const TZ = 'Asia/Kolkata';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = d => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }).format(d);
const dayOf = d => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
const withDate = d => new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'short', timeZone: TZ }).format(d) + ', ' + clock(d);
const at = (d, base) => (!d ? '—' : dayOf(d) === base ? clock(d) : withDate(d));

// [{label,end}] -> "प्रतिपदा 07:01 AM तक · द्वितीया 04:07 AM, 28 अक्तू तक · तृतीया"
const chain = (list, base) => list.map(s => esc(s.label) + (s.end ? ' ' + at(s.end, base) + ' तक' : '')).join('<br>');

// inline स्टाइल: नाम ऊपर, मान नीचे, बाईं ओर संरेखित (किसी CSS पर निर्भर नहीं)
const row = (icon, title, html) => `
  <div class="timing-item" style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start;gap:10px;padding:8px 10px;margin:6px 0;border:1px solid rgba(128,128,128,.28);border-radius:12px">
    <span class="timing-icon" style="flex:0 0 auto;width:24px;text-align:center;line-height:1.4">${icon}</span>
    <div style="text-align:left;flex:1;min-width:0">
      <b style="display:block;font-size:.95em">${esc(title)}</b>${html ? `<small style="display:block;line-height:1.6">${html}</small>` : ''}
    </div>
  </div>`;

export function panchangHtml(p) {
  const b = p.date;
  return [
    row('•', 'सूर्योदय / सूर्यास्त', `${at(p.sunrise, b)} / ${at(p.sunset, b)}`),
    row('•', 'चंद्रोदय / चंद्रास्त', `${at(p.moonrise, b)} / ${at(p.moonset, b)}`),
    row('•', 'तिथि', chain(p.tithis, b)),
    row('•', 'नक्षत्र', chain(p.nakshatras, b)),
    row('•', 'योग', chain(p.yogas, b)),
    row('•', 'करण', chain(p.karanas, b)),
    row('•', 'वार / पक्ष', `${esc(p.weekday)} · ${esc(p.paksha)}`),
    row('•', 'चांद्र मास', `अमांत: ${esc(p.amantaMonth)} · पूर्णिमांत: ${esc(p.purnimantaMonth)}`),
    row('•', 'चंद्र राशि', chain(p.moonRashi, b)),
    row('•', 'सूर्य राशि / नक्षत्र', `${esc(p.sunRashi)} · ${esc(p.sunNakshatra)}`),
    row('•', 'संवत', `विक्रम ${p.vikramSamvat} · शक ${p.shakaSamvat} · गुजराती ${p.gujaratiSamvat}`)
  ].join('');
}

// container: वह div जिसमें सूची भरनी है; dateEl (वैकल्पिक): तारीख़ दिखाने वाला तत्व
export function renderPanchangSummary(container, dateEl, dateISO = todayIST(), place = DEFAULT_PLACE) {
  if (!container) return;
  try {
    const p = getPanchangDay(dateISO, place);
    container.innerHTML = panchangHtml(p);
    if (dateEl) dateEl.textContent = `${dateISO} · ${p.weekday} · ${place.name} · IST`;
  } catch (e) {
    console.error('Panchang summary failed:', e);
    container.innerHTML = '<p>पंचांग की जानकारी लोड नहीं हो सकी। कृपया बाद में पुनः प्रयास करें।</p>';
  }
}

// आधी रात के बाद तारीख़ बदलते ही अपने-आप ताज़ा
export function autoRefreshPanchangSummary(container, dateEl) {
  let shown = todayIST();
  renderPanchangSummary(container, dateEl, shown);
  setInterval(() => {
    const now = todayIST();
    if (now !== shown) { shown = now; renderPanchangSummary(container, dateEl, shown); }
  }, 60000);
}
