ARUNODAYA PANCHANG — Sade Sati Engine integration

Files to copy into the existing Vite project's src/ folder:
- sade-sati-engine.js (new engine)
- kundli-report.js (updated report; keep the matching report file from this bundle)
- kundli-pdf.js (updated PDF integration; keep the matching file from this bundle)
- kundli-pdf.css (same stylesheet used by this report)

What changed:
- PDF generation now calculates geocentric Saturn transit for the selected date (default: current date) using the existing @swisseph/browser ephemeris and Lahiri ayanamsa.
- Calculation date uses 12:00 UTC to avoid ambiguous local time.
- Sade Sati is determined by whether transit Saturn is in the 12th, 1st, or 2nd sign from natal Moon sign, and prints a clear Yes/No plus phase and transit sign.
- If the ephemeris fails, the PDF reports a calculation error instead of silently claiming a result.

Note: The report data should include the natal Moon in `data.planets` with `short: "चं"` and its sidereal `longitude`. The existing app already uses @swisseph/browser. The PDF button now opens an interim loading page while the async transit calculation completes.

Footer preserved:
PDF created via Kundali maker at ARUNODAYA PANCHANG website
©2026. ARUNODAYA PANCHANG All Right Reserved
