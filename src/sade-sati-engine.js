import { SwissEphemeris, Planet, SiderealMode } from "@swisseph/browser";

const norm = value => ((Number(value) % 360) + 360) % 360;
const SIGNS_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"];
const SIGN_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

/**
 * Computes geocentric sidereal (Lahiri) Saturn longitude for a selected calendar date.
 * Uses the same @swisseph/browser ephemeris dependency as the site's natal chart engine.
 * The selected date is evaluated at 12:00 UTC to avoid a local-time ambiguity.
 */
export async function calculateTransitSaturn(dateInput = new Date()) {
  let date;
  if (dateInput instanceof Date) {
    date = new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate(), 12, 0, 0));
  } else {
    const text = String(dateInput || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("गोचर तिथि YYYY-MM-DD प्रारूप में दें।");
    const [year, month, day] = text.split("-").map(Number);
    date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new Error("गोचर तिथि मान्य नहीं है।");
    }
  }

  const swe = new SwissEphemeris();
  try {
    await swe.init();
    swe.setSiderealMode(SiderealMode.Lahiri);
    const jd = swe.dateToJulianDay(date);
    const tropical = swe.calculatePosition(jd, Planet.Saturn);
    const ayanamsa = swe.getAyanamsa(jd);
    const longitude = norm(tropical.longitude - ayanamsa);
    const signIndex = Math.floor(longitude / 30);
    return {
      date: date.toISOString().slice(0, 10),
      longitude,
      tropicalLongitude: norm(tropical.longitude),
      ayanamsa,
      signIndex,
      sign: SIGNS_HI[signIndex],
      signEnglish: SIGN_EN[signIndex],
      retrograde: Number(tropical.longitudeSpeed) < 0,
      speed: Number(tropical.longitudeSpeed),
      method: "Geocentric sidereal longitude · Lahiri ayanamsa · 12:00 UTC"
    };
  } finally {
    try { swe.close(); } catch {}
  }
}

/** Calculates the traditional three-sign Sade Sati test from Moon and transit Saturn signs. */
export function evaluateSadeSati(moonLongitude, transitSaturnLongitude) {
  const moon = Number(moonLongitude), saturn = Number(transitSaturnLongitude);
  if (!Number.isFinite(moon) || !Number.isFinite(saturn)) {
    return { status: "गणना नहीं हो सकी", phase: "", active: null, reason: "जन्म चंद्र और गोचर शनि का निरयन देशांतर आवश्यक है।" };
  }
  const moonSign = Math.floor(norm(moon) / 30);
  const saturnSign = Math.floor(norm(saturn) / 30);
  const relative = (saturnSign - moonSign + 12) % 12;
  const names = ["प्रथम चरण", "द्वितीय चरण", "तृतीय चरण"];
  if (relative === 11 || relative === 0 || relative === 1) {
    const phaseIndex = relative === 11 ? 0 : relative === 0 ? 1 : 2;
    return {
      active: true,
      status: "हाँ — साढ़ेसाती चल रही है",
      phase: `${names[phaseIndex]} — शनि ${relative === 11 ? "चंद्र राशि से 12वीं राशि" : relative === 0 ? "जन्म चंद्र राशि" : "चंद्र राशि से दूसरी राशि"} में है`,
      moonSign: SIGNS_HI[moonSign],
      saturnSign: SIGNS_HI[saturnSign],
      moonSignIndex: moonSign,
      saturnSignIndex: saturnSign
    };
  }
  return {
    active: false,
    status: "नहीं — साढ़ेसाती नहीं चल रही",
    phase: "गोचर शनि जन्म चंद्र राशि से 12वीं, 1वीं या 2वीं राशि में नहीं है",
    moonSign: SIGNS_HI[moonSign],
    saturnSign: SIGNS_HI[saturnSign],
    moonSignIndex: moonSign,
    saturnSignIndex: saturnSign
  };
}

export async function calculateSadeSatiForDate(moonLongitude, dateInput = new Date()) {
  const transit = await calculateTransitSaturn(dateInput);
  return { ...evaluateSadeSati(moonLongitude, transit.longitude), transit };
}
