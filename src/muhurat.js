
import {
  formatPanchangTime,
  formatPanchangDateTime
} from "./panchak-engine.js";

export function renderMuhuratResult(data, date, timezoneMinutes = 330) {
  const time = (value) =>
    value ? formatPanchangTime(value, timezoneMinutes) : "उपलब्ध नहीं";

  const dateTime = (value) =>
    value ? formatPanchangDateTime(value, timezoneMinutes) : "";

  const safe = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const period = (label, value) => `
    <div class="timing-item">
      <span class="timing-icon">◷</span>
      <div>
        <b>${safe(label)}</b>
        <small>${
          value
            ? `${time(value.start)} – ${time(value.end)}`
            : "इस तारीख के लिए गणना उपलब्ध नहीं"
        }</small>
      </div>
    </div>`;

  const panchak = data.panchak?.active
    ? `पंचक चल रहा है${
        data.panchak.end
          ? ` · समाप्ति ${dateTime(data.panchak.end)}`
          : ""
      }`
    : `पंचक नहीं चल रहा${
        data.panchak?.start
          ? ` · अगली शुरुआत ${dateTime(data.panchak.start)}`
          : ""
      }`;

  return `
    <div class="result-box">
      <h3>${safe(date)}</h3>
      <p>${safe(data.place)} · ${safe(data.weekday)}</p>

      <div class="facts-grid">
        <div class="summary-pill">
          <small>सूर्योदय</small><b>${time(data.sunrise)}</b>
        </div>
        <div class="summary-pill">
          <small>सूर्यास्त</small><b>${time(data.sunset)}</b>
        </div>
      </div>

      <p><b>पंचक:</b> ${safe(panchak)}</p>
      <p class="muted">${safe(data.accuracyNote)}</p>
    </div>

    <div class="panel">
      <h3>दिन के शुभ / अशुभ समय</h3>
      ${period("राहुकाल", data.periods?.rahu)}
      ${period("गुलिक काल", data.periods?.gulika)}
      ${period("यमगण्ड", data.periods?.yamaganda)}
      ${period("अभिजीत मुहूर्त", data.periods?.abhijit)}

      <p class="muted">
        समय चुनी गई तारीख, स्थान और सूर्योदय-सूर्यास्त की गणना पर निर्भर हैं।
      </p>
    </div>
  `;
}

export function updateMuhuratCards(data, timezoneMinutes = 330) {
  const cards = document.querySelectorAll(
    "#page-content .timing-list .timing-item"
  );

  const values = [
    data.periods?.rahu,
    data.periods?.gulika,
    data.periods?.abhijit
  ];

  values.forEach((value, index) => {
    const card = cards[index];
    if (!card) return;

    const small = card.querySelector("small");
    const status = card.querySelector(".timing-status");

    if (small) {
      small.textContent = value
        ? `${formatPanchangTime(value.start, timezoneMinutes)} – ${formatPanchangTime(value.end, timezoneMinutes)}`
        : "गणना उपलब्ध नहीं";
    }

    if (status) {
      status.textContent = value ? "गणना पूरी" : "उपलब्ध नहीं";
    }
  });

  const sunCard = cards[3];

  if (sunCard) {
    const small = sunCard.querySelector("small");
    const status = sunCard.querySelector(".timing-status");

    if (small) {
      small.textContent =
        `सूर्योदय ${formatPanchangTime(data.sunrise, timezoneMinutes)} · ` +
        `सूर्यास्त ${formatPanchangTime(data.sunset, timezoneMinutes)}`;
    }

    if (status) {
      status.textContent =
        data.sunrise && data.sunset ? "गणना पूरी" : "उपलब्ध नहीं";
    }
  }
}
