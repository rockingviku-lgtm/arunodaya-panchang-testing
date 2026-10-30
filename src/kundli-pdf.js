import { buildKundliReportSections, mountKundliPrintButton } from "./kundli-report.js";
import { calculateTransitSaturn } from "./sade-sati-engine.js";

/** Builds the complete report; browser print dialog lets the user choose Save as PDF. */
export async function createKundliPdfReport(data) {
  const moon = (data?.planets || []).find(p => p.short === "चं" || p.full === "चंद्र");
  const date = data?.selectedDate || data?.transitDate || new Date().toISOString().slice(0, 10);
  let reportData = { ...data, selectedDate: date };
  if (moon && Number.isFinite(Number(moon.longitude))) {
    try {
      const transit = await calculateTransitSaturn(date);
      reportData = {
        ...reportData,
        transitSaturnLongitude: transit.longitude,
        currentTransitSaturnLongitude: transit.longitude,
        sadeSatiTransit: transit
      };
    } catch (error) {
      console.warn("Transit Saturn unavailable; report will still be generated.", error);
    }
  }
  return buildKundliReportSections(reportData);
}

export function addKundliPdfButton(resultElement, getData, options = {}) {
  return mountKundliPrintButton({
    resultElement,
    getReportHtml: async () => createKundliPdfReport(getData()),
    ...options
  });
}
