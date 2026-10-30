/**
 * Rule-based traditional indicators for Arunodaya Kundli.
 * Inputs must be sidereal/Lahiri longitudes in degrees (0..360).
 */
const norm = n => ((Number(n) % 360) + 360) % 360;
const signOf = lon => Math.floor(norm(lon) / 30);
const houseOf = (lon, asc) => ((signOf(lon) - signOf(asc) + 12) % 12) + 1;
const SIGNS = ["मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुंभ","मीन"];

export function getHousePlacements({ ascendantLongitude, planets = [] } = {}) {
  if (!Number.isFinite(Number(ascendantLongitude))) throw new Error("लग्न की longitude आवश्यक है।");
  const ascSign = signOf(ascendantLongitude);
  return Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    signIndex: (ascSign + i) % 12,
    sign: SIGNS[(ascSign + i) % 12],
    occupants: planets.filter(p => houseOf(p.longitude, ascendantLongitude) === i + 1).map(p => p.full || p.short)
  }));
}

export function getKundliIndicators({ ascendantLongitude, planets = [] } = {}) {
  if (!Number.isFinite(Number(ascendantLongitude)) || !Array.isArray(planets)) throw new Error("मान्य लग्न और ग्रह-डेटा आवश्यक है।");
  const find = (...keys) => planets.find(p => keys.includes(p.short) || keys.includes(p.full));
  const mars = find("मं", "मंगल"), rahu = find("रा", "राहु"), ketu = find("के", "केतु");
  const result = [];
  if (mars && Number.isFinite(Number(mars.longitude))) {
    const house = houseOf(mars.longitude, ascendantLongitude);
    const present = [1, 2, 4, 7, 8, 12].includes(house);
    result.push({ id: "manglik", title: "मंगल दोष (लग्न से)", status: present ? "परंपरागत संकेत मौजूद" : "इस नियम से संकेत नहीं",
      detail: `मंगल ${house}वें भाव में है। इस सरल जाँच में भाव 1, 2, 4, 7, 8 और 12 देखे जाते हैं।`,
      method: "विभिन्न परंपराओं में चंद्र/शुक्र से जाँच और अपवाद अलग हो सकते हैं।" });
  } else result.push({ id: "manglik", title: "मंगल दोष", status: "जाँच उपलब्ध नहीं", detail: "मंगल की स्थिति उपलब्ध नहीं है।" });

  if (rahu && ketu && Number.isFinite(Number(rahu.longitude)) && Number.isFinite(Number(ketu.longitude))) {
    const other = planets.filter(p => !["रा","राहु","के","केतु"].includes(p.short) && !["राहु","केतु"].includes(p.full));
    const r = norm(rahu.longitude), k = norm(ketu.longitude), span = norm(k - r);
    const onArc = lon => norm(lon - r) <= span;
    const oneSide = other.length > 0 && (other.every(p => onArc(p.longitude)) || other.every(p => !onArc(p.longitude)));
    result.push({ id: "kaalsarp", title: "कालसर्प योग (सरल जाँच)",
      status: oneSide ? "एक-पक्षीय स्थिति मिली — सत्यापन आवश्यक" : "सरल नियम से पूर्ण स्थिति नहीं मिली",
      detail: oneSide ? "मुख्य ग्रह राहु-केतु अक्ष के एक ओर दिखाई देते हैं। इसे अंतिम निष्कर्ष मानने से पहले पारंपरिक नियमों से सत्यापित करें।" : "उपलब्ध ग्रह राहु-केतु अक्ष के दोनों ओर हैं या डेटा अधूरा है।",
      method: "यह सात पारंपरिक ग्रहों पर आधारित सरल संकेत है; विभिन्न परंपराओं में नियम अलग हो सकते हैं。" });
  } else result.push({ id: "kaalsarp", title: "कालसर्प योग", status: "जाँच उपलब्ध नहीं", detail: "राहु और केतु की स्थिति उपलब्ध नहीं है।" });
  return result;
}
