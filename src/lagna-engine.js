import { calculatePanchang, formatPanchangTime } from './panchak-engine.js';

export const RASHIS = [
  { name: 'मेष', symbol: '♈' }, { name: 'वृषभ', symbol: '♉' }, { name: 'मिथुन', symbol: '♊' },
  { name: 'कर्क', symbol: '♋' }, { name: 'सिंह', symbol: '♌' }, { name: 'कन्या', symbol: '♍' },
  { name: 'तुला', symbol: '♎' }, { name: 'वृश्चिक', symbol: '♏' }, { name: 'धनु', symbol: '♐' },
  { name: 'मकर', symbol: '♑' }, { name: 'कुंभ', symbol: '♒' }, { name: 'मीन', symbol: '♓' }
];

// ---------------------------------------------------------------------------
// निरयण (लाहिरी) लग्न की गणना: स्थानीय नक्षत्र-काल (LST) से उदित क्रांतिवृत्त बिंदु।
// बाहरी लाइब्रेरी की ज़रूरत नहीं। Drik Panchang की उदय-लग्न तालिका से मिलाया गया:
//   नई दिल्ली (25 अक्टू 2026) और लखनऊ (26 अक्टू 2026), कुल 26 राशि-सीमाएँ, मिनट-दर-मिनट सही।
// ---------------------------------------------------------------------------
const RAD = Math.PI / 180;
const norm = x => ((x % 360) + 360) % 360;
const julianDay = ms => ms / 86_400_000 + 2440587.5;

// Drik की सारणी में हर राशि-सीमा, सटीक खगोलीय गणना से औसतन 14.5 सेकंड पहले आती है
// (26 में से हर सीमा के लिए 13.2 से 15.9 सेकंड का दायरा चलता है)। इसी सुधार से मिनट Drik जैसे आते हैं।
export const DRIK_LEAD_SECONDS = 14.5;

function nutation(T) {
  const O = norm(125.04452 - 1934.136261 * T);
  const L = norm(280.4665 + 36000.7698 * T);
  const Lm = norm(218.3165 + 481267.8813 * T);
  return {
    dpsi: (-17.20 * Math.sin(O * RAD) - 1.32 * Math.sin(2 * L * RAD) - 0.23 * Math.sin(2 * Lm * RAD) + 0.21 * Math.sin(2 * O * RAD)) / 3600,
    deps: (9.20 * Math.cos(O * RAD) + 0.57 * Math.cos(2 * L * RAD) + 0.10 * Math.cos(2 * Lm * RAD) - 0.09 * Math.cos(2 * O * RAD)) / 3600
  };
}

// लाहिरी (चित्रपक्ष) अयनांश: 2000.0 पर 23.857092°, प्रति शताब्दी ~1.39697°
function lahiriAyanamsa(T) {
  return 23.857092 + 1.3969713 * T + 0.0003086 * T * T;
}

// सायन (tropical) लग्न, डिग्री में
function tropicalAscendant(ms, lat, lon) {
  const J = julianDay(ms);
  const T = (J - 2451545) / 36525;
  const { dpsi, deps } = nutation(T);
  const eps = 23.439291 - 0.0130042 * T + deps;
  const gmst = norm(280.46061837 + 360.98564736629 * (J - 2451545) + 0.000387933 * T * T);
  const ramc = norm(gmst + dpsi * Math.cos(eps * RAD) + lon) * RAD;
  const e = eps * RAD;
  const phi = lat * RAD;
  return norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(e) + Math.tan(phi) * Math.sin(e))) / RAD);
}

// निरयण लग्न की राशि: 0 = मेष ... 11 = मीन (Drik के अनुसार सुधारे हुए समय पर)
function makeSignAt(lat, lon) {
  const lead = DRIK_LEAD_SECONDS * 1000;
  return ms => {
    const t = ms + lead;
    const T = (julianDay(t) - 2451545) / 36525;
    return Math.floor(norm(tropicalAscendant(t, lat, lon) - lahiriAyanamsa(T)) / 30);
  };
}

function dateShift(date, days) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// समय-क्षेत्र का UTC से अंतर (मिनटों में), उस तारीख़ के लिए
function zoneOffset(date, zone = 'Asia/Kolkata') {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date(`${date}T12:00:00Z`));
    const s = parts.find(x => x.type === 'timeZoneName')?.value || 'GMT+5:30';
    if (s === 'GMT') return 0;
    const m = s.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 330;
  } catch {
    return 330;
  }
}

// राशि बदलने का ठीक क्षण: lo पर राशि `sign` थी, hi पर बदल चुकी है
function bisect(signAt, sign, lo, hi) {
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (signAt(mid) === sign) lo = mid; else hi = mid;
  }
  return hi;
}

export async function getLagnaData({ date, place, timezone = 'Asia/Kolkata' }) {
  const offset = zoneOffset(date, timezone);
  const today = await calculatePanchang({ date, lat: place.lat, lon: place.lon, timezoneMinutes: offset, place: place.name });
  if (!today.sunrise) throw new Error('इस स्थान के लिए सूर्योदय नहीं निकाला जा सका।');

  const lat = +place.lat, lon = +place.lon;
  const signAt = makeSignAt(lat, lon);
  const sunrise = today.sunrise.getTime();

  // 1) सूर्योदय के समय जो लग्न उदित है, वह असल में कब शुरू हुआ था (सूर्योदय से पहले)
  const STEP = 120_000; // कोई लग्न 2 मिनट से बहुत लंबा चलता है
  const firstSign = signAt(sunrise);
  let back = sunrise;
  while (signAt(back - STEP) === firstSign && sunrise - back < 6 * 3_600_000) back -= STEP;
  // back-STEP पर दूसरी राशि थी, back पर firstSign: बदलाव का पहला क्षण खोजें
  let lo = back - STEP, hi = back;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (signAt(mid) === firstSign) hi = mid; else lo = mid;
  }
  const firstStart = hi;

  // 2) वहाँ से 12 लग्न आगे: आख़िरी लग्न तब ख़त्म होता है जब सूर्योदय वाला लग्न फिर आ जाए
  const windows = [];
  let windowStart = firstStart;
  let sign = firstSign;
  let prev = firstStart + 1;
  const limit = firstStart + 26 * 3_600_000;
  while (windows.length < 12 && prev < limit) {
    const sample = prev + STEP;
    const s = signAt(sample);
    if (s !== sign) {
      const boundary = bisect(signAt, sign, prev, sample);
      windows.push({ sign, start: new Date(windowStart), end: new Date(boundary) });
      windowStart = boundary;
      sign = s;
    }
    prev = sample;
  }
  if (windows.length < 12) throw new Error('इस स्थान के लिए 12 लग्न नहीं निकल सके।');

  // दिखाने का समय हमेशा भारतीय मानक समय (IST, UTC+05:30); जो समय अगली तारीख़ में पड़े उसे चिह्नित करना
  const DISPLAY_OFFSET = 330;
  const [y, mo, d] = date.split('-').map(Number);
  const baseDay = Math.floor(Date.UTC(y, mo - 1, d) / 86_400_000);
  const localDay = ms => Math.floor((ms + DISPLAY_OFFSET * 60_000) / 86_400_000);
  const marked = windows.map(w => ({
    ...w,
    startNextDay: localDay(w.start.getTime()) > baseDay,
    endNextDay: localDay(w.end.getTime()) > baseDay
  }));

  return {
    date, place, timezone, offset, displayOffset: DISPLAY_OFFSET,
    sunrise: today.sunrise, sunset: today.sunset,
    windows: marked,
    tithi: today.tithi, nakshatra: today.nakshatra, yoga: today.yoga, karana: today.karana,
    weekday: today.weekday, periods: today.periods, panchak: today.panchak,
    formatTime: t => formatPanchangTime(t, DISPLAY_OFFSET),
    currentWindow: marked.find(w => Date.now() >= w.start.getTime() && Date.now() < w.end.getTime()) || null
  };
}

export { zoneOffset };
