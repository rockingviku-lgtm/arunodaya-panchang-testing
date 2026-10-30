import { getLagnaData, RASHIS } from './lagna-engine.js';
import { geocodePanchangPlace } from './panchak-engine.js';

const root = document.querySelector('#lagna-app');
let gpsPlace = null; // GPS बटन से मिला स्थान; "गणना करें" दबाने पर भी यही इस्तेमाल होगा

const todayISO = () => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const v = {};
  p.forEach(x => (v[x.type] = x.value));
  return `${v.year}-${v.month}-${v.day}`;
};

const shiftISO = (date, days) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 330 -> "UTC+05:30" (पहले "UTC+5.50" दिखता था)
function fmtOffset(off) {
  const a = Math.abs(off);
  return `UTC${off < 0 ? '-' : '+'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

// समय दिखाना; अगली तारीख़ का समय हो तो तारीख़ भी जोड़ना (जैसे "01:27 AM, 24 अक्तू")
function time(d, off, nextDay) {
  if (!d) return '—';
  const x = new Date(d.getTime() + off * 60000);
  const t = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(x);
  if (!nextDay) return t;
  const day = new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(x);
  return `${t}, ${day}`;
}

async function render() {
  const date = document.querySelector('#lagna-date')?.value || todayISO();
  const city = document.querySelector('#lagna-city')?.value || 'Lucknow, India';
  root.innerHTML = '<section class="daily-board"><div class="daily-board-head"><div><div class="daily-kicker">ARUNODAYA PANCHANG</div><h2>उदय लग्न मुहूर्त</h2><p>स्थान और तारीख के अनुसार खगोलीय गणना</p></div><span class="daily-om">♈</span></div><p class="daily-note">गणना हो रही है…</p></section>';
  try {
    const usingGps = gpsPlace && city.startsWith('GPS:');
    const place = usingGps ? gpsPlace : await geocodePanchangPlace(city);
    const tz = place.timezone || 'Asia/Kolkata';
    const d = await getLagnaData({ date, place, timezone: tz });

    // आज की तारीख़ पर सूर्योदय से पहले (रात/भोर) का लग्न पिछले दिन की खिड़की में होता है
    let active = d.currentWindow;
    let activeData = d;
    const isToday = date === todayISO();
    if (!active && isToday) {
      const prev = await getLagnaData({ date: shiftISO(date, -1), place, timezone: tz });
      if (prev.currentWindow) { active = prev.currentWindow; activeData = prev; }
    }

    const rows = d.windows.map(w => `<div class="daily-lagna-row"><span class="daily-zodiac">${RASHIS[w.sign].symbol}</span><b>${RASHIS[w.sign].name} लग्न</b><span>${time(w.start, d.displayOffset, w.startNextDay)} – ${time(w.end, d.displayOffset, w.endNextDay)}</span></div>`).join('');

    let activeHtml = '';
    if (active) {
      activeHtml = `<div class="daily-note"><b>अभी का लग्न: ${RASHIS[active.sign].name} ${RASHIS[active.sign].symbol}</b><br>समय: ${time(active.start, activeData.displayOffset, active.startNextDay)} – ${time(active.end, activeData.displayOffset, active.endNextDay)}</div>`;
    } else if (isToday) {
      activeHtml = '<p class="daily-note">इस समय के लिए वर्तमान लग्न निर्धारित नहीं हो सका।</p>';
    }

    root.innerHTML = `<section class="daily-board"><div class="daily-board-head"><div><div class="daily-kicker">ARUNODAYA PANCHANG · LAGNA</div><h2>लग्न समय</h2><p>${esc(place.name)} · ${esc(date)} · समय: IST (${fmtOffset(d.displayOffset)})</p></div><span class="daily-om">ॐ</span></div><div class="daily-place-form"><label for="lagna-city">स्थान</label><input id="lagna-city" value="${esc(city)}"><label for="lagna-date">तारीख</label><input id="lagna-date" type="date" value="${esc(date)}"><button id="lagna-refresh">गणना करें</button><button id="lagna-gps" type="button">GPS</button></div>${activeHtml}<div class="daily-subhead"><h3>सूर्योदय से अगले सूर्योदय तक</h3><span>${d.windows.length} लग्न</span></div><div class="daily-lagna-list">${rows || '<p class="daily-note">समय उपलब्ध नहीं।</p>'}</div><p class="daily-disclaimer">लाहिरी अयनांश और स्थानीय सूर्योदय पर आधारित। Drik Panchang की नई दिल्ली और लखनऊ की उदय-लग्न तालिकाओं से मिलाया गया है (मिनट-दर-मिनट सही); दूसरे शहरों में कभी-कभी 1 मिनट का अंतर संभव है। धार्मिक निर्णय से पहले स्थानीय पंचांग से मिला लें।</p></section>`;

    document.querySelector('#lagna-refresh').onclick = render;
    document.querySelector('#lagna-date').onchange = () => { followToday = document.querySelector('#lagna-date').value === todayISO(); render(); };
    document.querySelector('#lagna-city').onkeydown = e => { if (e.key === 'Enter') render(); };
    document.querySelector('#lagna-gps').onclick = () => {
      if (!navigator.geolocation) { alert('इस ब्राउज़र में GPS उपलब्ध नहीं है।'); return; }
      navigator.geolocation.getCurrentPosition(p => {
        gpsPlace = {
          name: 'GPS स्थान',
          lat: p.coords.latitude,
          lon: p.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
        };
        document.querySelector('#lagna-city').value = `GPS: ${gpsPlace.lat.toFixed(4)}, ${gpsPlace.lon.toFixed(4)}`;
        render(); // अब पूरी तालिका भी इसी स्थान के लिए बदल जाएगी
      }, () => alert('GPS स्थान नहीं मिल सका।'), { enableHighAccuracy: true, timeout: 12000 });
    };
  } catch (e) {
    root.innerHTML = `<section class="daily-board"><h2>लग्न गणना नहीं हो सकी</h2><p class="daily-note">${esc(e.message || e)}</p><button id="lagna-retry">फिर कोशिश करें</button></section>`;
    document.querySelector('#lagna-retry').onclick = render;
  }
}

let followToday = true, lastToday = todayISO();
setInterval(() => { const t = todayISO(); if (t !== lastToday) { lastToday = t; const el = document.querySelector('#lagna-date'); if (followToday && el) { el.value = t; render(); } } }, 60_000);

root.innerHTML = `<section class="daily-board"><div class="daily-board-head"><h2>उदय लग्न मुहूर्त</h2></div><div class="daily-place-form"><label for="lagna-city">स्थान</label><input id="lagna-city" value="Lucknow, India"><label for="lagna-date">तारीख</label><input id="lagna-date" type="date" value="${todayISO()}"><button id="lagna-refresh">गणना करें</button></div></section>`;
document.querySelector('#lagna-refresh').onclick = render;
render();
