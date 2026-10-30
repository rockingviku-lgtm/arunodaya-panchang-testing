// अंकज्योतिष: मूलांक, भाग्यांक, नामांक (कैल्डियन + पाइथागोरियन), वैयक्तिक वर्ष/माह/दिन (1900–2099), शुभ तारीख़ें — रंगीन तालिकाओं में।
// नाम हिंदी (देवनागरी) या अंग्रेज़ी (रोमन) में; हिंदी नाम का रोमन रूप दिखाया जाता है ताकि जाँचकर सुधार सकें।
import { todayIST } from './festival-calendar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const reduce = n => { n = Math.abs(n); while (n > 9) n = String(n).split('').reduce((s, d) => s + +d, 0); return n; };
const digitsSum = n => String(Math.abs(n)).split('').reduce((s, d) => s + +d, 0);

const CHALDEAN = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1, J: 1, K: 2, L: 3, M: 4, N: 5, O: 7, P: 8, Q: 1, R: 2, S: 3, T: 4, U: 6, V: 6, W: 6, X: 5, Y: 1, Z: 7 };
const PYTH = {}; 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((c, i) => { PYTH[c] = (i % 9) + 1; });
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

// देवनागरी -> रोमन (अनुमानित ध्वन्यात्मक)
const CONS = { 'क': 'K', 'ख': 'KH', 'ग': 'G', 'घ': 'GH', 'ङ': 'N', 'च': 'CH', 'छ': 'CHH', 'ज': 'J', 'झ': 'JH', 'ञ': 'N', 'ट': 'T', 'ठ': 'TH', 'ड': 'D', 'ढ': 'DH', 'ण': 'N', 'त': 'T', 'थ': 'TH', 'द': 'D', 'ध': 'DH', 'न': 'N', 'प': 'P', 'फ': 'F', 'ब': 'B', 'भ': 'BH', 'म': 'M', 'य': 'Y', 'र': 'R', 'ल': 'L', 'व': 'V', 'श': 'SH', 'ष': 'SH', 'स': 'S', 'ह': 'H', 'क्ष': 'KSH', 'ज्ञ': 'GY' };
const VOW = { 'अ': 'A', 'आ': 'A', 'इ': 'I', 'ई': 'I', 'उ': 'U', 'ऊ': 'U', 'ए': 'E', 'ऐ': 'AI', 'ओ': 'O', 'औ': 'AU', 'ऋ': 'RI' };
const MATRA = { 'ा': 'A', 'ि': 'I', 'ी': 'I', 'ु': 'U', 'ू': 'U', 'े': 'E', 'ै': 'AI', 'ो': 'O', 'ौ': 'AU', 'ृ': 'RI' };
export function toRoman(text) {
  const chars = [...text.normalize('NFC').replace(/[़]/g, '')];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    let c = chars[i];
    if (/[A-Za-z]/.test(c)) { out += c.toUpperCase(); continue; }
    if (c === ' ' || c === '.' || c === '-') { out += ' '; continue; }
    if (VOW[c]) { out += VOW[c]; continue; }
    if (c === 'ं' || c === 'ँ') { out += 'N'; continue; }
    if (c === 'ः') { out += 'H'; continue; }
    if (CONS[c] || (c === 'क' && chars[i + 1] === '्' && chars[i + 2] === 'ष')) {
      let cons = CONS[c];
      if (c === 'क' && chars[i + 1] === '्' && chars[i + 2] === 'ष') { cons = 'KSH'; i += 2; }
      else if (c === 'ज' && chars[i + 1] === '्' && chars[i + 2] === 'ञ') { cons = 'GY'; i += 2; }
      const n = chars[i + 1];
      if (n === '्') { out += cons; i++; }
      else if (MATRA[n]) { out += cons + MATRA[n]; i++; }
      else { const last = !chars[i + 1] || chars[i + 1] === ' ' || chars[i + 1] === '.'; out += last ? cons : cons + 'A'; }
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

export function nameNumbers(text) {
  const roman = toRoman(text), letters = roman.replace(/[^A-Z]/g, '').split('');
  const chaldeanTotal = letters.reduce((s, c) => s + CHALDEAN[c], 0);
  const pythTotal = letters.reduce((s, c) => s + PYTH[c], 0);
  const vow = letters.filter(c => VOWELS.has(c)), con = letters.filter(c => !VOWELS.has(c));
  const vowTotal = vow.reduce((s, c) => s + PYTH[c], 0), conTotal = con.reduce((s, c) => s + PYTH[c], 0);
  return { roman, letters, chaldeanTotal, chaldean: reduce(chaldeanTotal), pythTotal, pyth: reduce(pythTotal), soul: reduce(vowTotal), soulTotal: vowTotal, persona: reduce(conTotal), personaTotal: conTotal };
}

export function personal(dob, targetISO) {
  const [, bm, bd] = dob.split('-').map(Number), [ty, tm, td] = targetISO.split('-').map(Number);
  const py = reduce(bd + bm + digitsSum(ty)), pm = reduce(py + tm), pd = reduce(pm + td);
  return { py, pm, pd };
}

const N = {
  1: { planet: 'सूर्य', trait: 'नेतृत्व, आत्मविश्वास, स्वतंत्रता; अहंकार/ज़िद से बचें', career: 'प्रशासन, राजनीति, उद्यमी, सरकारी सेवा, प्रबंधन', love: 'निष्ठावान पर हावी होने की प्रवृत्ति; साथी को स्थान दें', health: 'हृदय, नेत्र, रक्तचाप', color: 'सुनहरा, नारंगी, लाल', day: 'रविवार, सोमवार', gem: 'माणिक्य', friends: '1, 2, 3, 9' },
  2: { planet: 'चंद्र', trait: 'संवेदनशील, सहयोगी, कल्पनाशील; मन का उतार-चढ़ाव', career: 'कला, परामर्श, शिक्षा, होटल, जल-संबंधी कार्य', love: 'भावुक और निभाने वाले; अति-निर्भरता से बचें', health: 'मन-नींद, पाचन, कफ', color: 'सफ़ेद, क्रीम, हल्का हरा', day: 'सोमवार, रविवार', gem: 'मोती', friends: '1, 2, 3, 5' },
  3: { planet: 'गुरु', trait: 'ज्ञान, आशावाद, अभिव्यक्ति; फैलाव में अनुशासन ज़रूरी', career: 'शिक्षण, कानून, सलाहकार, लेखन, धर्म/समाज-सेवा', love: 'उदार और सम्मानजनक संबंध', health: 'लिवर, वज़न, शुगर पर ध्यान', color: 'पीला, सुनहरा', day: 'गुरुवार', gem: 'पुखराज', friends: '1, 2, 3, 9' },
  4: { planet: 'राहु', trait: 'व्यावहारिक, अलग सोच, मेहनती; अचानक उतार-चढ़ाव', career: 'तकनीक, इंजीनियरिंग, शोध, राजनीति, विदेश-संबंधी', love: 'संबंधों में ग़लतफ़हमी जल्दी — खुला संवाद रखें', health: 'तनाव, नसें, एलर्जी', color: 'नीला, स्लेटी', day: 'शनिवार, रविवार', gem: 'गोमेद', friends: '1, 5, 6, 7' },
  5: { planet: 'बुध', trait: 'तेज़ बुद्धि, संवाद-कुशल, चंचल; स्थिरता का अभ्यास करें', career: 'व्यापार, मीडिया, बैंकिंग, बिक्री, लेखा', love: 'मिलनसार पर अस्थिर — प्रतिबद्धता पर ध्यान', health: 'त्वचा, नसें, श्वास', color: 'हरा, हल्का भूरा', day: 'बुधवार, शुक्रवार', gem: 'पन्ना', friends: '1, 4, 5, 6' },
  6: { planet: 'शुक्र', trait: 'सौंदर्य-प्रेमी, पारिवारिक, कलात्मक; सुख-सुविधा में अति', career: 'फ़ैशन, कला, डिज़ाइन, होटल, मनोरंजन, सौंदर्य', love: 'प्रेम और परिवार को प्राथमिकता', health: 'गला, मूत्र, शुगर पर सतर्कता', color: 'सफ़ेद, गुलाबी, हल्का नीला', day: 'शुक्रवार, बुधवार', gem: 'हीरा/ओपल', friends: '4, 5, 6, 8' },
  7: { planet: 'केतु', trait: 'चिंतनशील, आध्यात्मिक, एकांतप्रिय; संशय से बचें', career: 'शोध, अध्यात्म, चिकित्सा, लेखन, विश्लेषण', love: 'गहरे पर कम व्यक्त — भावनाएँ साझा करें', health: 'पाचन, मन, एलर्जी', color: 'सफ़ेद, हल्का पीला, हरा', day: 'सोमवार, रविवार', gem: 'लहसुनिया', friends: '1, 2, 7' },
  8: { planet: 'शनि', trait: 'अनुशासित, मेहनती, देर से पर टिकाऊ सफलता', career: 'न्याय, उद्योग, ज़मीन-जायदाद, प्रशासन, लोहा/तेल', love: 'गंभीर और ज़िम्मेदार; कठोरता कम रखें', health: 'हड्डी, जोड़, थकान', color: 'काला, गहरा नीला', day: 'शनिवार', gem: 'नीलम', friends: '5, 6, 8' },
  9: { planet: 'मंगल', trait: 'साहसी, ऊर्जावान, दानशील; क्रोध पर नियंत्रण', career: 'सेना/पुलिस, खेल, इंजीनियरिंग, सर्जरी, ज़मीन', love: 'जोशीले और उदार; जल्दबाज़ी से बचें', health: 'रक्त, चोट-दुर्घटना, क्रोध', color: 'लाल, मरून', day: 'मंगलवार, गुरुवार', gem: 'मूंगा', friends: '1, 2, 3, 9' }
};
const THEME = { 1: 'नई शुरुआत, पहल, नेतृत्व', 2: 'सहयोग, धैर्य, संबंध', 3: 'रचनात्मकता, अभिव्यक्ति, सामाजिक मेल', 4: 'मेहनत, नींव, व्यवस्था', 5: 'बदलाव, यात्रा, स्वतंत्रता', 6: 'परिवार, ज़िम्मेदारी, सौंदर्य', 7: 'चिंतन, अध्ययन, स्वास्थ्य', 8: 'धन, शक्ति, करियर-विस्तार', 9: 'समापन, दान, पुराना छोड़ना' };
const MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];

const HEAD = ['#e0771f', '#0f8f7d', '#7b4fd6', '#d6457f', '#2f7fd6', '#3f9a2a'];
const TINT = ['#ffd9b0', '#b8ebe0', '#d9ccf7', '#fbc6dc', '#c2dcf8', '#d0efbd'];
const NUMBG = ['', '#ffd9b0', '#e3e8f5', '#fff0a8', '#c9d6e8', '#b8ebe0', '#fbc6dc', '#e1d6fa', '#c8ccd6', '#ffb8a8'];
function tbl(headers, rows) {
  const th = headers.map((h, i) => `<th style="background:${HEAD[i % 6]};color:#fff;padding:7px 8px;text-align:left;border:1px solid rgba(0,0,0,.18)">${esc(h)}</th>`).join('');
  const tr = rows.map(r => '<tr>' + r.map((c, i) => { const o = typeof c === 'object' && c !== null ? c : { t: esc(c) }; return `<td style="background:${o.bg || TINT[i % 6]};color:#1b1b2f;padding:6px 8px;border:1px solid rgba(0,0,0,.15);${i === 0 ? 'font-weight:700;' : ''}vertical-align:top">${o.t}</td>`; }).join('') + '</tr>').join('');
  return `<div style="overflow-x:auto;margin:6px 0"><table style="border-collapse:collapse;width:100%;font-size:.86em;min-width:340px"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`;
}
const sec = t => `<p style="margin:16px 0 4px"><b>${esc(t)}</b></p>`;
const nb = n => ({ t: `<b style="font-size:1.1em">${n}</b>`, bg: NUMBG[n] });

function render(out, st) {
  const { dob, name, target } = st;
  const [, bm, bd] = dob.split('-').map(Number);
  const moolank = reduce(bd), bhagyank = reduce(dob.split('-').join('').split('').reduce((s, d) => s + +d, 0));
  const nn = name ? nameNumbers(name) : null;
  const P = personal(dob, target), [ty, tm] = target.split('-').map(Number);
  let h = sec('आपके मुख्य अंक');
  const rows = [['मूलांक (जन्म तारीख़)', nb(moolank), `${bd} → ${moolank} · स्वामी ${N[moolank].planet}`], ['भाग्यांक (पूरी जन्म-तिथि)', nb(bhagyank), `${dob.split('-').reverse().join('-')} का योग → ${bhagyank} · स्वामी ${N[bhagyank].planet}`]];
  if (nn && nn.letters.length) {
    rows.push(['नामांक (कैल्डियन)', nb(nn.chaldean), `योग ${nn.chaldeanTotal} → ${nn.chaldean}`]);
    rows.push(['नामांक (पाइथागोरियन)', nb(nn.pyth), `योग ${nn.pythTotal} → ${nn.pyth}`]);
    rows.push(['आत्मा-अंक (स्वर)', nb(nn.soul), `स्वरों का योग ${nn.soulTotal} → ${nn.soul}`]);
    rows.push(['व्यक्तित्व-अंक (व्यंजन)', nb(nn.persona), `व्यंजनों का योग ${nn.personaTotal} → ${nn.persona}`]);
  }
  h += tbl(['अंक', 'मान', 'गणना'], rows);
  if (nn && nn.letters.length) {
    h += sec('नाम के अक्षर' + (/[^\x00-\x7F]/.test(name) ? ` (रोमन रूप: ${nn.roman})` : ''));
    h += tbl(['अक्षर', ...nn.letters.map(c => c)], [['कैल्डियन', ...nn.letters.map(c => ({ t: String(CHALDEAN[c]), bg: NUMBG[CHALDEAN[c]] }))], ['पाइथागोरियन', ...nn.letters.map(c => ({ t: String(PYTH[c]), bg: NUMBG[PYTH[c]] }))]]);
  }
  const uniq = [...new Set([moolank, bhagyank, ...(nn && nn.letters.length ? [nn.chaldean] : [])])];
  h += sec('अंकों का फल');
  const lbl = n => `${n} (${[moolank === n ? 'मूलांक' : '', bhagyank === n ? 'भाग्यांक' : '', nn && nn.chaldean === n ? 'नामांक' : ''].filter(Boolean).join('/')})`;
  const keys = [['स्वामी ग्रह', 'planet'], ['स्वभाव', 'trait'], ['करियर', 'career'], ['प्रेम/संबंध', 'love'], ['स्वास्थ्य', 'health'], ['शुभ रंग', 'color'], ['शुभ दिन', 'day'], ['रत्न', 'gem'], ['मित्र अंक', 'friends']];
  h += tbl(['', ...uniq.map(lbl)], keys.map(([l, k]) => [l, ...uniq.map(n => ({ t: esc(N[n][k]), bg: NUMBG[n] }))]));

  h += sec(`वैयक्तिक वर्ष/माह/दिन — ${target.split('-').reverse().join('-')}`);
  h += tbl(['चक्र', 'अंक', 'थीम'], [['वैयक्तिक वर्ष ' + ty, nb(P.py), THEME[P.py]], ['वैयक्तिक माह (' + MONTHS[tm - 1] + ')', nb(P.pm), THEME[P.pm]], ['वैयक्तिक दिन', nb(P.pd), THEME[P.pd]]]);

  h += sec(`वर्ष ${ty} के 12 माह`);
  h += tbl(['माह', 'अंक', 'थीम'], MONTHS.map((m, i) => { const pm = reduce(P.py + i + 1); return [m, nb(pm), THEME[pm]]; }));

  h += sec('अगले 9 वर्षों का चक्र');
  h += tbl(['वर्ष', 'अंक', 'थीम'], Array.from({ length: 9 }, (_, i) => { const y = ty + i; if (y > 2099) return null; const py = reduce(bd + bm + digitsSum(y)); return [String(y), nb(py), THEME[py]]; }).filter(Boolean));

  const lucky = []; for (let d = 1; d <= 31; d++) if (reduce(d) === moolank || reduce(d) === bhagyank) lucky.push(d);
  h += sec('शुभ तारीख़ें (महीने की)');
  h += tbl(['आधार', 'तारीख़ें'], [['मूलांक ' + moolank, Array.from({ length: 31 }, (_, i) => i + 1).filter(d => reduce(d) === moolank).join(', ')], ['भाग्यांक ' + bhagyank, Array.from({ length: 31 }, (_, i) => i + 1).filter(d => reduce(d) === bhagyank).join(', ')]]);
  h += '<small style="display:block;margin-top:10px;opacity:.8">अंकज्योतिष एक परंपरागत मान्यता-आधारित पद्धति है; फल सामान्य मार्गदर्शन हैं, वैज्ञानिक भविष्यवाणी नहीं। नामांक के लिए नाम की वर्तनी (रोमन रूप) का असर पड़ता है।</small>';
  out.innerHTML = h;
}

export function mountNumerology(container) {
  if (!container) return;
  const st = { dob: '', name: '', target: todayIST() };
  const f = 'style="font:inherit;padding:6px;width:100%;box-sizing:border-box;margin:2px 0 8px"';
  container.innerHTML = `<div class="section-heading" style="display:block;margin-bottom:16px">
    <div class="eyebrow muted">NUMEROLOGY &amp; अंकशास्त्र</div>
    <h2 style="margin:6px 0 4px">अंकशास्त्र (Numerology)</h2>
    <p style="margin:0;color:var(--muted)">नाम और जन्म तारीख़ के आधार पर अपना मूलांक, भाग्यांक और नामांक जानें।</p>
  </div>
  <div style="max-width:420px">
    <label>नाम (हिंदी या अंग्रेज़ी)<input id="nm-name" placeholder="जैसे Rahul Sharma / राहुल शर्मा" ${f}></label>
    <label>जन्म तारीख़<input id="nm-dob" type="date" min="1900-01-01" max="2099-12-31" ${f}></label>
    <label>किस तारीख़ का फल देखना है (1900–2099)<input id="nm-target" type="date" min="1900-01-01" max="2099-12-31" value="${st.target}" ${f}></label></div>
    <small id="nm-msg" style="display:block">जन्म तारीख़ भरते ही अंक अपने-आप आ जाएँगे।</small><div id="nm-out"></div>`;
  const $ = s => container.querySelector(s), out = $('#nm-out');
  const go = () => {
    st.name = $('#nm-name').value.trim(); st.dob = $('#nm-dob').value; st.target = $('#nm-target').value || todayIST();
    if (!st.dob) { out.innerHTML = ''; return; }
    try { render(out, st); $('#nm-msg').textContent = ''; } catch (e) { console.error(e); $('#nm-msg').textContent = 'गणना नहीं हो सकी।'; }
  };
  for (const id of ['#nm-name', '#nm-dob', '#nm-target']) { $(id).onchange = go; }
  $('#nm-name').oninput = go;
}
