import { calculateVimshottariDasha, formatDashaDateTime, dashaDurationYears } from "./dasha-engine.js";
const SIGNS=["मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुंभ","मीन"];
const NAK=["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढ़ा","उत्तराषाढ़ा","श्रवण","धनिष्ठा","शतभिषा","पूर्वाभाद्रपद","उत्तराभाद्रपद","रेवती"];
const norm=n=>((Number(n)%360)+360)%360, sign=n=>Math.floor(norm(n)/30), deg=n=>norm(n)%30, fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(2)+"°":"—";
const esc=v=>String(v??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nak=n=>{const x=norm(n)/(360/27),i=Math.floor(x);return {name:NAK[i],pada:Math.floor((x-i)*4)+1};};
const pname=p=>p?.full||p?.short||"ग्रह";
function table(head,rows){return `<div class="kr-table-wrap"><table class="kr-table"><thead><tr>${head.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;}
const LAGNA_SYMBOLS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const NAK_SYLLABLES=["चू चे चो ला","ली लू ले लो","अ आ ई ऊ","ओ वा वी वू","वे वो का की","कू घ ङ छ","के को हा ही","हू हे हो डा","डी डू डे डो","मा मी मू मे","मो टा टी टू","टे टो पा पी","पू ष ण ठ","पे पो रा री","रू रे रो ता","ती तू ते तो","ना नी नू ने","नो या यी यू","ये यो भा भी","भू धा फा ढा","भे भो जा जी","खी खू खे खो","गा गी गु गे","गो सा सी सू","से सो दा दी","दू थ झ ञ","दे दो चा ची"].map(x=>x.split(" "));
const NAK_GANA=["देव","मनुष्य","राक्षस","मनुष्य","देव","मनुष्य","देव","देव","राक्षस","राक्षस","मनुष्य","मनुष्य","देव","राक्षस","देव","राक्षस","देव","राक्षस","राक्षस","मनुष्य","मनुष्य","देव","राक्षस","राक्षस","मनुष्य","मनुष्य","देव"];
const NAK_NADI=["आदि","मध्य","अन्त्य","अन्त्य","मध्य","आदि","आदि","मध्य","अन्त्य","अन्त्य","मध्य","आदि","आदि","मध्य","अन्त्य","अन्त्य","मध्य","आदि","आदि","मध्य","अन्त्य","अन्त्य","मध्य","आदि","आदि","मध्य","अन्त्य"];
const NAK_YONI=["घोड़ा","हाथी","भेड़","सर्प","सर्प","कुत्ता","बिल्ली","भेड़","बिल्ली","चूहा","चूहा","गाय","भैंस","बाघ","भैंस","बाघ","हिरण","हिरण","कुत्ता","वानर","नेवला","वानर","सिंह","घोड़ा","सिंह","गाय","हाथी"];
const HOUSE_BRIEF=[
"स्वभाव, शरीर, व्यक्तित्व और जीवन की शुरुआत",
"धन, बचत, वाणी और परिवार",
"साहस, प्रयास, छोटे भाई-बहन और संचार",
"माता, घर, सुख, संपत्ति और आंतरिक शांति",
"बुद्धि, शिक्षा, संतान, रचनात्मकता और पूर्व पुण्य",
"रोग, ऋण, प्रतिस्पर्धा, सेवा और दैनिक अनुशासन",
"विवाह, साझेदारी, समझौते और सार्वजनिक संबंध",
"आयु, अचानक परिवर्तन, गूढ़ विषय और साझा संसाधन",
"भाग्य, धर्म, गुरु, उच्च शिक्षा और लंबी यात्राएँ",
"कर्म, पेशा, प्रतिष्ठा और सामाजिक भूमिका",
"लाभ, आय, मित्र और इच्छाओं की पूर्ति",
"व्यय, निद्रा, एकांत, विदेश और आध्यात्मिक मुक्ति"];
function chart(title,base,planets,kind="D1"){
 const cells=Array.from({length:12},(_,i)=>({h:i+1,s:(base+i)%12,p:[]}));
 (planets||[]).forEach(p=>{if(Number.isFinite(Number(p.longitude)))cells[(sign(p.longitude)-base+12)%12].p.push(p.short||p.full||"");});
 // North Indian diamond layout: houses remain fixed; signs/planets are placed from the selected ascendant.
 const pos=[ [200,62],[100,45],[45,100],[62,200],[45,300],[100,355],[200,338],[300,355],[355,300],[338,200],[355,100],[300,45] ];
 const paths='<rect x="10" y="10" width="380" height="380" fill="#fffaf0" stroke="#9c7133" stroke-width="2"/><path d="M10 10 L390 390 M390 10 L10 390 M200 10 L390 200 L200 390 L10 200 Z" fill="none" stroke="#9c7133" stroke-width="1.5"/>';
 return `<section class="kr-section"><h2>${esc(title)}</h2><div class="kr-chart-wrap"><svg class="kr-chart kr-diamond" viewBox="0 0 400 400" role="img" aria-label="${esc(title)} उत्तर भारतीय डायमंड कुंडली">${paths}${cells.map((c,i)=>{const [x,y]=pos[i];return `<g><text x="${x}" y="${y-15}" text-anchor="middle" font-size="10" fill="#795322">${c.h} भाव</text><text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="700" fill="#795322">${SIGNS[c.s]}</text><text x="${x}" y="${y+18}" text-anchor="middle" font-size="11" fill="#182033">${esc(c.p.join(" · ")||"—")}</text></g>`}).join("")}</svg></div><p class="kr-muted">${kind==="D9"?"D9 नवांश राशि-स्थिति; ग्रह अंशों से गणना की गई।":"उत्तर भारतीय डायमंड प्रारूप; भाव क्रम लग्न से गिना गया है।"}</p></section>`;
}
function arcDistance(from,to){return norm(Number(to)-Number(from));}
function checkKaalSarp(planets){
 const r=planets.find(p=>p.short==="रा"||p.full==="राहु"), k=planets.find(p=>p.short==="के"||p.full==="केतु");
 const classical=planets.filter(p=>["सू","चं","मं","बु","गु","शु","श"].includes(p.short)||["सूर्य","चंद्र","मंगल","बुध","गुरु","शुक्र","शनि"].includes(p.full));
 if(!r||!k||classical.length<7||!Number.isFinite(Number(r.longitude))||!Number.isFinite(Number(k.longitude))||classical.some(p=>!Number.isFinite(Number(p.longitude)))) return {status:"निर्णय नहीं हो सका",note:"राहु, केतु और सातों पारंपरिक ग्रहों के सटीक निरयन देशांतर उपलब्ध नहीं हैं।"};
 const d=classical.map(p=>arcDistance(r.longitude,p.longitude));
 const inRahuHalf=d.every(x=>x<=180.000001), inKetuHalf=d.every(x=>x>=179.999999);
 if(inRahuHalf||inKetuHalf) return {status:"हाँ — पूर्ण कालसर्प विन्यास मिला",note:"सातों पारंपरिक ग्रह राहु–केतु अक्ष के एक ही अर्धवृत्त में हैं। ग्रह अक्ष पर हों तो चुनी गई परंपरा के अनुसार परिणाम बदल सकता है; दिशा/प्रकार भी अलग से निर्धारित करें।"};
 return {status:"नहीं — पूर्ण कालसर्प विन्यास नहीं मिला",note:"कम-से-कम एक पारंपरिक ग्रह राहु–केतु अक्ष के विपरीत अर्धवृत्त में है। कुछ परंपराएँ आंशिक विन्यास अलग से दर्ज करती हैं।"};
}
export function calculateSadeSati(moonLongitude, transitSaturnLongitude){
 if(!Number.isFinite(Number(moonLongitude))||!Number.isFinite(Number(transitSaturnLongitude))) return {status:"गणना हेतु शनि का चयनित तिथि वाला निरयन गोचर आवश्यक",phase:"—"};
 const ms=sign(moonLongitude), ss=sign(transitSaturnLongitude), rel=(ss-ms+12)%12;
 if(rel===11) return {status:"साढ़ेसाती चल रही है",phase:"प्रथम चरण — चंद्र राशि से 12वीं राशि में शनि"};
 if(rel===0) return {status:"साढ़ेसाती चल रही है",phase:"द्वितीय चरण — चंद्र राशि पर शनि"};
 if(rel===1) return {status:"साढ़ेसाती चल रही है",phase:"तृतीय चरण — चंद्र राशि से दूसरी राशि में शनि"};
 return {status:"नहीं — चयनित गोचर राशि में साढ़ेसाती नहीं",phase:"शनि चंद्र राशि से 12वीं, 1वीं या 2वीं राशि में नहीं है"};
}
function dateLabel(v){if(!v)return "उपलब्ध नहीं";let d=new Date(v+"T12:00:00Z");return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat("hi-IN",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(d);}
function normalizeBirthTime(data){
 const candidates=[data?.birthTime,data?.time,data?.birth_time,data?.birthTimeLocal,data?.birth_time_local,data?.input?.birthTime,data?.input?.time,data?.birth?.time,data?.details?.birthTime];
 for(const value of candidates){
  if(value===undefined||value===null) continue;
  const text=String(value).trim();
  if(!text||/^(unknown|अज्ञात|उपलब्ध नहीं|n\/?a|--|-)$/i.test(text)) continue;
  const match=text.match(/(?:^|\b)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(match){const h=Number(match[1]),m=Number(match[2]),sec=Number(match[3]||0);if(h<=23&&m<=59&&sec<=59)return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}${match[3]!==undefined?":"+String(sec).padStart(2,"0"):""}`;}
 }
 return "";
}
export function buildKundliReportSections(data){
 if(!data||!Array.isArray(data.planets))throw new Error("कुंडली डेटा उपलब्ध नहीं है।");
 const birthTime=normalizeBirthTime(data);
 const birthDateValue=data.birthDate??data.date??data.dob??data.input?.date??data.birth?.date??"";
 const ps=data.planets, asc=Number.isFinite(Number(data.ascendantSign))?Number(data.ascendantSign):sign(data.ascendantLongitude||0);
 const moon=ps.find(p=>p.short==="चं"||p.full==="चंद्र"), ms=Number.isFinite(Number(data.moonSign))?Number(data.moonSign):(moon?sign(moon.longitude):0);
 const meta=[["नाम",data.name||"उपलब्ध नहीं"],["जन्म तिथि",dateLabel(birthDateValue)],["जन्म समय",birthTime||"इनपुट में जन्म समय नहीं मिला"],["जन्म स्थान",data.place||"उपलब्ध नहीं"],["अक्षांश",Number.isFinite(Number(data.lat))?Number(data.lat).toFixed(5)+"°":"उपलब्ध नहीं"],["देशांतर",Number.isFinite(Number(data.lon))?Number(data.lon).toFixed(5)+"°":"उपलब्ध नहीं"],["समय क्षेत्र",Number.isFinite(Number(data.timezoneMinutes))?"UTC"+(data.timezoneMinutes>=0?"+":"")+(Number(data.timezoneMinutes)/60).toFixed(2):"उपलब्ध नहीं"],["अयनांश",fmt(data.ayanamsa)],["लग्न",LAGNA_SYMBOLS[asc]+" "+SIGNS[asc]+" ("+fmt(data.ascendantLongitude)+")"],["चंद्र राशि",SIGNS[ms]]];
 const planetRows=ps.map(p=>{let s=sign(p.longitude),d=deg(p.longitude),n=nak(p.longitude),sun=ps.find(x=>x.short==="सू"),sep=sun?Math.abs(((Number(p.longitude)-Number(sun.longitude)+540)%360)-180):999,lim={"चं":12,"मं":17,"बु":14,"गु":11,"शु":10,"श":15},comb=p.short!=="सू"&&sep<(lim[p.short]||0),ex={"सू":0,"चं":1,"मं":9,"बु":5,"गु":3,"शु":11,"श":6},deb={"सू":6,"चं":7,"मं":3,"बु":11,"गु":9,"शु":5,"श":0};return [pname(p),SIGNS[s],fmt(d),n.name,"पाद "+n.pada,p.retrograde?"वक्री":"मार्गी",comb?"संभावित अस्त":"—",ex[p.short]===s?"उच्च":deb[p.short]===s?"नीच":"सामान्य",d<6?"बाल":d<12?"कुमार":d<18?"युवा":d<24?"वृद्ध":"मृत"];});
 const houses=Array.from({length:12},(_,i)=>[i+1,SIGNS[(asc+i)%12],ps.filter(p=>((sign(p.longitude)-asc+12)%12)===i).map(pname).join(", ")||"—"]);
 const d9ByShort=new Map((data.d9Planets||[]).map(p=>[p.short||p.full,p])); const vargo=ps.filter(p=>{const q=d9ByShort.get(p.short||p.full);return q&&sign(p.longitude)===sign(q.longitude);});
 const mars=ps.find(p=>p.short==="मं"),rah=ps.find(p=>p.short==="रा"),ket=ps.find(p=>p.short==="के");
 const ks=checkKaalSarp(ps);
 const manglikHouse=mars?(((sign(mars.longitude)-asc+12)%12)+1):null;
 const manglikHouses=[1,2,4,7,8,12];
 const sunPlanet=ps.find(p=>p.short==="सू"||p.full==="सूर्य"), rahuPlanet=ps.find(p=>p.short==="रा"||p.full==="राहु"), jupiterPlanet=ps.find(p=>p.short==="गु"||p.full==="गुरु");
 const sunRahuConj=sunPlanet&&rahuPlanet&&Math.abs(((Number(sunPlanet.longitude)-Number(rahuPlanet.longitude)+540)%360)-180)<=10;
 const ninthSign=(asc+8)%12, ninthOccupants=ps.filter(p=>((sign(p.longitude)-asc+12)%12)===8);
 const pitruSignals=[];
 if(sunRahuConj) pitruSignals.push("सूर्य–राहु की 10° के भीतर युति");
 if(ninthOccupants.some(p=>["रा","के","श"].includes(p.short))) pitruSignals.push("नवम भाव में राहु/केतु/शनि की उपस्थिति");
 if(!jupiterPlanet) pitruSignals.push("गुरु की स्थिति उपलब्ध नहीं; नवम भाव/स्वामी की पूर्ण जाँच नहीं हो सकी");
 const sade=calculateSadeSati(moon?moon.longitude:NaN, data.transitSaturnLongitude ?? data.currentTransitSaturnLongitude ?? data.transit?.saturnLongitude);
 const dosha=[
  ["मंगल दोष (लग्न से)",mars?(manglikHouses.includes(manglikHouse)?"हाँ — मंगल "+manglikHouse+"वें भाव में":"नहीं — मंगल "+manglikHouse+"वें भाव में") :"निर्णय नहीं हो सका", "नियम: लग्न से 1, 2, 4, 7, 8 या 12वाँ भाव। चंद्र/शुक्र से जाँच और परिहार अलग परंपराओं में अलग हो सकते हैं."],
  ["कालसर्प योग",ks.status,ks.note],
  ["साढ़ेसाती",sade.status+(sade.phase&&sade.phase!=="—"?" · "+sade.phase:""),"गणना: जन्म चंद्र राशि बनाम चयनित तिथि का भू-केंद्रित शनि निरयन देशांतर (लाहिरी अयनांश; 12:00 UTC)। गोचर राशि: "+(data.sadeSatiTransit?.sign||"उपलब्ध नहीं")+"; तिथि: "+(data.sadeSatiTransit?.date||data.selectedDate||new Date().toISOString().slice(0,10))+"; शनि "+(data.sadeSatiTransit?.retrograde?"वक्री":"मार्गी")+"। साढ़ेसाती के चरण राशि-आधारित पारंपरिक गणना हैं; गोचर राशि-सीमा के आसपास तिथि/समय के अनुसार चरण बदल सकता है."],
  ["पितृ दोष संकेत",pitruSignals.length?"संकेत मिले — विस्तृत सत्यापन आवश्यक":"इन सरल संकेतों से स्पष्ट योग नहीं मिला",pitruSignals.length?pitruSignals.join("; ")+"। पितृ दोष के नियम परंपरा-विशिष्ट हैं; नवम भाव, नवमेश, सूर्य, राहु-केतु, गुरु और दृष्टियों की पूर्ण समीक्षा आवश्यक है.":"यह प्रारंभिक जाँच है, सार्वभौमिक अंतिम निर्णय नहीं; नवम भाव/स्वामी और दृष्टियों सहित परंपरा-विशिष्ट जाँच करें."],
  ["ग्रहण योग संकेत",sunRahuConj?"सूर्य–राहु निकट युति का संकेत":"सूर्य–राहु की 10° के भीतर युति नहीं मिली","यह केवल निकट युति संकेत है; ग्रहण योग की परंपरा-विशिष्ट पुष्टि अलग से करें."],
  ["चंद्र–राहु/केतु ग्रहण संकेत",moon&&rahuPlanet&&Math.abs(((Number(moon.longitude)-Number(rahuPlanet.longitude)+540)%360)-180)<=10?"चंद्र–राहु निकट युति":moon&&ket&&Math.abs(((Number(moon.longitude)-Number(ket.longitude)+540)%360)-180)<=10?"चंद्र–केतु निकट युति":"निकट युति नहीं मिली","10° सीमा पर आधारित प्रारंभिक संकेत; ग्रह-बल और चुनी गई परंपरा के अनुसार सत्यापन करें."]
 ];
 const sun=ps.find(p=>p.short==="सू"||p.full==="सूर्य"), moonLon=moon?norm(moon.longitude):NaN, sunLon=sun?norm(sun.longitude):NaN;
 const elong=Number.isFinite(moonLon)&&Number.isFinite(sunLon)?norm(moonLon-sunLon):NaN;
 const tithiNo=Number.isFinite(elong)?Math.floor(elong/12)+1:NaN;
 const tithiNames=["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पंचमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा"];
 const tithiLabel=Number.isFinite(tithiNo)?(tithiNo===30?"कृष्ण अमावस्या":tithiNo<=15?"शुक्ल "+tithiNames[tithiNo-1]:"कृष्ण "+(tithiNo===30?"अमावस्या":tithiNames[tithiNo-16])):"सूर्य/चंद्र दीर्घांश उपलब्ध नहीं";
 const yogaNo=Number.isFinite(moonLon)&&Number.isFinite(sunLon)?Math.floor(norm(moonLon+sunLon)/(360/27)):NaN;
 const yogaNames=["विष्कुम्भ","प्रीति","आयुष्मान","सौभाग्य","शोभन","अतिगण्ड","सुकर्मा","धृति","शूल","गण्ड","वृद्धि","ध्रुव","व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान","परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","इन्द्र","वैधृति"];
 const karanaNo=Number.isFinite(elong)?Math.floor(elong/6):NaN;
 const karanaNames=["बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि","बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि","बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि","बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि","शकुनि","चतुष्पद","नाग","किंस्तुघ्न"];
 const panchang=[["तिथि",tithiLabel],["वार",data.date?new Intl.DateTimeFormat("hi-IN",{weekday:"long",timeZone:"UTC"}).format(new Date(data.date+"T12:00:00Z")):"उपलब्ध नहीं"],["नक्षत्र",moon?nak(moon.longitude).name+" (पाद "+nak(moon.longitude).pada+")":"उपलब्ध नहीं"],["योग",Number.isFinite(yogaNo)?yogaNames[yogaNo]:"गणना हेतु सूर्य/चंद्र डेटा चाहिए"],["करण",Number.isFinite(karanaNo)?(karanaNo>=56?karanaNames[karanaNo-28]:karanaNames[karanaNo%7]):"गणना हेतु सूर्य/चंद्र डेटा चाहिए"]];
 const moonLongitude=moon&&Number.isFinite(Number(moon.longitude))?Number(moon.longitude):NaN;
 const birthDate=String(birthDateValue||"").slice(0,10), timeMatch=birthTime.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
 const timezoneMinutes=Number.isFinite(Number(data.timezoneMinutes))?Number(data.timezoneMinutes):330;
 let birthUtc=null;
 if(/^\d{4}-\d{2}-\d{2}$/.test(birthDate)&&timeMatch){const localMs=Date.UTC(Number(birthDate.slice(0,4)),Number(birthDate.slice(5,7))-1,Number(birthDate.slice(8,10)),Number(timeMatch[1]),Number(timeMatch[2]),Number(timeMatch[3]||0));birthUtc=new Date(localMs-timezoneMinutes*60000);}
 const dashaCalc=birthUtc?calculateVimshottariDasha(moonLongitude,birthUtc,new Date()):{ok:false,reason:"जन्म तिथि, सही जन्म समय (HH:MM) और समय-क्षेत्र आवश्यक हैं। समय न मिलने पर आधी रात मानकर गलत दशा नहीं बनाई गई।"};
 const periodRows=items=>(items||[]).map(p=>[p.lord,formatDashaDateTime(p.start),formatDashaDateTime(p.end),dashaDurationYears(p)+" वर्ष"]);
 const periodTable=(items)=>table(["दशा स्वामी","आरंभ तिथि / समय","समाप्ति तिथि / समय","अवधि (वर्ष)"],periodRows(items));
 const currentLabel=p=>p?`${p.lord} (${formatDashaDateTime(p.start)} से ${formatDashaDateTime(p.end)})`:"इस गणना-अवधि में उपलब्ध नहीं";
 const dasha=dashaCalc.ok?`<p><strong>गणना पद्धति:</strong> विंशोत्तरी दशा · जन्म चंद्रमा का निरयन देशांतर · 120-वर्षीय क्रम।</p><p><strong>जन्म नक्षत्र:</strong> ${esc(dashaCalc.nakshatra)} · <strong>जन्म समय पर शेष महादशा:</strong> ${esc(dashaCalc.balanceYears.toFixed(3))} वर्ष</p><h3>वर्तमान दशा स्थिति (${esc(formatDashaDateTime(new Date()))})</h3>${table(["स्तर","वर्तमान दशा स्वामी","आरंभ","समाप्ति","अवधि"],[["महादशा",dashaCalc.currentMaha?.lord||"—",dashaCalc.currentMaha?formatDashaDateTime(dashaCalc.currentMaha.start):"—",dashaCalc.currentMaha?formatDashaDateTime(dashaCalc.currentMaha.end):"—",dashaCalc.currentMaha?dashaDurationYears(dashaCalc.currentMaha)+" वर्ष":"—"],["अंतर्दशा",dashaCalc.currentAntar?.lord||"—",dashaCalc.currentAntar?formatDashaDateTime(dashaCalc.currentAntar.start):"—",dashaCalc.currentAntar?formatDashaDateTime(dashaCalc.currentAntar.end):"—",dashaCalc.currentAntar?dashaDurationYears(dashaCalc.currentAntar)+" वर्ष":"—"],["प्रत्यंतर दशा",dashaCalc.currentPratyantar?.lord||"—",dashaCalc.currentPratyantar?formatDashaDateTime(dashaCalc.currentPratyantar.start):"—",dashaCalc.currentPratyantar?formatDashaDateTime(dashaCalc.currentPratyantar.end):"—",dashaCalc.currentPratyantar?dashaDurationYears(dashaCalc.currentPratyantar)+" वर्ष":"—"],["प्राण दशा",dashaCalc.currentPrana?.lord||"—",dashaCalc.currentPrana?formatDashaDateTime(dashaCalc.currentPrana.start):"—",dashaCalc.currentPrana?formatDashaDateTime(dashaCalc.currentPrana.end):"—",dashaCalc.currentPrana?dashaDurationYears(dashaCalc.currentPrana)+" वर्ष":"—"],["सूक्ष्म दशा",dashaCalc.currentSookshma?.lord||"—",dashaCalc.currentSookshma?formatDashaDateTime(dashaCalc.currentSookshma.start):"—",dashaCalc.currentSookshma?formatDashaDateTime(dashaCalc.currentSookshma.end):"—",dashaCalc.currentSookshma?dashaDurationYears(dashaCalc.currentSookshma)+" वर्ष":"—"]])}<h3>सभी महादशाएँ — क्रमवार</h3>${periodTable(dashaCalc.mahaPeriods)}<h3>वर्तमान महादशा की सभी अंतर्दशाएँ</h3>${periodTable(dashaCalc.currentMaha?.antardashas)}<h3>वर्तमान अंतर्दशा के सभी प्रत्यंतर</h3>${periodTable(dashaCalc.currentAntar?.pratyantardashas)}<h3>वर्तमान प्रत्यंतर की सभी प्राण दशाएँ</h3>${periodTable(dashaCalc.currentPratyantar?.pranDashas)}<h3>वर्तमान प्राण दशा की सभी सूक्ष्म दशाएँ</h3>${periodTable(dashaCalc.currentPrana?.sookshmaDashas)}<p class="kr-muted">तिथि/समय जन्म स्थान के स्थानीय समय और उपलब्ध timezoneMinutes से UTC में बदला गया है। पहली महादशा की जन्म-समय शेष अवधि चंद्रमा के नक्षत्रांश से निकाली जाती है। उप-अवधियों को अवधि-अनुपात से विभाजित किया गया है; पारंपरिक सॉफ्टवेयर में सूक्ष्म-स्तर पर गणना-परंपरा/वर्ष-मान के कारण कुछ मिनट या दिन का अंतर संभव है।</p>`:`<p class="kr-muted">विंशोत्तरी दशा नहीं निकाली जा सकी: ${esc(dashaCalc.reason||"चंद्रमा का निरयन देशांतर, जन्म तिथि, समय और timezoneMinutes उपलब्ध होना चाहिए।")}</p>`;
 return `<div class="kr-report"><section class="kr-cover"><div class="kr-ganesh" aria-label="श्री गणेश"><svg viewBox="0 0 120 120" role="img" aria-label="श्री गणेश का पारंपरिक प्रतीक"><circle cx="60" cy="60" r="55" fill="#fff0c9" stroke="#a8792a" stroke-width="2"/><path d="M42 37 Q29 20 22 36 Q22 51 43 52 M78 37 Q91 20 98 36 Q98 51 77 52" fill="#b87924" stroke="#754612" stroke-width="2"/><path d="M39 36 Q60 17 81 36 L78 61 Q75 77 60 81 Q45 77 42 61 Z" fill="#f3c36b" stroke="#754612" stroke-width="2"/><path d="M51 44 Q60 49 69 44 M60 48 L60 59 Q72 63 68 75 Q64 84 54 76" fill="none" stroke="#754612" stroke-width="4" stroke-linecap="round"/><circle cx="49" cy="55" r="2.5" fill="#39220e"/><circle cx="71" cy="55" r="2.5" fill="#39220e"/><path d="M45 89 Q60 79 75 89 L82 101 L38 101 Z" fill="#b87924" stroke="#754612" stroke-width="2"/></svg><div>ॐ गं गणपतये नमः</div></div><div class="kr-eyebrow">ARUNODAYA PANCHANG · जन्म कुंडली रिपोर्ट</div><h1>वैदिक जन्म कुंडली</h1><p>जन्म विवरण · ग्रह स्थिति · वर्ग कुंडली · दशा विश्लेषण</p><div class="kr-cover-grid">${meta.slice(0,4).map(r=>`<div><span>${esc(r[0])}</span><strong>${esc(r[1])}</strong></div>`).join("")}</div><p class="kr-cover-foot">गणना-आधारित विवरण · पारंपरिक ज्योतिषीय संदर्भ</p></section>
 <section class="kr-section"><h2>1. जन्म विवरण</h2>${table(["विवरण","मान"],meta)}</section>
 ${chart("2. D1 जन्म कुंडली",asc,ps)}${chart("3. चंद्र कुंडली",ms,ps)}${chart("4. D9 नवांश कुंडली",Number.isFinite(Number(data.d9Asc))?Number(data.d9Asc):asc,data.d9Planets||[])}
 <section class="kr-section"><h2>5. D9 नवांश — अलग विश्लेषण</h2><p><strong>नवांश लग्न:</strong> ${LAGNA_SYMBOLS[Number.isFinite(Number(data.d9Asc))?Number(data.d9Asc):asc]||""} ${SIGNS[Number.isFinite(Number(data.d9Asc))?Number(data.d9Asc):asc]||"उपलब्ध नहीं"}</p>${table(["ग्रह","D9 राशि","D9 अंश","नक्षत्र-पाद","संक्षिप्त पारंपरिक विषय"],(data.d9Planets||[]).map(p=>{const n=nak(p.longitude);return [pname(p),SIGNS[sign(p.longitude)],fmt(deg(p.longitude)),n.name+" · पाद "+n.pada,( {"सू":"आत्मविश्वास, उद्देश्य और अधिकार","चं":"मन, भावनात्मक सहजता और अपनापन","मं":"साहस, ऊर्जा और पहल","बु":"बुद्धि, संवाद और विवेक","गु":"ज्ञान, मार्गदर्शन और विस्तार","शु":"संबंध, सामंजस्य और सौंदर्य","श":"अनुशासन, धैर्य और जिम्मेदारी","रा":"असामान्य आकांक्षा और परिवर्तन","के":"वैराग्य, अंतर्दृष्टि और अलग दृष्टिकोण"}[p.short]||"ग्रह के स्वभाव और नवांश स्थिति का संयुक्त संकेत")]}))}<ul>${(data.d9Planets||[]).map(p=>`<li><strong>${esc(pname(p))}:</strong> ${esc(SIGNS[sign(p.longitude)])} नवांश में — ${esc(({"सू":"आत्मविश्वास और जीवन-उद्देश्य का संकेत","चं":"भावनात्मक प्रतिक्रिया और आंतरिक सहजता का संकेत","मं":"साहस, क्रियाशीलता और धैर्य का संकेत","बु":"सोच, सीखने और संचार का संकेत","गु":"ज्ञान, नैतिकता और मार्गदर्शन का संकेत","शु":"संबंधों, सामंजस्य और सौंदर्य-बोध का संकेत","श":"अनुशासन, कर्म और दीर्घकालीन प्रतिबद्धता का संकेत","रा":"अपरंपरागत चाह और महत्वाकांक्षा का संकेत","के":"अंतर्मुखता और वैराग्य का संकेत"}[p.short]||"नवांश स्थिति का संकेत"))}</li>`).join("")}</ul><p class="kr-muted">नवांश की व्याख्या अकेले नहीं की जाती; D1, ग्रह-बल, दृष्टि और दशा के साथ मिलाकर देखें।</p></section>
 <section class="kr-section"><h2>7. ग्रह स्थिति एवं अवस्था</h2>${table(["ग्रह","राशि","अंश","नक्षत्र","पाद","गति","अस्त संकेत","राशि बल","अवस्था"],planetRows)}<p class="kr-muted">अस्तता और बल के संकेत सामान्यीकृत नियमों पर आधारित हैं; परंपरा-विशिष्ट सीमा से सत्यापन आवश्यक है। अवस्था राशि के भीतर अंश पर आधारित सरलीकरण है।</p></section>
 <section class="kr-section"><h2>6. D1 के सभी 12 भाव — संक्षिप्त विवरण</h2>${table(["भाव","राशि","स्थित ग्रह","मुख्य विषय","संक्षिप्त संकेत"],houses.map((r,i)=>[r[0],r[1],r[2],HOUSE_BRIEF[i],r[2]==="—"?"इस भाव में ग्रह नहीं; भाव-स्वामी और दृष्टि भी देखना आवश्यक है.":"स्थित ग्रह: "+r[2]+"। फलादेश के लिए ग्रह-बल, भाव-स्वामी और दृष्टि साथ में देखें."]))}<p class="kr-muted">यह सामान्य विषय-सूची है, निश्चित भविष्यवाणी नहीं। भाव का फल ग्रह-स्वामी, दृष्टि, युति, बल, दशा और पूरी कुंडली से तय होता है।</p></section>
 <section class="kr-section"><h2>8. वर्गोत्तम ग्रह एवं ग्रह-बल</h2>${vargo.length?table(["ग्रह","D1 राशि","D9 राशि","वर्गोत्तम संकेत","वक्री स्थिति का पारंपरिक संकेत"],vargo.map(p=>{const q=d9ByShort.get(p.short||p.full);return [pname(p),SIGNS[sign(p.longitude)],SIGNS[sign(q.longitude)],"D1 और D9 में समान राशि","वर्गोत्तम ग्रह को पारंपरिक रूप से अधिक स्थिर/प्रभावी माना जाता है; फल स्वतः ‘दोगुना’ नहीं होता। "+(p.retrograde?"वक्री भी है: इसे स्वतः शुभ/अशुभ न मानें; ग्रह-स्वभाव, भाव, दृष्टि और दशा के साथ व्याख्या करें।":"वक्री नहीं; अन्य ग्रह-बल और भाव-स्थिति भी देखें.")]})):"D1 तथा D9 दोनों ग्रह-स्थितियाँ उपलब्ध होने पर ही वर्गोत्तम की पुष्टि की जा सकती है।"}<p class="kr-muted">वर्गोत्तम होना किसी ग्रह की शक्ति/स्थिरता का पारंपरिक संकेत है, गणितीय रूप से फल दोगुना होने की गारंटी नहीं।</p></section>
 <section class="kr-section"><h2>9. जन्म पंचांग</h2>${table(["अंग","परिणाम"],panchang)}</section>
 <section class="kr-section"><h2>10. अवखड़ा चक्र</h2>${table(["तत्व","स्थिति"],(()=>{if(!moon)return [["जन्म नक्षत्र","उपलब्ध नहीं"],["चरण","उपलब्ध नहीं"],["नामाक्षर","चंद्र दीर्घांश उपलब्ध नहीं"],["गण / नाड़ी / योनि","चंद्र दीर्घांश उपलब्ध नहीं"]];const n=nak(moon.longitude),i=NAK.indexOf(n.name);return [["जन्म नक्षत्र",n.name],["चरण","पाद "+n.pada],["नामाक्षर",NAK_SYLLABLES[i]?.[n.pada-1]||"तालिका में नहीं"],["गण",NAK_GANA[i]||"—"],["नाड़ी",NAK_NADI[i]||"—"],["योनि",NAK_YONI[i]||"—"]]})())}<p class="kr-muted">नामाक्षर एवं अवखड़ा मान प्रचलित नक्षत्र-पाद तालिकाओं पर आधारित हैं; क्षेत्रीय परंपराओं में कुछ भिन्नता हो सकती है।</p></section>
 <section class="kr-section"><h2>11. स्थिर कारक</h2>${table(["ग्रह","परंपरागत संकेत"],[["सूर्य","आत्मा, पिता, अधिकार"],["चंद्र","मन, माता, भावनाएँ"],["मंगल","साहस, ऊर्जा, भाई-बहन"],["बुध","बुद्धि, वाणी, सीखना"],["गुरु","ज्ञान, गुरु, संतान"],["शुक्र","संबंध, कला, सुख"],["शनि","कर्म, श्रम, दीर्घायु"]])}</section>
 <section class="kr-section"><h2>12. चर कारक — संकेतात्मक</h2>${table(["ग्रह","राशि के भीतर अंश"],ps.filter(p=>["सू","चं","मं","बु","गु","शु","श"].includes(p.short)&&Number.isFinite(Number(p.longitude))).sort((a,b)=>deg(b.longitude)-deg(a.longitude)).map((p,i)=>[pname(p),fmt(deg(p.longitude))]))}<p class="kr-muted">चर कारक की भूमिका 7/8-कारक परंपरा के अनुसार बदल सकती है; इस तालिका को क्रम-संकेत समझें, अंतिम फलादेश नहीं।</p></section>
 <section class="kr-section"><h2>13. महादशा, अंतर्दशा, प्रत्यंतर, प्राण एवं सूक्ष्म दशा</h2>${dasha}</section>
 <section class="kr-section"><h2>14. योग एवं दोष संकेत</h2>${table(["विषय","स्थिति","टिप्पणी"],dosha)}</section>
 <section class="kr-section"><h2>15. महत्वपूर्ण टिप्पणी</h2><p class="kr-muted">यह रिपोर्ट उपलब्ध वेबसाइट डेटा का सारांश है। तिथि, योग, करण, अवखड़ा, साढ़ेसाती और दशा के पूर्ण परिणाम तभी दिखाएँ जब उनकी गणना/तालिका सत्यापित हो। ज्योतिषीय पद्धतियों में अंतर हो सकता है।</p></section><footer class="kr-copyright">Kundali Pdf Created by ARUNODAYA-PANCHANG<br>©2026 All Copyright Reserved</footer></div>`;
}
export function mountKundliPrintButton({ resultElement, getReportHtml, buttonLabel = "विस्तृत कुंडली PDF / प्रिंट" } = {}) {
  if (!resultElement || typeof getReportHtml !== "function") {
    console.error("PDF button: resultElement/getReportHtml missing");
    return null;
  }
  // Keep exactly one button per result container.
  resultElement.querySelectorAll("[data-kpdf-print]").forEach((node) => node.remove());
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.kpdfPrint = "true";
  button.className = "kr-print-button";
  button.textContent = buttonLabel;
  button.style.cssText = "display:block;width:100%;max-width:360px;margin:18px auto;padding:13px 16px;border:0;border-radius:10px;background:#d6a83e;color:#172033;font-weight:700;font-size:16px;cursor:pointer;position:relative;z-index:2";
  button.addEventListener("click", async () => {
    let win = null;
    try {
      // Open synchronously in the click handler so mobile browsers don't block the popup.
      win = window.open("", "_blank");
      if (!win) {
        window.alert("PDF/प्रिंट खोलने के लिए ब्राउज़र में पॉप-अप की अनुमति दें।");
        return;
      }
      win.document.open();
      win.document.write("<!doctype html><html lang='hi'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>जन्म कुंडली रिपोर्ट</title><style>body{font-family:Arial,sans-serif;padding:24px}.loading{text-align:center;padding:40px}</style></head><body><p class='loading'>विस्तृत कुंडली रिपोर्ट तैयार हो रही है…</p></body></html>");
      win.document.close();
      const reportHtml = await getReportHtml();
      if (typeof reportHtml !== "string" || !reportHtml.trim()) throw new Error("रिपोर्ट डेटा खाली है।");
      const reportCss = typeof PRINT_CSS !== "undefined" ? PRINT_CSS : "";
      win.document.open();
      win.document.write(`<!doctype html><html lang="hi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>वैदिक जन्म कुंडली रिपोर्ट</title><style>${reportCss}
        @page{size:A4;margin:10mm}
        @media print{.kr-print-button{display:none!important}.kr-report{max-width:none!important;margin:0!important}}
        body{background:#fff!important}
      </style></head><body>${reportHtml}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),500));</script></body></html>`);
      win.document.close();
      win.focus();
    } catch (error) {
      console.error("Kundli PDF/print failed:", error);
      if (win && !win.closed) {
        win.document.body.innerHTML = "<p style='font-family:sans-serif;padding:20px'>रिपोर्ट नहीं बन सकी: " + String(error?.message || error).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])) + "</p>";
      } else {
        window.alert("रिपोर्ट नहीं बन सकी: " + (error?.message || error));
      }
    }
  });
  resultElement.appendChild(button);
  return button;
}

const PRINT_CSS=`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}body{margin:0;background:#eef1f6;color:#1e293b;font-family:"Noto Sans Devanagari","Nirmala UI",sans-serif;font-size:9pt;line-height:1.5}.kr-report{max-width:210mm;margin:16px auto;background:white;padding:10mm}.kr-cover{min-height:260mm;padding:16mm;border:3px double #a8792a;background:linear-gradient(145deg,#fffaf0,#fff0d0);display:flex;flex-direction:column;justify-content:center;page-break-after:always}.kr-ganesh{text-align:center;margin:0 auto 8mm;color:#754612;font-weight:800;font-size:14pt}.kr-ganesh svg{display:block;width:28mm;height:28mm;margin:0 auto 2mm}.kr-eyebrow{font-weight:800;color:#8a5a16;letter-spacing:1px}.kr-cover h1{font-size:30pt;color:#633b12}.kr-cover-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:15mm}.kr-cover-grid div{padding:4mm;border:1px solid #d8bd8a;background:#ffffffb8;border-radius:6px}.kr-cover-grid span{display:block;color:#8a5a16;font-size:8pt}.kr-cover-grid strong{display:block}.kr-cover-foot{margin-top:16mm;border-top:1px solid #d8bd8a;padding-top:4mm}.kr-section{margin-bottom:9mm}.kr-section h2{font-size:15pt;color:#713f12;border-bottom:2px solid #d6b36b;padding-bottom:2mm}.kr-table{width:100%;border-collapse:collapse;margin:3mm 0 5mm;font-size:8pt}.kr-table th,.kr-table td{border:1px solid #d7dce5;padding:2mm;text-align:left;vertical-align:top;overflow-wrap:anywhere}.kr-table th{background:#f7e8c9;color:#573915}.kr-table tbody tr:nth-child(even){background:#f8fafc}.kr-chart{display:block;width:100%;max-width:140mm;margin:auto;background:#fffdf8;border:1px solid #ead9b7;border-radius:8px}.kr-chart-wrap{width:100%;max-width:140mm;margin:3mm auto}.kr-diamond{border:0;border-radius:0}.kr-copyright{text-align:center;border-top:1px solid #d6b36b;padding:5mm 0 2mm;margin-top:12mm;color:#76501d;font-size:8pt;font-weight:600;page-break-inside:avoid}.kr-muted{font-size:8pt;color:#64748b}.kr-print-button{display:block;margin:12px auto;padding:12px 18px;background:#754612;color:#fff;border:0;border-radius:8px}@page{size:A4;margin:10mm}@media print{body{background:white}.kr-report{max-width:none;margin:0;padding:0}.kr-cover{min-height:270mm}.kr-table tr{break-inside:avoid}.kr-print-button{display:none}}@media(max-width:650px){.kr-report{margin:0;padding:5mm}.kr-cover-grid{grid-template-columns:1fr}}`;
