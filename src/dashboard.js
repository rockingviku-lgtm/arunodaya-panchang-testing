// Arunodaya dashboard: timeline chart, Vedic time (ghati), upcoming vrat-tyohar, theme toggle.
// Purely additive: reads existing engines, never edits existing sections.
import { getPanchangDay, getUpcomingFestivals, todayIST, shiftDate, DEFAULT_PLACE } from "./festival-calendar.js";

const TZ = "Asia/Kolkata";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hm = (d) => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ }).format(d);
const pad = (n) => String(Math.floor(n)).padStart(2, "0");
const dateHi = (iso) => new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: TZ }).format(new Date(iso + "T12:00:00+05:30"));

let clockTimer = null;
let chartHidden = false;

function buildRow(title, segs, start, end) {
  const total = end - start;
  let prev = start.getTime();
  const cells = segs.map((s, i) => {
    const to = s.end ? Math.min(s.end.getTime(), end.getTime()) : end.getTime();
    const w = Math.max(((to - prev) / total) * 100, 2);
    const label = esc(s.label) + (s.end ? `<small>${hm(s.end)}</small>` : "");
    prev = to;
    return `<div class="dash-seg ${i % 2 ? "alt" : ""}" style="flex:${w.toFixed(2)}">${label}</div>`;
  }).join("");
  return `<div class="dash-row"><span>${title}</span><div class="dash-bar">${cells}</div></div>`;
}

function renderChart(el, p) {
  const hours = [];
  const total = (p.end - p.start) / 3600000;
  for (let h = 0; h <= 24; h += 4) hours.push(`<span style="left:${((h / total) * 100).toFixed(1)}%">${hm(new Date(p.start.getTime() + h * 3600000))}</span>`);
  el.innerHTML = `
    <div class="dash-axis"><i></i><div>${hours.join("")}</div></div>
    ${buildRow("तिथि", p.tithis, p.start, p.end)}
    ${buildRow("नक्षत्र", p.nakshatras, p.start, p.end)}
    ${buildRow("योग", p.yogas, p.start, p.end)}
    ${buildRow("करण", p.karanas, p.start, p.end)}
    <div class="dash-sun"><span>सूर्योदय ${hm(p.sunrise)}</span><span>सूर्यास्त ${hm(p.sunset)}</span></div>`;
}

function startClock(el, sunrise) {
  clearInterval(clockTimer);
  const tick = () => {
    const now = new Date();
    let s = (now - sunrise) / 1000;
    if (s < 0) s += 86400;
    const ghatiF = s / 1440;
    const ghati = Math.floor(ghatiF);
    const palF = (ghatiF - ghati) * 60;
    const pal = Math.floor(palF);
    const vipal = Math.floor((palF - pal) * 60);
    const g = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: TZ }).format(now);
    el.innerHTML = `
      <div class="dash-big">${pad(ghati)}:${pad(pal)}:${pad(vipal)}</div>
      <small>घटी : पल : विपल</small>
      <div class="dash-sub">ग्रेगोरियन समय (IST)</div>
      <div class="dash-big">${g}</div>
      <small>घंटा : मिनट : सेकंड</small>`;
  };
  tick();
  clockTimer = setInterval(tick, 1000);
}

const MONS = ["जन॰", "फ़र॰", "मार्च", "अप्रै॰", "मई", "जून", "जुला॰", "अग॰", "सित॰", "अक्टू॰", "नव॰", "दिस॰"];
const TILE = ["#f3d9a6", "#cfe8dc", "#f1cfe0", "#d7ddf3", "#f6cbb0", "#d9ecb8"];
function renderFestivals(el, iso, place) {
  try {
    const rows = [];
    for (const u of getUpcomingFestivals(iso, 30, place, { includeStart: true })) {
      for (const f of u.items) rows.push({ u, f });
    }
    el.innerHTML = rows.length
      ? rows.slice(0, 14).map(({ u, f }, i) => {
          const [, m, d] = u.date.split("-").map(Number);
          const name = f.name || f.label || "";
          const today = u.daysAway === 0;
          return `<div class="dash-fest ${today ? "today" : ""}" style="display:flex;gap:12px;align-items:center">
            <span style="flex:none;width:50px;text-align:center;padding:5px 0;line-height:1.1;color:#1b2150;background:${today ? "#f3a79d" : TILE[i % 6]}"><b style="display:block;font-size:19px;color:#1b2150">${d}</b><small style="color:#1b2150">${MONS[m - 1]}</small></span>
            <span style="min-width:0"><b>${esc(name)}${f.dayNo ? " · दिन " + f.dayNo : ""}</b>
            <small>${today ? "आज" : u.daysAway + " दिन बाद"} · ${esc(u.weekday)}</small></span></div>`;
        }).join("")
      : "<p>अगले 30 दिनों में कोई व्रत या त्योहार दर्ज नहीं है।</p>";
  } catch (e) {
    console.error(e);
    el.innerHTML = "<p>त्योहार लोड नहीं हो सके।</p>";
  }
}

export function mountDashboard(place = DEFAULT_PLACE) {
  const anchor = document.querySelector(".date-strip");
  if (!anchor || document.querySelector("#dash-top")) return;

  const saved = (() => { try { return localStorage.getItem("arunodaya-theme-v2"); } catch { return null; } })();
  document.body.classList.add("dash-on");
  if (saved === "classic") document.body.classList.add("dash-classic"); // दो थीम: Modern (डिफ़ॉल्ट) और Classic (Drik जैसा नारंगी)

  const sec = document.createElement("section");
  sec.id = "dash-top";
  sec.innerHTML = `
    <div class="dash-head">
      <div><div class="dash-date" id="dash-date"></div><div class="dash-tithi" id="dash-tithi"></div></div>
      <div class="dash-loc">📍 ${esc(place.name)}</div>
    </div>
    <div class="dash-tools">
      <button type="button" id="dash-toggle-chart">चार्ट छुपाएं</button>
      <button type="button" id="dash-toggle-theme">थीम बदलें</button>
    </div>
    <div class="dash-chart" id="dash-chart"></div>
    <div class="dash-two">
      <div class="dash-card"><div class="dash-ch">आने वाले व्रत और त्योहार</div><div id="dash-fest"></div><div style="text-align:right;padding:8px 14px"><button type="button" data-more="festivals" style="background:none;border:0;color:var(--dacc);font:inherit;font-size:12px;font-weight:700;letter-spacing:.06em;cursor:pointer">और देखें →</button></div></div>
      <div class="dash-card"><div class="dash-ch">वैदिक समय</div><div class="dash-clock" id="dash-clock"></div></div>
    </div>`;
  anchor.parentNode.insertBefore(sec, anchor);

  const chartEl = sec.querySelector("#dash-chart");
  sec.querySelector("#dash-toggle-chart").addEventListener("click", (e) => {
    chartHidden = !chartHidden;
    chartEl.hidden = chartHidden;
    e.target.textContent = chartHidden ? "चार्ट दिखाएं" : "चार्ट छुपाएं";
  });
  sec.querySelector("#dash-toggle-theme").addEventListener("click", () => {
    const classic = document.body.classList.toggle("dash-classic");
    try { localStorage.setItem("arunodaya-theme-v2", classic ? "classic" : "modern"); } catch {}
  });

  const refresh = (iso) => {
    try {
      const p = getPanchangDay(iso, place);
      sec.querySelector("#dash-date").textContent = dateHi(iso);
      sec.querySelector("#dash-tithi").textContent = `${p.paksha} · ${p.tithis[0]?.label ?? ""} · ${p.nakshatras[0]?.label ?? ""}`;
      renderChart(chartEl, p);
      renderFestivals(sec.querySelector("#dash-fest"), iso, place);
      const real = todayIST();
      let sr = p.sunrise;
      if (iso === real && new Date() < sr) sr = getPanchangDay(shiftDate(real, -1), place).sunrise;
      startClock(sec.querySelector("#dash-clock"), sr);
    } catch (e) {
      console.error("Dashboard failed:", e);
      chartEl.innerHTML = "<p>चार्ट लोड नहीं हो सका।</p>";
    }
  };
  refresh(todayIST());
  document.querySelector("#global-date")?.addEventListener("change", (e) => e.target.value && refresh(e.target.value));
}
