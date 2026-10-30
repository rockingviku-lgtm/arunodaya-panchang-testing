// नवग्रह स्थिति (निरयण, लाहिरी), लग्न, चौघड़िया, होरा, चंद्र कला। ब्राउज़र में बिना किसी बाहरी पैकेज के।
// ग्रह: JPL "Keplerian elements for approximate positions (1800–2050)"; सूर्य/चंद्र: festival-calendar.js की Meeus गणना।
// राहु: मध्यम (mean) node; केतु = राहु + 180°।
import { moonSidereal, sunSidereal, elongation, ayanamsa, centuries, jdUT, sunTimes, shiftDate, tithiAt, WEEKDAYS_HI, NAKSHATRAS } from './festival-calendar.js';

const RAD = Math.PI / 180;
const norm = x => ((x % 360) + 360) % 360;
const DAY = 86400000, MIN = 60000;

export const RASHI_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
export const GRAHA_HI = { sun: 'सूर्य', moon: 'चंद्र', mars: 'मंगल', mercury: 'बुध', jupiter: 'गुरु', venus: 'शुक्र', saturn: 'शनि', rahu: 'राहु', ketu: 'केतु' };
export const GRAHA_SHORT = { sun: 'सू', moon: 'चं', mars: 'मं', mercury: 'बु', jupiter: 'गु', venus: 'शु', saturn: 'श', rahu: 'रा', ketu: 'के' };
export const GRAHA_ORDER = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

// [a, a', e, e', I, I', L, L', ϖ, ϖ', Ω, Ω'] (प्रति शताब्दी दर)
const EL = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus: [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
  mars: [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn: [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794]
};

function helio(name, Tc) { // J2000 क्रांतिवृत्त पर सूर्य-केंद्रित (x,y,z) AU
  const p = EL[name];
  const a = p[0] + p[1] * Tc, e = p[2] + p[3] * Tc, I = (p[4] + p[5] * Tc) * RAD;
  const L = p[6] + p[7] * Tc, w = p[8] + p[9] * Tc, O = (p[10] + p[11] * Tc) * RAD;
  const om = w * RAD - O; // perihelion का argument
  let M = ((L - w) % 360) * RAD;
  M = Math.atan2(Math.sin(M), Math.cos(M));
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(om), sw = Math.sin(om), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    (sw * sI) * xp + (cw * sI) * yp
  ];
}

// निरयण भोगांश (0..360)
function lonSidereal(name, ms) {
  const T = centuries(ms);
  if (name === 'sun') return sunSidereal(ms);
  if (name === 'moon') return moonSidereal(ms);
  if (name === 'rahu' || name === 'ketu') {
    const om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T; // औसत आरोही पात (सायन)
    return norm(om - ayanamsa(T) + (name === 'ketu' ? 180 : 0));
  }
  const p = helio(name, T), e = helio('earth', T);
  const lon = Math.atan2(p[1] - e[1], p[0] - e[0]) / RAD; // J2000 सायन
  const prec = 1.3969713 * T + 0.0003086 * T * T; // J2000 -> तिथि का सायन
  return norm(lon + prec - ayanamsa(T));
}

export const planetSign = (g, ms) => Math.floor(lonSidereal(g, ms) / 30);

export function grahaPositions(ms) {
  const out = {};
  for (const g of GRAHA_ORDER) {
    const lon = lonSidereal(g, ms);
    const sign = Math.floor(lon / 30);
    const nk = Math.floor(lon / (360 / 27));
    const pada = Math.floor((lon % (360 / 27)) / (360 / 108)) + 1;
    let retro = g === 'rahu' || g === 'ketu';
    if (!retro && g !== 'sun' && g !== 'moon') {
      const d = ((lonSidereal(g, ms + DAY) - lonSidereal(g, ms - DAY) + 540) % 360) - 180;
      retro = d < 0;
    }
    out[g] = { key: g, name: GRAHA_HI[g], short: GRAHA_SHORT[g], lon, sign, rashi: RASHI_HI[sign], deg: lon - sign * 30, nakshatra: NAKSHATRAS[nk], pada, retro };
  }
  return out;
}

// स्थान (lat, lon पूर्व +) पर उस क्षण का निरयण लग्न
export function ascendantSidereal(ms, lat, lon) {
  const T = centuries(ms);
  const gmst = norm(280.46061837 + 360.98564736629 * (jdUT(ms) - 2451545));
  const theta = norm(gmst + lon) * RAD;
  const eps = (23.439291 - 0.0130042 * T) * RAD;
  const phi = lat * RAD;
  const asc = Math.atan2(Math.cos(theta), -(Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / RAD;
  return norm(asc - ayanamsa(T));
}

// ---------- चंद्र कला ----------
export function moonPhase(ms) {
  const e = elongation(ms);
  const illum = (1 - Math.cos(e * RAD)) / 2 * 100;
  const iv = tithiAt(ms);
  const shukla = iv.index <= 15;
  return { illumination: illum, paksha: shukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष', pakshaDay: shukla ? iv.index : iv.index - 15, tithiIndex: iv.index, elongation: e };
}

// ---------- चौघड़िया ----------
const CH_DAY = ['उद्वेग', 'चर', 'लाभ', 'अमृत', 'काल', 'शुभ', 'रोग'];
const CH_NIGHT = ['शुभ', 'अमृत', 'चर', 'रोग', 'काल', 'लाभ', 'उद्वेग'];
const CH_GOOD = new Set(['शुभ', 'अमृत', 'लाभ', 'चर']);
const DAY_START = [0, 3, 6, 2, 5, 1, 4]; // रवि..शनि
const NIGHT_START = [0, 2, 4, 6, 1, 3, 5];

function weekdayOf(dateISO) { return new Date(`${dateISO}T12:00:00Z`).getUTCDay(); }

export function chaughadiya(dateISO, place) {
  const t = sunTimes(dateISO, place), n = sunTimes(shiftDate(dateISO, 1), place);
  if (t.sunrise == null || t.sunset == null || n.sunrise == null) return { day: [], night: [] };
  const wd = weekdayOf(dateISO);
  const mk = (from, to, cycle, startIdx) => {
    const part = (to - from) / 8;
    return Array.from({ length: 8 }, (_, i) => ({
      name: cycle[(startIdx + i) % 7], good: CH_GOOD.has(cycle[(startIdx + i) % 7]),
      start: new Date(from + i * part), end: new Date(from + (i + 1) * part)
    }));
  };
  return { day: mk(t.sunrise, t.sunset, CH_DAY, DAY_START[wd]), night: mk(t.sunset, n.sunrise, CH_NIGHT, NIGHT_START[wd]) };
}

// ---------- होरा ----------
const HORA_ORDER = ['सूर्य', 'शुक्र', 'बुध', 'चंद्र', 'शनि', 'गुरु', 'मंगल'];
const WEEKDAY_LORD = ['सूर्य', 'चंद्र', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

export function horas(dateISO, place) {
  const t = sunTimes(dateISO, place), n = sunTimes(shiftDate(dateISO, 1), place);
  if (t.sunrise == null || t.sunset == null || n.sunrise == null) return [];
  const first = HORA_ORDER.indexOf(WEEKDAY_LORD[weekdayOf(dateISO)]);
  const out = [];
  for (let i = 0; i < 24; i++) {
    const dayPart = i < 12;
    const from = dayPart ? t.sunrise + (i * (t.sunset - t.sunrise)) / 12 : t.sunset + ((i - 12) * (n.sunrise - t.sunset)) / 12;
    const to = dayPart ? t.sunrise + ((i + 1) * (t.sunset - t.sunrise)) / 12 : t.sunset + ((i - 11) * (n.sunrise - t.sunset)) / 12;
    out.push({ lord: HORA_ORDER[(first + i) % 7], start: new Date(from), end: new Date(to), night: !dayPart });
  }
  return out;
}

export { WEEKDAYS_HI, MIN };
