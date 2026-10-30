const LORDS = [
  { name: "केतु", years: 7 }, { name: "शुक्र", years: 20 }, { name: "सूर्य", years: 6 },
  { name: "चंद्र", years: 10 }, { name: "मंगल", years: 7 }, { name: "राहु", years: 18 },
  { name: "गुरु", years: 16 }, { name: "शनि", years: 19 }, { name: "बुध", years: 17 }
];
const YEAR_MS = 365.2425 * 86400000;
const NAK_SPAN = 360 / 27;
const norm = n => ((Number(n) % 360) + 360) % 360;
const safeDate = d => d instanceof Date ? new Date(d) : new Date(d);
const addYears = (d, y) => new Date(d.getTime() + y * YEAR_MS);
const fmtDate = d => new Intl.DateTimeFormat("hi-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
const fmtDateTime = d => new Intl.DateTimeFormat("hi-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(d);
function orderedFrom(startIndex) { return Array.from({ length: 9 }, (_, i) => LORDS[(startIndex + i) % 9]); }
function subPeriods(parent, startIndex) {
  const sequence = orderedFrom(startIndex);
  const total = sequence.reduce((sum, l) => sum + l.years, 0);
  let cursor = new Date(parent.start);
  return sequence.map((lord, i) => {
    const end = i === sequence.length - 1 ? new Date(parent.end) : new Date(cursor.getTime() + (parent.end.getTime() - parent.start.getTime()) * lord.years / total);
    const p = { lord: lord.name, years: (end - cursor) / YEAR_MS, start: new Date(cursor), end };
    cursor = end;
    return p;
  });
}
function attachLevels(maha, mahaIndex) {
  maha.antardashas = subPeriods(maha, mahaIndex);
  maha.antardashas.forEach((antar, ai) => {
    const antarIndex = LORDS.findIndex(x => x.name === antar.lord);
    antar.pratyantardashas = subPeriods(antar, antarIndex);
    antar.pratyantardashas.forEach((pratyantar, pi) => {
      const pIndex = LORDS.findIndex(x => x.name === pratyantar.lord);
      pratyantar.pranDashas = subPeriods(pratyantar, pIndex);
      pratyantar.pranDashas.forEach((prana, ni) => {
        const nIndex = LORDS.findIndex(x => x.name === prana.lord);
        prana.sookshmaDashas = subPeriods(prana, nIndex);
      });
    });
  });
  return maha;
}
/** Vimshottari periods from sidereal Moon longitude and birth instant. Birth time must already be converted to UTC. */
export function calculateVimshottariDasha(moonLongitude, birthUtc, referenceDate = new Date()) {
  const lon = Number(moonLongitude), birth = safeDate(birthUtc), ref = safeDate(referenceDate);
  if (!Number.isFinite(lon) || Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return { ok: false, reason: "चंद्र का निरयन देशांतर और जन्म तिथि/समय आवश्यक हैं।" };
  const nIndex = Math.min(26, Math.floor(norm(lon) / NAK_SPAN));
  const fraction = (norm(lon) - nIndex * NAK_SPAN) / NAK_SPAN;
  const firstIndex = nIndex % 9;
  const firstLord = LORDS[firstIndex];
  const balanceYears = firstLord.years * (1 - fraction);
  const elapsedYears = firstLord.years - balanceYears;
  const mahaPeriods = [];
  let cursor = new Date(birth.getTime() - elapsedYears * YEAR_MS);
  for (let i = 0; i < 18; i++) {
    const lord = LORDS[(firstIndex + i) % 9];
    const start = new Date(cursor);
    const end = addYears(start, lord.years);
    if (i === 0) {
      mahaPeriods.push({ lord: lord.name, years: lord.years, fullStart: start, start: new Date(birth), end: addYears(birth, balanceYears), balanceAtBirthYears: balanceYears, isBirthMahadasha: true });
      cursor = end;
    } else {
      mahaPeriods.push({ lord: lord.name, years: lord.years, start, end });
      cursor = end;
    }
  }
  // The first period starts before birth mathematically; show the birth-time balance as the usable period.
  const currentMaha = mahaPeriods.find(m => ref >= m.start && ref < m.end) || null;
  if (currentMaha) attachLevels(currentMaha, LORDS.findIndex(x => x.name === currentMaha.lord));
  const currentAntar = currentMaha?.antardashas.find(p => ref >= p.start && ref < p.end) || null;
  const currentPratyantar = currentAntar?.pratyantardashas.find(p => ref >= p.start && ref < p.end) || null;
  const currentPrana = currentPratyantar?.pranDashas.find(p => ref >= p.start && ref < p.end) || null;
  const currentSookshma = currentPrana?.sookshmaDashas.find(p => ref >= p.start && ref < p.end) || null;
  return { ok: true, nakshatraIndex: nIndex, nakshatra: ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढ़ा","उत्तराषाढ़ा","श्रवण","धनिष्ठा","शतभिषा","पूर्वाभाद्रपद","उत्तराभाद्रपद","रेवती"][nIndex], balanceYears, mahaPeriods, currentMaha, currentAntar, currentPratyantar, currentPrana, currentSookshma, referenceDate: ref };
}
export function formatDashaDate(date) { return fmtDate(safeDate(date)); }
export function formatDashaDateTime(date) { return fmtDateTime(safeDate(date)); }
export function dashaDurationYears(period) { return ((period.end - period.start) / YEAR_MS).toFixed(2); }
