/* ARUNODAYA PANCHANG — Vimshottari Dasha Engine
 * Standard 120-year Vimshottari sequence. Uses sidereal Moon longitude and
 * birth civil date/time with the supplied UTC offset. Period boundaries are
 * calculated proportionally using 365.2425-day years.
 */
const ORDER = ["केतु", "शुक्र", "सूर्य", "चंद्र", "मंगल", "राहु", "गुरु", "शनि", "बुध"];
const YEARS = {"केतु":7,"शुक्र":20,"सूर्य":6,"चंद्र":10,"मंगल":7,"राहु":18,"गुरु":16,"शनि":19,"बुध":17};
const NAK_LENGTH = 360 / 27;
const YEAR_MS = 365.2425 * 86400000;
const PLANET_NAMES = {"सू":"सूर्य","चं":"चंद्र","मं":"मंगल","बु":"बुध","गु":"गुरु","शु":"शुक्र","श":"शनि","रा":"राहु","के":"केतु"};
const DESCRIPTIONS = {
 "केतु":"वैराग्य, शोध, भीतर की समझ और पुराने ढर्रों से अलग होने का पारंपरिक विषय",
 "शुक्र":"संबंध, कला, सुविधा, सामंजस्य और भौतिक सुखों का पारंपरिक विषय",
 "सूर्य":"आत्मविश्वास, नेतृत्व, अधिकार और उद्देश्य का पारंपरिक विषय",
 "चंद्र":"मन, परिवार, भावनात्मक सुरक्षा और अनुकूलन का पारंपरिक विषय",
 "मंगल":"ऊर्जा, साहस, पहल और संघर्ष-प्रबंधन का पारंपरिक विषय",
 "राहु":"महत्त्वाकांक्षा, असामान्य अवसर, तीव्र इच्छा और परिवर्तन का पारंपरिक विषय",
 "गुरु":"ज्ञान, मार्गदर्शन, विस्तार और नैतिक निर्णय का पारंपरिक विषय",
 "शनि":"अनुशासन, जिम्मेदारी, धैर्य और दीर्घकालीन प्रयास का पारंपरिक विषय",
 "बुध":"सीखने, संवाद, विश्लेषण और व्यापार का पारंपरिक विषय"
};
const norm = n => ((Number(n) % 360) + 360) % 360;
function parseDateParts(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return {y:value.getUTCFullYear(),m:value.getUTCMonth()+1,d:value.getUTCDate()};
  const s = String(value ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return {y:+m[1],m:+m[2],d:+m[3]};
  const d = new Date(s);
  if (Number.isFinite(d.getTime())) return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate()};
  return null;
}
function parseTime(value) {
  const m = String(value ?? "00:00:00").trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return {h:0,min:0,s:0};
  return {h:Math.min(23,+m[1]),min:Math.min(59,+m[2]),s:Math.min(59,+(m[3]||0))};
}
function birthTimestamp(data) {
  const p = parseDateParts(data.birthDate ?? data.date ?? data.dob);
  if (!p) return NaN;
  const t = parseTime(data.birthTime ?? data.time);
  const tz = Number.isFinite(Number(data.timezoneMinutes)) ? Number(data.timezoneMinutes) : 330;
  return Date.UTC(p.y,p.m-1,p.d,t.h,t.min,t.s) - tz*60000;
}
function fmtDate(ms) {
  if (!Number.isFinite(ms)) return "उपलब्ध नहीं";
  return new Intl.DateTimeFormat("hi-IN",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(ms));
}
function fmtDateTime(ms, tzMinutes) {
  if (!Number.isFinite(ms)) return "उपलब्ध नहीं";
  return new Intl.DateTimeFormat("hi-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true,timeZone:"UTC"}).format(new Date(ms + tzMinutes*60000));
}
function lordAt(index) { return ORDER[((index % 9) + 9) % 9]; }
function childPeriods(parent, level) {
  const startIndex = ORDER.indexOf(parent.lord);
  let cursor = parent.start;
  return Array.from({length:9},(_,i)=>{
    const lord = lordAt(startIndex+i);
    const duration = (parent.end-parent.start) * YEARS[lord] / 120;
    const period = {lord,start:cursor,end:cursor+duration,level,parentLord:parent.lord};
    cursor = period.end;
    return period;
  });
}
function findPeriod(periods, at) { return periods.find(p => at >= p.start && at < p.end) || (at < periods[0]?.start ? periods[0] : periods[periods.length-1]); }
function publicPeriod(p, tz) {
  return {lord:p.lord,planet:p.lord,start:p.start,end:p.end,startDate:fmtDate(p.start),endDate:fmtDate(p.end),startDateTime:fmtDateTime(p.start,tz),endDateTime:fmtDateTime(p.end,tz),durationYears:(p.end-p.start)/YEAR_MS,description:DESCRIPTIONS[p.lord]};
}
export function calculateVimshottariDashas(data = {}) {
  const moon = Number(data.moonLongitude);
  const birth = birthTimestamp(data);
  const tz = Number.isFinite(Number(data.timezoneMinutes)) ? Number(data.timezoneMinutes) : 330;
  const dateValue = data.selectedDate ?? data.transitDate;
  const selected = dateValue ? parseDateParts(dateValue) : parseDateParts(new Date());
  const asOf = selected ? Date.UTC(selected.y,selected.m-1,selected.d,12,0,0) : Date.now();
  if (!Number.isFinite(moon) || !Number.isFinite(birth)) return {ok:false,error:"विम्शोत्तरी दशा निकालने के लिए चंद्रमा का निरयन देशांतर, जन्म तिथि और जन्म समय आवश्यक हैं।"};
  const nakIndex = Math.floor(norm(moon)/NAK_LENGTH);
  const fractionElapsed = (norm(moon) - nakIndex*NAK_LENGTH)/NAK_LENGTH;
  const birthLord = lordAt(nakIndex);
  const balanceYears = YEARS[birthLord]*(1-fractionElapsed);
  const firstStart = birth - YEARS[birthLord]*fractionElapsed*YEAR_MS;
  const maha = [];
  let cursor = firstStart;
  for (let i=0;i<9;i++) {
    const lord = lordAt(ORDER.indexOf(birthLord)+i);
    const start = cursor;
    const end = start + YEARS[lord]*YEAR_MS;
    maha.push({lord,start,end,level:"महादशा"}); cursor=end;
  }
  const currentMaha = findPeriod(maha,asOf);
  const antar = childPeriods(currentMaha,"अंतर्दशा");
  const currentAntar = findPeriod(antar,asOf);
  const pratyantar = childPeriods(currentAntar,"प्रत्यंतरदशा");
  const currentPratyantar = findPeriod(pratyantar,asOf);
  const prana = childPeriods(currentPratyantar,"प्राणदशा");
  const currentPrana = findPeriod(prana,asOf);
  const list = arr => arr.map(p=>publicPeriod(p,tz));
  return {
    ok:true,system:"विम्शोत्तरी दशा",asOf:fmtDate(asOf),birthNakshatraLord:birthLord,balanceAtBirthYears:balanceYears,
    currentMahadasha:publicPeriod(currentMaha,tz),currentAntardasha:publicPeriod(currentAntar,tz),currentPratyantardasha:publicPeriod(currentPratyantar,tz),currentPranadasha:publicPeriod(currentPrana,tz),
    mahadashas:list(maha),antardashas:list(antar),pratyantardashas:list(pratyantar),pranadashas:list(prana),
    note:"गणना चंद्रमा के निरयन देशांतर और विम्शोत्तरी क्रम पर आधारित है। तारीखों के लिए 365.2425-दिन का वर्ष उपयोग हुआ है; अलग पंचांग/परंपरा में सीमाओं में मामूली अंतर हो सकता है। ग्रहों के फलादेश को निश्चित घटना न मानें।"
  };
}
export { DESCRIPTIONS as VIMSHOTTARI_DESCRIPTIONS };
