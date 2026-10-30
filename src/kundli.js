import { SwissEphemeris, Planet, HouseSystem, SiderealMode, LunarPoint } from "@swisseph/browser";

const SIGN_NAMES = ["मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुंभ","मीन"];
const PLANETS = [
  ["सू", Planet.Sun], ["चं", Planet.Moon], ["मं", Planet.Mars], ["बु", Planet.Mercury],
  ["गु", Planet.Jupiter], ["शु", Planet.Venus], ["श", Planet.Saturn]
];
const HOUSE_CENTERS = [[150,45],[78,38],[38,78],[45,150],[38,222],[78,262],[150,255],[222,262],[262,222],[255,150],[262,78],[222,38]];
const NAKSHATRAS = ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","अश्लेषा","मघा","पूर्व फाल्गुनी","उत्तर फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढ़ा","उत्तराषाढ़ा","श्रवण","धनिष्ठा","शतभिषा","पूर्व भाद्रपद","उत्तर भाद्रपद","रेवती"];
const DASHA_LORDS = [["केतु",7],["शुक्र",20],["सूर्य",6],["चंद्र",10],["मंगल",7],["राहु",18],["गुरु",16],["शनि",19],["बुध",17]];
const NAK_SPAN = 360 / 27;
const norm = n => ((n % 360) + 360) % 360;
const signOf = lon => Math.floor(norm(lon) / 30);
const degInSign = lon => norm(lon) % 30;
const signNumber = s => s + 1;
const fmtDeg = lon => {
  const d = degInSign(lon), deg = Math.floor(d), min = Math.floor((d-deg)*60);
  return `${deg}°${String(min).padStart(2,"0")}′`;
};
function nakshatraInfo(longitude) {
  const lon = norm(longitude);
  const index = Math.floor(lon / NAK_SPAN);
  const fraction = (lon - index * NAK_SPAN) / NAK_SPAN;
  return { name: NAKSHATRAS[index], pada: Math.min(4, Math.floor(fraction * 4) + 1), index, fraction };
}
function dateAtYears(start, years) {
  return new Date(start.getTime() + years * 365.2425 * 86400000);
}
function fmtDashaDate(date) {
  return new Intl.DateTimeFormat("hi-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
function vimshottariDasha(moonLongitude, birthUtc) {
  const nak = nakshatraInfo(moonLongitude);
  const firstIndex = nak.index % 9;
  const firstBalance = DASHA_LORDS[firstIndex][1] * (1 - nak.fraction);
  const periods = [];
  let cursor = new Date(birthUtc);
  for (let i = 0; i < 18; i++) {
    const idx = (firstIndex + i) % 9;
    const years = i === 0 ? firstBalance : DASHA_LORDS[idx][1];
    const end = dateAtYears(cursor, years);
    periods.push({ lord: DASHA_LORDS[idx][0], start: new Date(cursor), end, years });
    cursor = end;
  }
  const now = new Date();
  const maha = periods.find(x => now >= x.start && now < x.end) || periods[periods.length - 1];
  let subCursor = new Date(maha.start), antar = null;
  const mahaIndex = DASHA_LORDS.findIndex(x => x[0] === maha.lord);
  for (let j = 0; j < 9; j++) {
    const idx = (mahaIndex + j) % 9;
    const years = maha.years * DASHA_LORDS[idx][1] / 120;
    const end = dateAtYears(subCursor, years);
    if (now >= subCursor && now < end) antar = { lord: DASHA_LORDS[idx][0], start: subCursor, end };
    subCursor = end;
  }
  return { nakshatra: nak.name, pada: nak.pada, balanceYears: firstBalance, mahadasha: maha, antardasha: antar, timeline: periods.slice(0, 9) };
}
function navamsaLongitude(longitude) {
  const lon = norm(longitude);
  const sign = signOf(lon);
  const withinSign = degInSign(lon);
  const navamsaPart = Math.min(8, Math.floor(withinSign / (30 / 9)));
  const modality = sign % 3;
  const firstNavamsaSign = modality === 0 ? sign : modality === 1 ? (sign + 8) % 12 : (sign + 4) % 12;
  const navamsaSign = (firstNavamsaSign + navamsaPart) % 12;
  const degreeWithinNavamsa = (withinSign - navamsaPart * (30 / 9)) * 9;
  return norm(navamsaSign * 30 + degreeWithinNavamsa);
}
function parseBirthDateTime(dateText, timeText, timezoneMinutes) {
  if (typeof dateText !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error("जन्म तारीख चुनें (दिन-महीना-वर्ष)");
  }
  if (typeof timeText !== "string" || !/^\d{2}:\d{2}$/.test(timeText)) {
    throw new Error("जन्म समय सही भरें");
  }
  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59) {
    throw new Error("जन्म तारीख या समय मान्य नहीं है");
  }
  const offset = Number.isFinite(timezoneMinutes) ? timezoneMinutes : 330;
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offset * 60000);
}
function diamondSvg(title, ascSign, planets, note) {
  const byHouse = Array.from({length:12},()=>[]);
  planets.forEach(p => {
    const sign = signOf(p.longitude);
    const house = (sign - ascSign + 12) % 12;
    byHouse[house].push(p.short);
  });
  const centers = HOUSE_CENTERS.map(([x,y],i)=>{
    const sign = (ascSign+i)%12;
    return `<g><text x="${x}" y="${y-9}" class="rashi">${signNumber(sign)}</text><text x="${x}" y="${y+10}" class="planet-label">${byHouse[i].join(" ")}</text></g>`;
  }).join("");
  return `<article class="kundli-chart-card"><h3>${title}</h3><div class="kundli-chart-wrap"><svg class="kundli-diamond" viewBox="0 0 300 300" role="img" aria-label="${title} Diamond Chart"><rect x="5" y="5" width="290" height="290" rx="2" class="chart-frame"/><path d="M5 5 L295 295 M295 5 L5 295 M150 5 L295 150 L150 295 L5 150 Z" class="chart-lines"/>${centers}</svg></div><p class="chart-note">${note}</p></article>`;
}
function planetTable(planets) {
  
const rows = planets.map(p => `<tr><td><span class="planet-full">${p.full}</span><small class="planet-short">${p.short}</small></td><td>${SIGN_NAMES[signOf(p.longitude)]}</td><td>${fmtDeg(p.longitude)}</td><td>${p.retrograde ? "उल्टा" : "सीधा"}</td></tr>`).join("");

  return `<div class="panel planet-table-panel"><h3>ग्रहों की स्थिति</h3><div class="planet-table-scroll"><table class="planet-table"><thead><tr><th>ग्रह</th><th>राशि</th><th>Longitude</th><th>गति</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function dashaPanel(dasha) {
  const maha = dasha?.mahadasha, antar = dasha?.antardasha;
  const mahaText = maha ? `${maha.lord} · ${fmtDashaDate(maha.start)} → ${fmtDashaDate(maha.end)}` : "उपलब्ध नहीं";
  const antarText = antar ? `${antar.lord} · ${fmtDashaDate(antar.start)} → ${fmtDashaDate(antar.end)}` : "उपलब्ध नहीं";
  return `<div class="panel calculation-summary"><h3>विंशोत्तरी दशा</h3><div class="summary-pills"><span>नक्षत्र: ${dasha?.nakshatra || "-"} (${dasha?.pada || "-"})</span><span>अवतरण: ${dasha?.balanceYears ? `${Number(dasha.balanceYears).toFixed(1)} वर्ष` : "-"}</span></div><p><b>महादशा:</b> ${mahaText}</p><p><b>अंतरदशा:</b> ${antarText}</p></div>`;
}
function getPosition(swe,jd,body,short,full) {
  const pos=swe.calculatePosition(jd,body);
  return {short,full,longitude:norm(pos.longitude),speed:pos.longitudeSpeed,retrograde:pos.longitudeSpeed<0};
}

export async function buildKundliData(input) {
  if(!input || !input.date || !input.time) throw new Error("जन्म तारीख और समय भरें");
  if(!Number.isFinite(Number(input.lat))||!Number.isFinite(Number(input.lon))||Math.abs(Number(input.lat))>90||Math.abs(Number(input.lon))>180) throw new Error("अक्षांश या देशांतर मान्य नहीं हैं");

  const utcDate = parseBirthDateTime(input.date, input.time, input.timezoneMinutes);
  const swe = new SwissEphemeris();
  try {
    await swe.init();
    swe.setSiderealMode(SiderealMode.Lahiri);
    const jd = swe.dateToJulianDay(utcDate);
    const ayanamsa = swe.getAyanamsa(jd);
    const houses = swe.calculateHouses(jd, Number(input.lat), Number(input.lon), HouseSystem.WholeSign);
    const ascendant = norm(houses.ascendant - ayanamsa);
    const planets = PLANETS.map(([short, body]) => getPosition(swe, jd, body, short, {
      सू: "सूर्य",
      चं: "चंद्र",
      मं: "मंगल",
      बु: "बुध",
      गु: "गुरु",
      शु: "शुक्र",
      श: "शनि"
    }[short]));
    planets.forEach(p => {
      p.longitude = norm(p.longitude - ayanamsa);
    });
    let node;
    try { node = getPosition(swe, jd, LunarPoint.MeanNode, "रा", "राहु"); }
    catch { node = getPosition(swe, jd, LunarPoint.TrueNode, "रा", "राहु"); }
    node.longitude = norm(node.longitude - ayanamsa);
    planets.push(node, { short: "के", full: "केतु", longitude: norm(node.longitude + 180), speed: node.speed, retrograde: true });
    const ascSign = signOf(ascendant);
    const moon = planets.find(p => p.short === "चं");
    const dasha = vimshottariDasha(moon.longitude, utcDate);
    const d9Planets = planets.map(p => ({ ...p, d1Sign: signOf(p.longitude), longitude: navamsaLongitude(p.longitude) }));
    const d9Asc = signOf(navamsaLongitude(ascendant));
    return {
      name: input.name ? String(input.name).trim() : "",
      date: String(input.date),
      time: String(input.time),
      place: input.place ? String(input.place).trim() : "",
      timezoneMinutes: Number.isFinite(Number(input.timezoneMinutes)) ? Number(input.timezoneMinutes) : 330,
      lat: Number(input.lat),
      lon: Number(input.lon),
      ascendantLongitude: ascendant,
      ascendantSign: ascSign,
      ayanamsa,
      planets,
      d9Planets,
      d9Asc,
      dasha,
      moonSign: signOf(moon.longitude),
      houses
    };
  } finally { try { swe.close(); } catch {} }
}

export function buildKundliHtml(data) {
  if (!data || !Array.isArray(data.planets)) {
    throw new Error("कुंडली डेटा उपलब्ध नहीं है।");
  }
  const ascSign = data.ascendantSign ?? signOf(data.ascendantLongitude ?? 0);
  const name = data.name ? `${data.name} — ` : "";
  const dateLabel = data.date ? new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${data.date}T12:00:00Z`)) : "तारीख उपलब्ध नहीं";
  
const meta = `
  <div class="kundli-meta">
    <b class="kundli-meta-title">${name}${dateLabel}</b>
    <span class="kundli-meta-time">जन्म समय: ${data.time || "अज्ञात समय"}</span>
    <span class="kundli-meta-asc">लग्न: ${SIGN_NAMES[ascSign]} (${fmtDeg(data.ascendantLongitude)})</span>
    <span class="kundli-meta-place">जन्म स्थान: ${data.place || "अज्ञात"}</span>
  </div>`;

  const moonSign =
  data.moonSign ??
  signOf(data.planets.find(p => p.short === "चं")?.longitude ?? 0);

const charts = `
  <div class="kundli-chart-grid kundli-chart-grid-three">
    ${diamondSvg(
      "जन्म कुंडली (D1)",
      ascSign,
      data.planets,
      "लग्न-आधारित राशि कुंडली"
    )}
    ${diamondSvg(
      "चंद्र कुंडली",
      moonSign,
      data.planets,
      "चंद्र राशि को प्रथम भाव मानकर"
    )}
    ${diamondSvg(
      "नवांश कुंडली (D9)",
      data.d9Asc ?? ascSign,
      data.d9Planets || data.planets,
      "नवांश में ग्रहों की स्थिति"
    )}
  </div>`;
  const vargottama = data.planets.filter(p => {
    const d1Sign = signOf(p.longitude);
    const d9Sign = signOf(navamsaLongitude(p.longitude));
    return d1Sign === d9Sign;
  });
  const extra = `<div class="panel calculation-summary"><h3>अन्य विवरण</h3><div class="summary-pills"><span>लग्न: ${SIGN_NAMES[ascSign]}</span><span>चंद्र राशि: ${SIGN_NAMES[data.moonSign ?? signOf(data.planets.find(p => p.short === "चं")?.longitude ?? 0)]}</span><span>वर्गोत्तम ग्रह: ${vargottama.length ? vargottama.map(p => p.full).join(", ") : "कोई"}</span></div></div>`;
  return `${meta}${charts}${planetTable(data.planets)}${dashaPanel(data.dasha)}${extra}`;
}


export async function buildKundliWithData(input) {
  const data = await buildKundliData(input);
  const html = buildKundliHtml(data);
  return { data, html };
}

export async function buildKundli(input) {
  const result = await buildKundliWithData(input);
  return result.html;
}