const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ");
}

function mapPlace(place) {
  return {
    name: place.name || "",
    country: place.country || "",
    region: place.admin1 || "",
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    timezone: place.timezone || "UTC"
  };
}

function isBarabankiUttarPradesh(place) {
  const name = normalizeText(place.name);
  const region = normalizeText(place.region);
  const country = normalizeText(place.country);

  return (
    name === "barabanki" &&
    (region.includes("uttar pradesh") || region === "up") &&
    (country === "india" || country === "in")
  );
}

async function fetchPlaces(name, countryCode = "") {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  if (countryCode) {
    url.searchParams.set("countryCode", countryCode);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("जन्मस्थान खोजने में समस्या हुई। दोबारा कोशिश करें।");
  }

  const data = await response.json();
  return (data.results || []).map(mapPlace);
}

export async function searchBirthPlaces(query) {
  const name = String(query || "").trim();

  if (name.length < 2) return [];

  const isBarabankiQuery = normalizeText(name).includes("barabanki");

  // Search India specifically for Barabanki so a similarly named place
  // in another state/country does not appear ahead of the UP location.
  let places = [];
  if (isBarabankiQuery) {
    const [indiaResults, generalResults] = await Promise.all([
      fetchPlaces(name, "IN"),
      fetchPlaces(name)
    ]);
    places = [...indiaResults, ...generalResults];
  } else {
    places = await fetchPlaces(name);
  }

  // Remove duplicates while retaining the place's coordinates and timezone.
  const unique = new Map();
  for (const place of places) {
    const key = [
      normalizeText(place.name),
      normalizeText(place.region),
      normalizeText(place.country),
      place.latitude,
      place.longitude
    ].join("|");

    if (!unique.has(key)) unique.set(key, place);
  }

  const results = [...unique.values()];

  // Always rank Barabanki, Uttar Pradesh, India first when it is returned
  // by the geocoding service. Do not silently substitute Odisha.
  results.sort((a, b) => {
    const aPreferred = isBarabankiUttarPradesh(a);
    const bPreferred = isBarabankiUttarPradesh(b);
    if (aPreferred && !bPreferred) return -1;
    if (!aPreferred && bPreferred) return 1;
    return 0;
  });

  return results;
}

export function getBirthTimezoneOffset(dateText, timeText, timezone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || "")) {
    throw new Error("जन्म तारीख YYYY-MM-DD प्रारूप में भरें।");
  }

  if (!/^\d{2}:\d{2}$/.test(timeText || "")) {
    throw new Error("जन्म समय सही भरें।");
  }

  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);

  const localCheck = new Date(Date.UTC(year, month - 1, day));

  if (
    localCheck.getUTCFullYear() !== year ||
    localCheck.getUTCMonth() !== month - 1 ||
    localCheck.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    throw new Error("जन्म तारीख या समय मान्य नहीं है।");
  }

  if (!timezone || typeof timezone !== "string") {
    throw new Error("जन्मस्थान का टाइम ज़ोन उपलब्ध नहीं है।");
  }

  const wallClockAsUTC = Date.UTC(year, month - 1, day, hour, minute);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(wallClockAsUTC))
      .filter(part => part.type !== "literal")
      .map(part => [part.type, Number(part.value)])
  );

  const utcInstant = new Date(wallClockAsUTC);
  const utcFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const utc = Object.fromEntries(
    utcFormatter.formatToParts(utcInstant)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, Number(part.value)])
  );

  const localAsUTC = Date.UTC(
    parts.year, parts.month - 1, parts.day, parts.hour, parts.minute
  );

  const utcAsUTC = Date.UTC(
    utc.year, utc.month - 1, utc.day, utc.hour, utc.minute
  );

  return Math.round((localAsUTC - utcAsUTC) / 60000);
}