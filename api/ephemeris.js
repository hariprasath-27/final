
'use strict';
const { julian, solar, moonposition } = require('astronomia');
 
// ── Lahiri Ayanamsha ──
function getLahiriAyanamsha(jd) {
  const T = (jd - 2451545.0) / 36525;
  return 23.85 + 0.013604167 * T;
}
function norm360(x) { return ((x % 360) + 360) % 360; }
function sid(trop, ayan) { return norm360(trop - ayan); }
function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }
 
// ── Tables ──
const RASI_NAMES  = ['Mesha','Rishabha','Mithuna','Kataka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];
const RASI_EN     = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const RASI_LORD   = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const RASI_EXALT  = {Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
const RASI_DEBIL  = {Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
const RASI_OWN    = {Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
const RASI_MOOL   = {Sun:4,Moon:1,Mars:0,Mercury:5,Jupiter:8,Venus:6,Saturn:9};
const PLANET_FRIENDS = {
  Sun:['Moon','Mars','Jupiter'], Moon:['Sun','Mercury'],
  Mars:['Sun','Moon','Jupiter'], Mercury:['Sun','Venus'],
  Jupiter:['Sun','Moon','Mars'], Venus:['Mercury','Saturn'],
  Saturn:['Mercury','Venus']
};
const PLANET_ENEMIES = {
  Sun:['Saturn','Venus','Rahu','Ketu'], Moon:['Rahu','Ketu'],
  Mars:['Mercury','Rahu','Ketu'], Mercury:['Moon'],
  Jupiter:['Mercury','Venus','Rahu','Ketu'], Venus:['Sun','Moon'],
  Saturn:['Sun','Moon','Mars']
};
// Combustion degrees (planet within this of Sun = combust)
const COMBUST_ORB = {Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:15,Rahu:0,Ketu:0};
 
const NAK_NAMES = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha',
  'Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_LORD  = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury',
  'Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const NAK_YEARS = {Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17};
const NAK_GANA  = ['Deva','Manushya','Rakshasa','Manushya','Deva','Manushya','Deva','Deva','Rakshasa',
  'Rakshasa','Manushya','Manushya','Deva','Rakshasa','Deva','Rakshasa','Deva','Rakshasa',
  'Rakshasa','Manushya','Manushya','Deva','Rakshasa','Rakshasa','Manushya','Manushya','Deva'];
const NAK_NADI  = ['Vata','Pitta','Kapha','Kapha','Pitta','Vata','Vata','Pitta','Kapha',
  'Kapha','Pitta','Vata','Vata','Pitta','Kapha','Kapha','Pitta','Vata',
  'Vata','Pitta','Kapha','Kapha','Pitta','Vata','Vata','Pitta','Kapha'];
const NAK_YONI  = ['Horse','Elephant','Sheep','Serpent','Serpent','Dog','Cat','Sheep','Cat',
  'Rat','Rat','Cow','Buffalo','Tiger','Buffalo','Tiger','Deer','Deer',
  'Dog','Monkey','Mongoose','Monkey','Lion','Horse','Lion','Cow','Elephant'];
const NAK_DEITY = ['Ashwini Kumaras','Yama','Agni','Brahma','Soma','Rudra','Aditi','Brihaspati','Nagas',
  'Pitrus','Bhaga','Aryaman','Savitar','Vishwakarma','Vayu','Indra/Agni','Mitra','Indra',
  'Nirrti','Apah','Vishvedeva','Vishnu','8 Vasus','Varuna','Ajakapada','Ahirbudhnya','Pushan'];
const DASHA_ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
 
const HOUSE_SIGNIF = {
  1:'self, body, personality, health',2:'wealth, family, speech, savings',
  3:'siblings, courage, communication, short travel',4:'home, mother, property, education',
  5:'children, intelligence, romance, past merit',6:'enemies, disease, debts, service',
  7:'spouse, marriage, partnerships, business',8:'longevity, occult, sudden events, transformation',
  9:'father, luck, dharma, spirituality, long travel',10:'career, status, actions, fame, authority',
  11:'gains, income, desires, elder siblings, friends',12:'loss, foreign, liberation, expenses, bed pleasures'
};
 
function getPlanetStatus(name, rasiIdx) {
  if (name==='Rahu'||name==='Ketu') return 'Shadow planet';
  if (RASI_EXALT[name]===rasiIdx) return 'Exalted (Uchham)';
  if (RASI_DEBIL[name]===rasiIdx) return 'Debilitated (Neecham)';
  if (RASI_MOOL[name]===rasiIdx) return 'Mooltrikona';
  if (RASI_OWN[name]?.includes(rasiIdx)) return 'Own Sign (Swakshetra)';
  const lord = RASI_LORD[rasiIdx];
  if (PLANET_FRIENDS[name]?.includes(lord)) return 'Friendly sign';
  if (PLANET_ENEMIES[name]?.includes(lord)) return 'Enemy sign';
  return 'Neutral sign';
}
 
function getHouseNum(lagnaRasiIdx, planetRasiIdx) {
  return ((planetRasiIdx - lagnaRasiIdx + 12) % 12) + 1;
}
 
// ── Aspects ──
function getAspects(planetName, houseNum) {
  const norm = h => ((h-1+12)%12)+1;
  const aspects = [norm(houseNum+6)]; // all planets aspect 7th
  if (planetName==='Mars')    { aspects.push(norm(houseNum+3), norm(houseNum+7)); }
  if (planetName==='Jupiter') { aspects.push(norm(houseNum+4), norm(houseNum+8)); }
  if (planetName==='Saturn')  { aspects.push(norm(houseNum+2), norm(houseNum+9)); }
  if (planetName==='Rahu'||planetName==='Ketu') { aspects.push(norm(houseNum+4), norm(houseNum+8)); }
  return [...new Set(aspects)];
}
 
// ── Bala (strength score) ──
function getBala(name, rasiIdx, house, retrograde, combust) {
  let score = 50;
  const st = getPlanetStatus(name, rasiIdx);
  if (st.includes('Exalted'))     score += 30;
  if (st.includes('Mooltrikona')) score += 20;
  if (st.includes('Own'))         score += 15;
  if (st.includes('Friendly'))    score += 8;
  if (st.includes('Debilitated')) score -= 30;
  if (st.includes('Enemy'))       score -= 10;
  // Digbala
  const DIGBALA = {Sun:10,Mars:10,Jupiter:1,Mercury:4,Moon:4,Venus:7,Saturn:7};
  if (DIGBALA[name]===house) score += 15;
  if ([1,4,7,10].includes(house)) score += 5;
  if ([5,9].includes(house)) score += 3;
  if ([6,8,12].includes(house)) score -= 5;
  if (retrograde) score += 5; // retrograde can strengthen
  if (combust) score -= 20;
  return Math.max(0, Math.min(100, Math.round(score)));
}
 
// ── Avastha (planetary state by age of planet based on degree) ──
function getAvastha(degree) {
  const d = degree % 30;
  if (d < 6)  return 'Bala (infant)';
  if (d < 12) return 'Kumar (youth)';
  if (d < 18) return 'Yuva (young adult)';
  if (d < 24) return 'Vriddha (old)';
  return 'Mrita (dead)';
}
 
// ── Moon phase ──
function getMoonPhase(sunSid, moonSid) {
  const diff = norm360(moonSid - sunSid);
  const tithi = Math.ceil(diff / 12);
  const paksha = diff < 180 ? 'Shukla Paksha (Waxing)' : 'Krishna Paksha (Waning)';
  const phasePct = Math.round((diff / 360) * 100);
  return { tithi, paksha, diff: diff.toFixed(2), phasePct };
}
 
// ── Navamsa (D9) ──
function getNavamsaSign(sidLon) {
  const totalNavamsas = Math.floor(sidLon / (360/108));
  return totalNavamsas % 12;
}
 
// ── Karakas (Jaimini — planet with highest degree is Atmakaraka) ──
function calcKarakas(planets) {
  const order = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  // Sort by degree in sign descending
  const sorted = order
    .map(n => ({ name:n, deg: planets[n]?.degInRasi || 0 }))
    .sort((a,b) => b.deg - a.deg);
  const names = ['Atmakaraka','Amatyakaraka','Bhratrukaraka','Matrukaraka',
                  'Putrakaraka','Gnatikaraka','Darakaraka'];
  const result = {};
  sorted.forEach((p,i) => { if (names[i]) result[names[i]] = p.name; });
  return result;
}
 
// ── Arudha Lagna ──
function calcArudhaLagna(lagnaIdx, lagnaLordHouse) {
  // AL = house as far from lagna lord as lagna lord is from lagna
  const dist = lagnaLordHouse - 1; // houses from lagna to lagna lord
  const al = ((lagnaIdx + dist + dist) % 12);
  return { rasiIdx: al, rasi: RASI_NAMES[al] };
}
 
// ── Upapada Lagna (A12) ──
function calcUpapadaLagna(lagnaIdx, twelfthLordHouse) {
  const dist = twelfthLordHouse - 1;
  const ul = ((lagnaIdx + 11 + dist + dist) % 12);
  return { rasiIdx: ul, rasi: RASI_NAMES[ul] };
}
 
// ── Planet positions ──
function getPlanetPositions(jdUT) {
  const T    = (jdUT - 2451545.0) / 36525;
  const ayan = getLahiriAyanamsha(jdUT);
  const n360 = x => norm360(x);
 
  // Sun & Moon — high accuracy
  const sunTrop  = norm360(solar.apparentLongitude(jdUT) * 180 / Math.PI);
  const moonPos  = moonposition.position(jdUT);
  const moonTrop = norm360(toDeg(moonPos.lon));
 
  // Mercury
  const Mmer = n360(174.7948 + 4.09233445*T*36525);
  const merTrop = n360(252.2509 + 149472.6746*T
    + 23.44*Math.sin(toRad(Mmer)) + 2.98*Math.sin(toRad(2*Mmer)) - 0.14*Math.sin(toRad(3*Mmer)) - 77.4561);
 
  // Venus
  const Mven = n360(212.2606 + 58517.8041*T);
  const venTrop = n360(181.9798 + 58517.8157*T
    + 0.7758*Math.sin(toRad(Mven)) + 0.0033*Math.sin(toRad(2*Mven)) - 131.5637);
 
  // Mars
  const Mmar = n360(19.3730 + 19140.2993*T);
  const marTrop = n360(355.4332 + 19140.2993*T
    + 10.6912*Math.sin(toRad(Mmar)) + 0.6228*Math.sin(toRad(2*Mmar)) + 0.0503*Math.sin(toRad(3*Mmar)) - 286.5016);
 
  // Jupiter
  const Mjup = n360(20.9 + 3034.906*T);
  const jupTrop = n360(34.3515 + 3034.9057*T
    + 5.5549*Math.sin(toRad(Mjup)) + 0.1683*Math.sin(toRad(2*Mjup)) - 14.3312);
 
  // Saturn
  const Msat = n360(317.0207 + 1222.1138*T);
  const satTrop = n360(50.0775 + 1222.1138*T
    + 6.3585*Math.sin(toRad(Msat)) + 0.2204*Math.sin(toRad(2*Msat)) - 0.0108*Math.sin(toRad(3*Msat)) - 92.8553);
 
  // Rahu — mean node (retrograde always)
  const rahuTrop = n360(125.044555 - 1934.136261*T + 0.0020708*T*T);
  const ketuTrop = n360(rahuTrop + 180);
 
  // Retrograde detection (based on speed)
  // Simple: Mercury retro ~3x/yr, Venus ~1x/yr, outer planets use synodic
  const merSpeed = 149472.6746 + 23.44*Math.cos(toRad(Mmer))*4.09233445;
  const merRetro = merSpeed < 0;
  const venSpeed = 58517.8157 + 0.7758*Math.cos(toRad(Mven))*1.6021;
  const venRetro = venSpeed < 0;
  // For outer planets use approximate retrograde periods
  const marRetro = (T % 0.5323) < 0.0703; // ~26 days / 687 day period approx
  const jupRetro = (Math.cos(toRad(Mjup)) < -0.9);
  const satRetro = (Math.cos(toRad(Msat)) < -0.9);
 
  const tropPositions = {
    Sun:{trop:sunTrop,retro:false}, Moon:{trop:moonTrop,retro:false},
    Mars:{trop:marTrop,retro:marRetro}, Mercury:{trop:merTrop,retro:merRetro},
    Jupiter:{trop:jupTrop,retro:jupRetro}, Venus:{trop:venTrop,retro:venRetro},
    Saturn:{trop:satTrop,retro:satRetro}, Rahu:{trop:rahuTrop,retro:true},
    Ketu:{trop:ketuTrop,retro:true}
  };
 
  const result = {};
  for (const [name, pos] of Object.entries(tropPositions)) {
    const sidLon   = sid(pos.trop, ayan);
    const rasiIdx  = Math.floor(sidLon / 30);
    const degInRasi= sidLon % 30;
    const nakIdx   = Math.floor(sidLon / (360/27));
    const pada     = Math.floor((sidLon % (360/27)) / ((360/27)/4)) + 1;
 
    // Combustion check
    const sunSid = sid(sunTrop, ayan);
    const angFromSun = norm360(sidLon - sunSid);
    const combOrb = COMBUST_ORB[name] || 0;
    const combust = name !== 'Sun' && combOrb > 0 && (angFromSun < combOrb || angFromSun > (360 - combOrb));
 
    result[name] = {
      trop: pos.trop, sid: sidLon, rasiIdx, rasi: RASI_NAMES[rasiIdx], rasiEn: RASI_EN[rasiIdx],
      degInRasi, nakIdx, nakshatra: NAK_NAMES[nakIdx], nakLord: NAK_LORD[nakIdx],
      pada, retrograde: pos.retro, combust,
      avastha: getAvastha(degInRasi),
      navamsaRasiIdx: getNavamsaSign(sidLon),
      navamsaRasi: RASI_NAMES[getNavamsaSign(sidLon)],
    };
  }
  return { planets: result, ayanamsha: ayan };
}
 
// ── Lagna ──
function calcLagna(jdUT, lat, lon) {
  const T    = (jdUT - 2451545.0) / 36525;
  const ayan = getLahiriAyanamsha(jdUT);
  let gmst   = 280.46061837 + 360.98564736629*(jdUT-2451545) + 0.000387933*T*T;
  gmst = norm360(gmst);
  const lst  = norm360(gmst + lon);
  const eps  = toRad(23.439291111 - 0.013004167*T);
  const latR = toRad(lat);
  const ramcR= toRad(lst);
  const y    = Math.cos(ramcR);
  const x    = -(Math.sin(eps)*Math.tan(latR) + Math.cos(eps)*Math.sin(ramcR));
  const ascTrop  = norm360(toDeg(Math.atan2(y, x)));
  const ascSid   = sid(ascTrop, ayan);
  const lagnaIdx = Math.floor(ascSid / 30);
  return { tropLon:ascTrop, sidLon:ascSid, degInRasi:ascSid%30, rasiIdx:lagnaIdx,
    rasi:RASI_NAMES[lagnaIdx], rasiEn:RASI_EN[lagnaIdx], lord:RASI_LORD[lagnaIdx] };
}
 
// ── Dasha ──
function calcDasha(dob, nakIdx, nakDegInNak) {
  const nakLord     = NAK_LORD[nakIdx];
  const nakFraction = nakDegInNak / (360/27);
  const balanceYrs  = (1 - nakFraction) * NAK_YEARS[nakLord];
  const birthMs     = new Date(dob).getTime();
  const startIdx    = DASHA_ORDER.indexOf(nakLord);
  const dashaSeq    = [];
  let cumYrs = 0;
  for (let i=0; i<27; i++) {
    const lord  = DASHA_ORDER[(startIdx+i)%9];
    const years = i===0 ? balanceYrs : NAK_YEARS[lord];
    const sMs   = birthMs + cumYrs*365.25*24*3600*1000;
    const eMs   = sMs + years*365.25*24*3600*1000;
    dashaSeq.push({ lord, years:parseFloat(years.toFixed(2)),
      startDate:new Date(sMs).toISOString().slice(0,10),
      endDate:new Date(eMs).toISOString().slice(0,10) });
    cumYrs += years;
  }
  const now     = Date.now();
  const current = dashaSeq.find(d => new Date(d.startDate)<=now && new Date(d.endDate)>now);
  let antardashas = [], currentAntar = null, prayantardashas = [];
  if (current) {
    const mStart = new Date(current.startDate).getTime();
    const aIdx   = DASHA_ORDER.indexOf(current.lord);
    let aCum = 0;
    for (let j=0; j<9; j++) {
      const aLord = DASHA_ORDER[(aIdx+j)%9];
      const aYrs  = (current.years * NAK_YEARS[aLord]) / 120;
      const asMs  = mStart + aCum*365.25*24*3600*1000;
      const aeMs  = asMs + aYrs*365.25*24*3600*1000;
      antardashas.push({ lord:aLord, years:parseFloat(aYrs.toFixed(2)),
        startDate:new Date(asMs).toISOString().slice(0,10),
        endDate:new Date(aeMs).toISOString().slice(0,10) });
      aCum += aYrs;
    }
    currentAntar = antardashas.find(a => new Date(a.startDate)<=now && new Date(a.endDate)>now);
    if (currentAntar) {
      const paStart = new Date(currentAntar.startDate).getTime();
      const paIdx   = DASHA_ORDER.indexOf(currentAntar.lord);
      let paCum = 0;
      for (let k=0; k<9; k++) {
        const paLord = DASHA_ORDER[(paIdx+k)%9];
        const paYrs  = (currentAntar.years * NAK_YEARS[paLord]) / 120;
        const pasMs  = paStart + paCum*365.25*24*3600*1000;
        const paeMs  = pasMs + paYrs*365.25*24*3600*1000;
        prayantardashas.push({ lord:paLord, years:parseFloat(paYrs.toFixed(3)),
          startDate:new Date(pasMs).toISOString().slice(0,10),
          endDate:new Date(paeMs).toISOString().slice(0,10) });
        paCum += paYrs;
      }
    }
  }
  return { dashaSequence:dashaSeq, current, antardashas, currentAntar, prayantardashas };
}
 
// ── Yoga detection ──
function detectYogas(planets, lagnaIdx) {
  const yogas = [];
  const H = name => planets[name] ? getHouseNum(lagnaIdx, planets[name].rasiIdx) : 0;
  const ST= name => getPlanetStatus(name, planets[name]?.rasiIdx || 0);
  const KENDRA=[1,4,7,10], TRIKONA=[1,5,9], DUSTHANA=[6,8,12];
 
  // Pancha Mahapurusha
  for (const [name, data] of Object.entries(planets)) {
    const h = H(name), st = ST(name);
    if (!KENDRA.includes(h)) continue;
    if (st.includes('Exalted')||st.includes('Own')||st.includes('Mooltrikona')) {
      const yN={Mars:'Ruchaka',Mercury:'Bhadra',Jupiter:'Hamsa',Venus:'Malavya',Saturn:'Shasha'};
      if (yN[name]) yogas.push({name:`${yN[name]} Yoga`,type:'good',planet:name,house:h,
        desc:`${name} ${st} in H${h} — ${yN[name]} Yoga`});
    }
  }
 
  // Gajakesari
  const jupFromMoon = ((planets.Jupiter?.rasiIdx - planets.Moon?.rasiIdx + 12)%12)+1;
  if (KENDRA.includes(jupFromMoon))
    yogas.push({name:'Gajakesari Yoga',type:'good',
      desc:`Jupiter ${jupFromMoon}th from Moon — fame, wealth, intelligence`});
 
  // Budhaditya
  if (Math.abs(planets.Sun?.sid - planets.Mercury?.sid) < 15)
    yogas.push({name:'Budhaditya Yoga',type:'good',
      desc:'Sun-Mercury conjunct — sharp intellect, good career, analytical ability'});
 
  // Chandra Mangala
  if (Math.abs(planets.Moon?.sid - planets.Mars?.sid) < 10 ||
      getAspects('Mars', H('Mars')).includes(H('Moon')))
    yogas.push({name:'Chandra Mangala Yoga',type:'good',
      desc:'Moon-Mars connected — bold emotions, strong earning, property'});
 
  // Vipareeta Raja Yoga
  const l6=RASI_LORD[(lagnaIdx+5)%12], l8=RASI_LORD[(lagnaIdx+7)%12], l12=RASI_LORD[(lagnaIdx+11)%12];
  if (DUSTHANA.includes(H(l6))) yogas.push({name:'Vipareeta Raja Yoga (Harsha)',type:'good',
    desc:'6th lord in dusthana — rises after struggle, defeats enemies, success through adversity'});
  if (DUSTHANA.includes(H(l8))) yogas.push({name:'Vipareeta Raja Yoga (Sarala)',type:'good',
    desc:'8th lord in dusthana — longevity, fearless, gains from hidden sources'});
  if (DUSTHANA.includes(H(l12))) yogas.push({name:'Vipareeta Raja Yoga (Vimala)',type:'good',
    desc:'12th lord in dusthana — spiritual wealth, gains from foreign sources'});
 
  // Graha Yuddha (within 1 degree)
  const warPlanets = ['Mars','Mercury','Jupiter','Venus','Saturn'];
  for (let i=0;i<warPlanets.length;i++) for (let j=i+1;j<warPlanets.length;j++) {
    const diff = Math.abs((planets[warPlanets[i]]?.sid||0) - (planets[warPlanets[j]]?.sid||0));
    if (diff < 1 || diff > 359)
      yogas.push({name:`Graha Yuddha: ${warPlanets[i]}-${warPlanets[j]}`,type:'warn',
        desc:`${warPlanets[i]} and ${warPlanets[j]} within 1° — planetary war weakens the loser`});
  }
 
  // Neecha Bhanga
  for (const [name, data] of Object.entries(planets)) {
    if (!ST(name).includes('Debilitated')) continue;
    const nullifiers = [];
    const debilLord = RASI_LORD[RASI_DEBIL[name]];
    const exaltLord = RASI_LORD[RASI_EXALT[name]??0];
    if (KENDRA.includes(H(debilLord))) nullifiers.push(`${debilLord} in Kendra`);
    if (KENDRA.includes(H(exaltLord))) nullifiers.push(`${exaltLord} in Kendra`);
    if (KENDRA.includes(H(name)))      nullifiers.push(`${name} itself in Kendra`);
    if (nullifiers.length)
      yogas.push({name:`${name} Neecha Bhanga Raja Yoga`,type:'good',planet:name,nullified:true,
        nullifiers, desc:`${name} debilitated BUT Neecha Bhanga: ${nullifiers.join('; ')} — weakness becomes Raja Yoga`});
    else
      yogas.push({name:`${name} Neecham (ACTIVE)`,type:'bad',planet:name,nullified:false,
        desc:`${name} debilitated in ${data.rasi} — weakened, struggles in its significations`});
  }
 
  // Mangal Dosha with nullification
  const marsH = H('Mars');
  if ([1,2,4,7,8,12].includes(marsH)) {
    const null2=[], marsSt=ST('Mars'), lagnaRasi=lagnaIdx;
    if (marsSt.includes('Exalted')||marsSt.includes('Own')) null2.push('Mars exalted/own');
    if ([0,7].includes(lagnaRasi)) null2.push('Mesha/Vrischika Lagna');
    if (getAspects('Jupiter', H('Jupiter')).includes(marsH)) null2.push('Jupiter aspects Mars');
    if (marsH===8 && [3,4].includes(lagnaRasi)) null2.push('Mars H8 for Kataka/Simha Lagna');
    const active = null2.length === 0;
    yogas.push({name:`Mangal Dosha — ${active?'ACTIVE':'NULLIFIED'}`,type:active?'bad':'warn',
      planet:'Mars', house:marsH, nullified:!active, nullifiers:null2,
      desc:`Mars in H${marsH} — ${active?'Mangal Dosha ACTIVE: affects marriage harmony, delays possible':'Mangal Dosha NULLIFIED: '+null2.join('; ')}`});
  }
 
  // Kaal Sarpa
  const rahuSid = planets.Rahu?.sid || 0, ketuSid = planets.Ketu?.sid || 0;
  const allSids = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].map(n=>planets[n]?.sid||0);
  const rMin=Math.min(rahuSid,ketuSid), rMax=Math.max(rahuSid,ketuSid);
  const allIn = allSids.every(s=>s>=rMin&&s<=rMax);
  const allOut= allSids.every(s=>s<=rMin||s>=rMax);
  if (allIn||allOut) {
    const ksNull=[];
    allSids.forEach((s,i)=>{ const n=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'][i];
      if(Math.abs(s-rahuSid)<5||Math.abs(s-ketuSid)<5) ksNull.push(`${n} conjunct node`); });
    if(KENDRA.includes(H('Jupiter'))) ksNull.push('Jupiter in Kendra');
    yogas.push({name:`Kaal Sarpa Yoga — ${ksNull.length?'REDUCED':'ACTIVE'}`,
      type:ksNull.length?'warn':'bad', nullified:ksNull.length>0, nullifiers:ksNull,
      desc:`All planets between Rahu-Ketu axis — ${ksNull.length?'reduced by: '+ksNull.join('; '):'karmic obstacles, periodic reversals, rise after 45'}`});
  }
 
  // Combustion yogas
  for (const [name, data] of Object.entries(planets)) {
    if (data.combust && name!=='Sun')
      yogas.push({name:`${name} Combust (Astangata)`,type:'bad',planet:name,
        desc:`${name} combust — weakened significations, reduced ability to give results`});
  }
 
  // Retrograde yogas
  for (const [name, data] of Object.entries(planets)) {
    if (data.retrograde && !['Rahu','Ketu','Sun','Moon'].includes(name))
      yogas.push({name:`${name} Retrograde (Vakri)`,type:'warn',planet:name,
        desc:`${name} retrograde — karmic planet, stronger but turned inward, delays then sudden results`});
  }
 
  // Love marriage yoga — 5th and 7th lords connected
  const l5 = RASI_LORD[(lagnaIdx+4)%12], l7 = RASI_LORD[(lagnaIdx+6)%12];
  const l5H = H(l5), l7H = H(l7);
  if (l5H===7||l7H===5||l5H===l7H||(Math.abs((planets[l5]?.sid||0)-(planets[l7]?.sid||0))<10))
    yogas.push({name:'Love Marriage Yoga',type:'good',
      desc:`5th lord (${l5}) and 7th lord (${l7}) connected — love marriage strongly indicated`});
 
  // Delayed marriage indicators
  const satInH7 = H('Saturn')===7, rahuInH7 = H('Rahu')===7, ketuInH7 = H('Ketu')===7;
  const l7InDust = DUSTHANA.includes(H(l7));
  if (satInH7||rahuInH7||ketuInH7||l7InDust)
    yogas.push({name:'Delayed Marriage Indicator',type:'warn',
      desc:`Marriage may be delayed: ${[satInH7?'Saturn in H7':'',rahuInH7?'Rahu in H7':'',ketuInH7?'Ketu in H7':'',l7InDust?`7th lord in dusthana (H${H(l7)})`:''  ].filter(Boolean).join(', ')}`});
 
  return yogas;
}
 
// ── City coordinates ──
const CITY_COORDS = {
  kottayam:{lat:9.5916,lon:76.5222,tz:5.5,name:'Kottayam, Kerala'},
  chennai:{lat:13.0827,lon:80.2707,tz:5.5,name:'Chennai, Tamil Nadu'},
  mumbai:{lat:19.0760,lon:72.8777,tz:5.5,name:'Mumbai'},
  delhi:{lat:28.6139,lon:77.2090,tz:5.5,name:'New Delhi'},
  bangalore:{lat:12.9716,lon:77.5946,tz:5.5,name:'Bangalore'},
  bengaluru:{lat:12.9716,lon:77.5946,tz:5.5,name:'Bangalore'},
  hyderabad:{lat:17.3850,lon:78.4867,tz:5.5,name:'Hyderabad'},
  kolkata:{lat:22.5726,lon:88.3639,tz:5.5,name:'Kolkata'},
  pune:{lat:18.5204,lon:73.8567,tz:5.5,name:'Pune'},
  coimbatore:{lat:11.0168,lon:76.9558,tz:5.5,name:'Coimbatore'},
  madurai:{lat:9.9252,lon:78.1198,tz:5.5,name:'Madurai'},
  trivandrum:{lat:8.5241,lon:76.9366,tz:5.5,name:'Thiruvananthapuram'},
  thiruvananthapuram:{lat:8.5241,lon:76.9366,tz:5.5,name:'Thiruvananthapuram'},
  kozhikode:{lat:11.2588,lon:75.7804,tz:5.5,name:'Kozhikode'},
  thrissur:{lat:10.5276,lon:76.2144,tz:5.5,name:'Thrissur'},
  kochi:{lat:9.9312,lon:76.2673,tz:5.5,name:'Kochi'},
  ernakulam:{lat:9.9816,lon:76.2999,tz:5.5,name:'Ernakulam'},
  salem:{lat:11.6643,lon:78.1460,tz:5.5,name:'Salem'},
  trichy:{lat:10.7905,lon:78.7047,tz:5.5,name:'Tiruchirappalli'},
  tiruchirappalli:{lat:10.7905,lon:78.7047,tz:5.5,name:'Tiruchirappalli'},
  vellore:{lat:12.9165,lon:79.1325,tz:5.5,name:'Vellore'},
  mysore:{lat:12.2958,lon:76.6394,tz:5.5,name:'Mysore'},
  mysuru:{lat:12.2958,lon:76.6394,tz:5.5,name:'Mysore'},
  vijayawada:{lat:16.5062,lon:80.6480,tz:5.5,name:'Vijayawada'},
  visakhapatnam:{lat:17.6868,lon:83.2185,tz:5.5,name:'Visakhapatnam'},
  vizag:{lat:17.6868,lon:83.2185,tz:5.5,name:'Visakhapatnam'},
  nagpur:{lat:21.1458,lon:79.0882,tz:5.5,name:'Nagpur'},
  jaipur:{lat:26.9124,lon:75.7873,tz:5.5,name:'Jaipur'},
  lucknow:{lat:26.8467,lon:80.9462,tz:5.5,name:'Lucknow'},
  tirupati:{lat:13.6288,lon:79.4192,tz:5.5,name:'Tirupati'},
  thanjavur:{lat:10.7870,lon:79.1378,tz:5.5,name:'Thanjavur'},
  tanjore:{lat:10.7870,lon:79.1378,tz:5.5,name:'Thanjavur'},
  nagercoil:{lat:8.1833,lon:77.4119,tz:5.5,name:'Nagercoil'},
  pondicherry:{lat:11.9416,lon:79.8083,tz:5.5,name:'Pondicherry'},
  puducherry:{lat:11.9416,lon:79.8083,tz:5.5,name:'Puducherry'},
  palakkad:{lat:10.7867,lon:76.6548,tz:5.5,name:'Palakkad'},
  kollam:{lat:8.8932,lon:76.6141,tz:5.5,name:'Kollam'},
  kannur:{lat:11.8745,lon:75.3704,tz:5.5,name:'Kannur'},
  mangalore:{lat:12.9141,lon:74.8560,tz:5.5,name:'Mangalore'},
  mangaluru:{lat:12.9141,lon:74.8560,tz:5.5,name:'Mangalore'},
  hubli:{lat:15.3647,lon:75.1240,tz:5.5,name:'Hubli'},
  amritsar:{lat:31.6340,lon:74.8723,tz:5.5,name:'Amritsar'},
  chandigarh:{lat:30.7333,lon:76.7794,tz:5.5,name:'Chandigarh'},
  surat:{lat:21.1702,lon:72.8311,tz:5.5,name:'Surat'},
  ahmedabad:{lat:23.0225,lon:72.5714,tz:5.5,name:'Ahmedabad'},
  varanasi:{lat:25.3176,lon:82.9739,tz:5.5,name:'Varanasi'},
  bhopal:{lat:23.2599,lon:77.4126,tz:5.5,name:'Bhopal'},
  indore:{lat:22.7196,lon:75.8577,tz:5.5,name:'Indore'},
  patna:{lat:25.5941,lon:85.1376,tz:5.5,name:'Patna'},
  bhubaneswar:{lat:20.2961,lon:85.8245,tz:5.5,name:'Bhubaneswar'},
  guwahati:{lat:26.1445,lon:91.7362,tz:5.5,name:'Guwahati'},
  kumbakonam:{lat:10.9602,lon:79.3845,tz:5.5,name:'Kumbakonam'},
  tirunelveli:{lat:8.7139,lon:77.7567,tz:5.5,name:'Tirunelveli'},
};
 
function getCityCoords(place) {
  const key = place.toLowerCase().trim().split(',')[0].trim().replace(/\./g,'');
  return CITY_COORDS[key] || null;
}
 
// ── Navamsa chart ──
function buildNavamsaChart(planets, lagnaNavamsaIdx) {
  const houses = {};
  for (let h=1;h<=12;h++) houses[h]=[];
  const result = {};
  for (const [name, p] of Object.entries(planets)) {
    const h = getHouseNum(lagnaNavamsaIdx, p.navamsaRasiIdx);
    houses[h].push(name);
    result[name] = { rasi: p.navamsaRasi, rasiIdx: p.navamsaRasiIdx,
      house: h, status: getPlanetStatus(name, p.navamsaRasiIdx) };
  }
  return { planets: result, houses, lagna: { rasiIdx: lagnaNavamsaIdx,
    rasi: RASI_NAMES[lagnaNavamsaIdx], lord: RASI_LORD[lagnaNavamsaIdx] } };
}
 
// ── Full chart build ──
function buildFullChart(dob, tob, place, overrides={}) {
  const [year,month,day] = dob.split('-').map(Number);
  const [hh,mm]          = tob.split(':').map(Number);
  const coords = getCityCoords(place);
  if (!coords) throw new Error(`City "${place}" not found. Try a nearby major city.`);
 
  const utcHours = hh - coords.tz + mm/60;
  const utcDay   = day + utcHours/24;
  const jdUT     = julian.CalendarGregorianToJD(year, month, utcDay);
 
  const { planets, ayanamsha } = getPlanetPositions(jdUT);
  const lagna = calcLagna(jdUT, coords.lat, coords.lon);
 
  let lagnaIdx = lagna.rasiIdx;
  if (overrides.lagna) {
    const idx = RASI_NAMES.indexOf(overrides.lagna);
    if (idx>=0) { lagnaIdx=idx; Object.assign(lagna,{rasiIdx:idx,rasi:RASI_NAMES[idx],rasiEn:RASI_EN[idx],lord:RASI_LORD[idx]}); }
  }
  if (overrides.rasi) {
    const idx = RASI_NAMES.indexOf(overrides.rasi);
    if (idx>=0) { planets.Moon.rasiIdx=idx; planets.Moon.rasi=RASI_NAMES[idx]; }
  }
  if (overrides.nakshatra) {
    const nIdx = NAK_NAMES.indexOf(overrides.nakshatra);
    if (nIdx>=0) {
      planets.Moon.nakIdx=nIdx; planets.Moon.nakshatra=NAK_NAMES[nIdx];
      planets.Moon.nakLord=NAK_LORD[nIdx]; planets.Moon.pada=2;
    }
  }
 
  // Add house, status, bala, aspects to each planet
  const houseAspects = {};
  for (let h=1;h<=12;h++) houseAspects[h]=[];
 
  for (const [name, p] of Object.entries(planets)) {
    p.house   = getHouseNum(lagnaIdx, p.rasiIdx);
    p.status  = getPlanetStatus(name, p.rasiIdx);
    p.bala    = getBala(name, p.rasiIdx, p.house, p.retrograde, p.combust);
    p.aspects = getAspects(name, p.house);
    p.aspects.forEach(h => { if (!houseAspects[h]) houseAspects[h]=[]; houseAspects[h].push(name); });
  }
 
  const moonNakIdx   = planets.Moon.nakIdx;
  let moonDegInNak   = planets.Moon.sid % (360/27);
  if (overrides.nakshatra && NAK_NAMES.indexOf(overrides.nakshatra)>=0) moonDegInNak=(360/27)*0.5;
 
  const nakshatra = {
    name:NAK_NAMES[moonNakIdx], lord:NAK_LORD[moonNakIdx],
    gana:NAK_GANA[moonNakIdx], nadi:NAK_NADI[moonNakIdx],
    yoni:NAK_YONI[moonNakIdx], deity:NAK_DEITY[moonNakIdx],
    pada:planets.Moon.pada, index:moonNakIdx,
  };
 
  const dasha   = calcDasha(dob, moonNakIdx, moonDegInNak);
  const yogas   = detectYogas(planets, lagnaIdx);
  const moonPhase = getMoonPhase(planets.Sun.sid, planets.Moon.sid);
  const karakas   = calcKarakas(planets);
 
  // Arudha Lagna
  const lagnaLord = RASI_LORD[lagnaIdx];
  const lagnaLordHouse = planets[lagnaLord]?.house || 1;
  const arudhaLagna = calcArudhaLagna(lagnaIdx, lagnaLordHouse);
 
  // Upapada Lagna (from 12th house lord)
  const twelfthLord = RASI_LORD[(lagnaIdx+11)%12];
  const twelfthLordHouse = planets[twelfthLord]?.house || 1;
  const upapadaLagna = calcUpapadaLagna(lagnaIdx, twelfthLordHouse);
 
  // Navamsa
  const lagnaNavamsaIdx = getNavamsaSign(lagna.sidLon);
  const navamsa = buildNavamsaChart(planets, lagnaNavamsaIdx);
 
  // Houses
  const houses={};
  for (let h=1;h<=12;h++) houses[h]=[];
  for (const [name,p] of Object.entries(planets)) houses[p.house].push(name);
 
  // Build all advanced engines
  const houseLords = buildHouseLordsEngine(planets, lagnaIdx);
  const d10 = buildDivisionalChart(planets, lagnaIdx, 10);  // career
  const d7  = buildDivisionalChart(planets, lagnaIdx, 7);   // children
  const d12 = buildDivisionalChart(planets, lagnaIdx, 12);  // parents
  const transits = getCurrentTransits(lagnaIdx, planets.Moon.rasiIdx);
  const a7 = calcA7(planets, lagnaIdx);
  const venusAffliction = getVenusAffliction(planets, lagnaIdx);
  const divorceIndicators = getDivorceIndicators(planets, lagnaIdx);
  const psychProfile = getPsychologicalProfile(planets, lagnaIdx);
  const gandanta = detectGandanta(planets);
  const advancedYogas = detectAdvancedYogas(planets, lagnaIdx);
  // Merge all yogas
  const allYogas = [...yogas, ...advancedYogas];
 
  // Batch 3 engines
  const transitTriggers = getTransitTriggers(planets, lagnaIdx, dasha, transits, karakas, upapadaLagna);
  const refinedMarriage = getRefinedMarriageTrigger(dasha, planets, lagnaIdx, karakas, upapadaLagna);
  const healthEngine = getHealthEngine(planets, lagnaIdx, dasha);
  const wealthEngine = getWealthTimingEngine(planets, lagnaIdx, dasha, transits);
  const propertyEngine = getPropertyEngine(planets, lagnaIdx, dasha);
  // Argala on key houses
  const argala7  = getArgala(planets, lagnaIdx, 7);
  const argala10 = getArgala(planets, lagnaIdx, 10);
  const argala1  = getArgala(planets, lagnaIdx, 1);
 
  // Batch 2 engines
  const dashaEventTriggers = getDashaEventTriggers(dasha, planets, lagnaIdx);
  const upapadaLordAnalysis = analyzeUpapadaLord(upapadaLagna, planets, lagnaIdx);
  const navamsaMarriage = analyzeNavamsaMarriage(navamsa, karakas, lagnaIdx);
  const secondMarriage = getSecondMarriageIndicators(planets, lagnaIdx, upapadaLagna, venusAffliction, divorceIndicators);
  const secretRelationship = getSecretRelationshipIndicators(planets, lagnaIdx);
  const foreignSettlement = getForeignSettlementIndicators(planets, lagnaIdx, dasha);
  const childrenTiming = getChildrenTiming(planets, lagnaIdx, dasha, transits);
 
  // Scoring engines
  const planetRanking = getWeightedPlanetRanking(planets, allYogas);
  const contradictions = detectContradictions(planets, allYogas);
  const verifiedShockFacts = getVerifiedShockFacts({}, planets, lagnaIdx, allYogas);
  const marriageScores = getMarriageScores(planets, lagnaIdx, allYogas, venusAffliction, divorceIndicators, navamsaMarriage);
 
  return {
    input:{dob,tob,place,coords},
    jd:jdUT, ayanamsha:parseFloat(ayanamsha.toFixed(4)),
    lagna:{...lagna,rasiIdx:lagnaIdx,rasi:RASI_NAMES[lagnaIdx],rasiEn:RASI_EN[lagnaIdx],
      lord:lagnaLord, lordHouse:lagnaLordHouse, lordStatus:planets[lagnaLord]?.status},
    rasi:{name:planets.Moon.rasi,en:RASI_EN[planets.Moon.rasiIdx],
      lord:RASI_LORD[planets.Moon.rasiIdx],index:planets.Moon.rasiIdx},
    nakshatra, planets, houses, houseAspects,
    dasha, yogas:allYogas, moonPhase, karakas,
    arudhaLagna, upapadaLagna, navamsa,
    houseLords, d10, d7, d12, transits,
    a7, venusAffliction, divorceIndicators, psychProfile, gandanta,
    dashaEventTriggers, upapadaLordAnalysis, navamsaMarriage,
    secondMarriage, secretRelationship, foreignSettlement, childrenTiming,
    transitTriggers, refinedMarriage, healthEngine, wealthEngine, propertyEngine,
    argala7, argala10, argala1,
    planetRanking, contradictions, verifiedShockFacts, marriageScores,
    houseSignif:HOUSE_SIGNIF,
    metadata:{calculatedAt:new Date().toISOString(),method:'Lahiri Ayanamsha, Whole Sign Houses'}
  };
}
 
module.exports = {
  buildFullChart, RASI_NAMES, RASI_EN, RASI_LORD,
  NAK_NAMES, NAK_LORD, NAK_YEARS, NAK_GANA, NAK_NADI, NAK_YONI,
  DASHA_ORDER, getCityCoords, HOUSE_SIGNIF, getHouseNum, getAspects
};
 
// ═══════════════════════════════════════════════════
// ADVANCED ENGINE ADDITIONS
// ═══════════════════════════════════════════════════
 
// ── House Lords Engine ──
// For every house: lord, lord placement, lord dignity, lord aspects, lord conditions
function buildHouseLordsEngine(planets, lagnaIdx) {
  const lords = {};
  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaIdx + h - 1) % 12;
    const lord = RASI_LORD[signIdx];
    const lordData = planets[lord];
    if (!lordData) continue;
    const lordHouse = lordData.house;
    const lordStatus = lordData.status;
    const lordAspects = lordData.aspects || [];
    // Determine if lord is in good/bad house from its own house
    const houseFromOwn = ((lordHouse - h + 12) % 12) + 1;
    const placementQuality =
      [1,4,7,10].includes(lordHouse) ? 'strong (Kendra)' :
      [1,5,9].includes(houseFromOwn) ? 'good (Trikona from own)' :
      [6,8,12].includes(lordHouse) ? 'weak (Dusthana)' : 'neutral';
    lords[h] = {
      sign: RASI_NAMES[signIdx],
      lord, lordHouse, lordStatus,
      lordAspects,
      placementQuality,
      lordRetrograde: lordData.retrograde,
      lordCombust: lordData.combust,
      lordBala: lordData.bala,
      // Is lord in own house? (very strong)
      lordInOwnHouse: lordHouse === h,
      // Is lord aspecting its own house?
      lordAspectsOwnHouse: lordAspects.includes(h),
      summary: `H${h} lord ${lord} in H${lordHouse} (${lordStatus}, ${placementQuality})${lordData.retrograde?' RETRO':''}${lordData.combust?' COMBUST':''}`
    };
  }
  return lords;
}
 
// ── Divisional Charts ──
function buildDivisionalChart(planets, lagnaIdx, divisor) {
  const houses = {};
  for (let h = 1; h <= 12; h++) houses[h] = [];
  const result = {};
 
  // Lagna in divisional chart
  const lagnaSignIdx = lagnaIdx;
  const lagnaDiv = Math.floor((lagnaSignIdx * divisor) % 12);
 
  for (const [name, p] of Object.entries(planets)) {
    // Divisional chart position
    const divPos = Math.floor((p.rasiIdx * divisor + Math.floor(p.degInRasi / (30 / divisor))) % 12);
    const h = ((divPos - lagnaDiv + 12) % 12) + 1;
    houses[h].push(name);
    result[name] = {
      rasiIdx: divPos, rasi: RASI_NAMES[divPos],
      house: h, status: getPlanetStatus(name, divPos)
    };
  }
  return { planets: result, houses, lagnaRasiIdx: lagnaDiv, lagnaRasi: RASI_NAMES[lagnaDiv] };
}
 
// ── Transit Engine (current planetary positions) ──
function getCurrentTransits(natLagnaIdx, natMoonRasiIdx) {
  const now = new Date();
  const jdNow = 2451545.0 + (now - new Date('2000-01-01T12:00:00Z')) / (1000 * 86400);
  const ayan = getLahiriAyanamsha(jdNow);
  const T = (jdNow - 2451545.0) / 36525;
 
  // Current positions (simplified but accurate for transit purposes)
  const Mjup = norm360(20.9 + 3034.906 * T);
  const jupTrop = norm360(34.3515 + 3034.9057 * T + 5.5549 * Math.sin(toRad(Mjup)) - 14.3312);
  const jupSid = Math.floor(sid(jupTrop, ayan) / 30);
 
  const Msat = norm360(317.0207 + 1222.1138 * T);
  const satTrop = norm360(50.0775 + 1222.1138 * T + 6.3585 * Math.sin(toRad(Msat)) - 92.8553);
  const satSid = Math.floor(sid(satTrop, ayan) / 30);
 
  const rahuTrop = norm360(125.044555 - 1934.136261 * T);
  const rahuSid = Math.floor(sid(rahuTrop, ayan) / 30);
  const ketuSid = (rahuSid + 6) % 12;
 
  // Transit house from natal lagna and natal moon
  const jupFromLagna = ((jupSid - natLagnaIdx + 12) % 12) + 1;
  const satFromLagna = ((satSid - natLagnaIdx + 12) % 12) + 1;
  const rahuFromLagna = ((rahuSid - natLagnaIdx + 12) % 12) + 1;
  const jupFromMoon = ((jupSid - natMoonRasiIdx + 12) % 12) + 1;
  const satFromMoon = ((satSid - natMoonRasiIdx + 12) % 12) + 1;
 
  // Double transit check: Jupiter and Saturn both in favorable houses = major event
  const JUPTRANSIT_GOOD = [1,2,4,5,7,9,10,11];
  const SATTRANSIT_GOOD = [3,6,11];
  const doubleTransit = JUPTRANSIT_GOOD.includes(jupFromMoon) && SATTRANSIT_GOOD.includes(satFromMoon);
 
  // Sade Sati check: Saturn in 12, 1, or 2 from Moon
  const sadeSati = [12, 1, 2].includes(satFromMoon);
 
  // Ashtama Shani: Saturn in 8th from Moon
  const ashtamaShani = satFromMoon === 8;
 
  return {
    jupiter: { rasi: RASI_NAMES[jupSid], fromLagna: jupFromLagna, fromMoon: jupFromMoon,
      favorable: JUPTRANSIT_GOOD.includes(jupFromMoon) },
    saturn: { rasi: RASI_NAMES[satSid], fromLagna: satFromLagna, fromMoon: satFromMoon,
      favorable: SATTRANSIT_GOOD.includes(satFromMoon) },
    rahu: { rasi: RASI_NAMES[rahuSid], fromLagna: rahuFromLagna },
    ketu: { rasi: RASI_NAMES[ketuSid], fromLagna: ((ketuSid - natLagnaIdx + 12) % 12) + 1 },
    doubleTransit,
    sadeSati, ashtamaShani,
    summary: [
      `Jupiter transiting ${RASI_NAMES[jupSid]} (H${jupFromLagna} from Lagna, H${jupFromMoon} from Moon) — ${JUPTRANSIT_GOOD.includes(jupFromMoon) ? 'FAVORABLE' : 'UNFAVORABLE'}`,
      `Saturn transiting ${RASI_NAMES[satSid]} (H${satFromLagna} from Lagna, H${satFromMoon} from Moon) — ${SATTRANSIT_GOOD.includes(satFromMoon) ? 'FAVORABLE' : 'UNFAVORABLE'}`,
      `Rahu in ${RASI_NAMES[rahuSid]} (H${rahuFromLagna} from Lagna)`,
      sadeSati ? 'SADE SATI ACTIVE — Saturn on/near natal Moon — 7.5 year pressure period' : '',
      ashtamaShani ? 'ASHTAMA SHANI — Saturn 8th from Moon — difficult transit' : '',
      doubleTransit ? 'DOUBLE TRANSIT ACTIVE — Jupiter and Saturn both favorable — major life event likely' : '',
    ].filter(Boolean).join(' | ')
  };
}
 
// ── A7 Darapada (relationship image) ──
function calcA7(planets, lagnaIdx) {
  const h7Lord = RASI_LORD[(lagnaIdx + 6) % 12];
  const h7LordHouse = planets[h7Lord]?.house || 1;
  // A7 = 7th house distance from 7th lord mirrored
  const dist = h7LordHouse - 7;
  const a7Idx = ((lagnaIdx + 6 + dist + dist) % 12);
  return { rasiIdx: a7Idx < 0 ? a7Idx + 12 : a7Idx % 12,
    rasi: RASI_NAMES[((a7Idx % 12) + 12) % 12] };
}
 
// ── Venus affliction score ──
function getVenusAffliction(planets, lagnaIdx) {
  const venus = planets.Venus;
  if (!venus) return { score: 0, factors: [] };
  let score = 0;
  const factors = [];
  const venusH = venus.house;
 
  // Saturn aspect on Venus
  if ((planets.Saturn?.aspects || []).includes(venusH)) { score += 30; factors.push('Saturn aspects Venus (delays/cold in love)'); }
  // Mars aspect on Venus
  if ((planets.Mars?.aspects || []).includes(venusH)) { score += 20; factors.push('Mars aspects Venus (passion + conflict in love)'); }
  // Rahu conjunct Venus
  if (Math.abs((planets.Rahu?.sid || 0) - venus.sid) < 10) { score += 25; factors.push('Rahu conjunct Venus (obsessive/unusual relationships)'); }
  // Venus combust
  if (venus.combust) { score += 30; factors.push('Venus combust (suppressed love, beauty issues)'); }
  // Venus in enemy sign
  if (venus.status.includes('Enemy') || venus.status.includes('Debilitated')) { score += 20; factors.push(`Venus ${venus.status} (weakened relationship significations)`); }
  // Venus in 6, 8, 12
  if ([6,8,12].includes(venusH)) { score += 15; factors.push(`Venus in H${venusH} (hidden/troubled love)`); }
  // Ketu conjunct Venus
  if (Math.abs((planets.Ketu?.sid || 0) - venus.sid) < 10) { score += 20; factors.push('Ketu conjunct Venus (detachment in relationships, spiritual love)'); }
 
  const level = score >= 60 ? 'HIGH' : score >= 30 ? 'MODERATE' : 'LOW';
  return { score, level, factors,
    summary: `Venus affliction: ${level} (${score}/100) — ${factors.join('; ') || 'Venus relatively unafflicted'}` };
}
 
// ── Divorce & Second Marriage Indicators ──
function getDivorceIndicators(planets, lagnaIdx) {
  const indicators = [];
  const H = name => planets[name]?.house || 0;
  const l7 = RASI_LORD[(lagnaIdx + 6) % 12];
  const l7H = H(l7);
 
  // 7th lord in 6, 8, or 12
  if ([6,8,12].includes(l7H)) indicators.push(`7th lord ${l7} in H${l7H} (dusthana) — marriage faces obstacles`);
  // Mars + Saturn both in 7th
  if (H('Mars') === 7 && H('Saturn') === 7) indicators.push('Mars + Saturn both in H7 — serious marital tension');
  // Rahu in 7th
  if (H('Rahu') === 7) indicators.push('Rahu in H7 — unconventional or troubled marriage');
  // Venus debilitated or combust
  if (planets.Venus?.status.includes('Debilitated')) indicators.push('Venus debilitated — relationship dissatisfaction');
  if (planets.Venus?.combust) indicators.push('Venus combust — suppressed love nature');
  // 7th lord retrograde
  if (planets[l7]?.retrograde) indicators.push(`7th lord ${l7} retrograde — karmic marriage, unresolved past relationship karma`);
  // Multiple planets in 7th (4+)
  const h7Planets = Object.values(planets).filter(p => p.house === 7).length;
  if (h7Planets >= 3) indicators.push(`${h7Planets} planets in H7 — complex, multi-layered marriage life`);
 
  return {
    count: indicators.length,
    level: indicators.length >= 3 ? 'HIGH' : indicators.length >= 2 ? 'MODERATE' : indicators.length >= 1 ? 'LOW' : 'NONE',
    indicators,
    summary: indicators.length
      ? `Divorce/strain indicators (${indicators.length}): ${indicators.join(' | ')}`
      : 'No significant divorce indicators — marriage expected to be stable'
  };
}
 
// ── Psychological Engine ──
function getPsychologicalProfile(planets, lagnaIdx) {
  const profile = {};
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
 
  // Abandonment wound: Moon afflicted (Saturn aspect, 8th/12th house, Ketu conjunct)
  const moonH = H('Moon');
  const abandonmentFactors = [];
  if ([8,12].includes(moonH)) abandonmentFactors.push(`Moon in H${moonH} (isolation, emotional withdrawal)`);
  if ((planets.Saturn?.aspects||[]).includes(moonH)) abandonmentFactors.push('Saturn aspects Moon (emotional coldness, loneliness felt deeply)');
  if (Math.abs((planets.Ketu?.sid||0) - (planets.Moon?.sid||0)) < 10) abandonmentFactors.push('Ketu conjunct Moon (detachment, feeling of being different/abandoned)');
  profile.abandonmentWound = { present: abandonmentFactors.length > 0, factors: abandonmentFactors };
 
  // Father wound: Sun afflicted or in 6/8/12, Saturn aspects Sun
  const sunH = H('Sun');
  const fatherFactors = [];
  if ([6,8,12].includes(sunH)) fatherFactors.push(`Sun in H${sunH} (father distant or difficult)`);
  if ((planets.Saturn?.aspects||[]).includes(sunH)) fatherFactors.push('Saturn aspects Sun (authority conflict, father cold or stern)');
  if (ST('Sun').includes('Debilitated')) fatherFactors.push('Sun debilitated (father figure weak or absent)');
  profile.fatherWound = { present: fatherFactors.length > 0, factors: fatherFactors };
 
  // Mother wound: Moon afflicted, 4th house issues
  const h4 = Object.values(planets).filter(p => p.house === 4).map((_, i) => i);
  const motherFactors = [...abandonmentFactors];
  if ((planets.Mars?.aspects||[]).includes(4) || H('Mars') === 4) motherFactors.push('Mars influence on H4 (conflict in home, difficult mother relationship)');
  profile.motherWound = { present: motherFactors.length > 0, factors: motherFactors };
 
  // Emotional repression: Moon in earth signs or Saturn/Ketu influenced
  const repressionFactors = [];
  if (['Vrischika','Makara','Kumbha'].includes(planets.Moon?.rasi)) repressionFactors.push(`Moon in ${planets.Moon?.rasi} (emotions suppressed, controlled outward expression)`);
  if ((planets.Saturn?.aspects||[]).includes(moonH)) repressionFactors.push('Saturn aspects Moon (difficulty expressing feelings)');
  profile.emotionalRepression = { present: repressionFactors.length > 0, factors: repressionFactors };
 
  // Obsessive love: Rahu-Venus connection, 8th-5th connection
  const obsessionFactors = [];
  if (Math.abs((planets.Rahu?.sid||0) - (planets.Venus?.sid||0)) < 10) obsessionFactors.push('Rahu-Venus conjunct (intense obsessive love, desire for forbidden)');
  if ((planets.Mars?.aspects||[]).includes(H('Venus'))) obsessionFactors.push('Mars aspects Venus (passionate, possessive in love)');
  profile.obsessiveLove = { present: obsessionFactors.length > 0, factors: obsessionFactors };
 
  // Self-sabotage: 8th lord strong, Ketu in 1/5/9
  const sabotageFactors = [];
  if ([1,5,9].includes(H('Ketu'))) sabotageFactors.push(`Ketu in H${H('Ketu')} (self-undermining, stepping back from success)`);
  if ([6,8,12].includes(H(RASI_LORD[(lagnaIdx)%12]))) sabotageFactors.push('Lagna lord in dusthana (tendency to undermine own progress)');
  profile.selfSabotage = { present: sabotageFactors.length > 0, factors: sabotageFactors };
 
  // Build summary strings
  const summary = [];
  if (profile.abandonmentWound.present) summary.push(`ABANDONMENT PATTERN: ${abandonmentFactors.join('; ')}`);
  if (profile.fatherWound.present) summary.push(`FATHER WOUND: ${fatherFactors.join('; ')}`);
  if (profile.motherWound.present && motherFactors.length > 0) summary.push(`MOTHER/HOME WOUND: ${motherFactors.join('; ')}`);
  if (profile.emotionalRepression.present) summary.push(`EMOTIONAL REPRESSION: ${repressionFactors.join('; ')}`);
  if (profile.obsessiveLove.present) summary.push(`OBSESSIVE LOVE PATTERN: ${obsessionFactors.join('; ')}`);
  if (profile.selfSabotage.present) summary.push(`SELF-SABOTAGE: ${sabotageFactors.join('; ')}`);
 
  profile.summary = summary.join(' || ');
  return profile;
}
 
// ── Gandanta Detection ──
// Junction points between water and fire signs (Pisces/Aries, Cancer/Leo, Scorpio/Sagittarius)
function detectGandanta(planets) {
  const GANDANTA_ZONES = [
    { from: 11, to: 0, desc: 'Meena-Mesha junction' },
    { from: 3,  to: 4, desc: 'Kataka-Simha junction' },
    { from: 7,  to: 8, desc: 'Vrischika-Dhanu junction' },
  ];
  const gandanta = [];
  for (const [name, p] of Object.entries(planets)) {
    for (const zone of GANDANTA_ZONES) {
      // Last 3.2° of water sign or first 3.2° of fire sign
      if ((p.rasiIdx === zone.from && p.degInRasi >= 26.8) ||
          (p.rasiIdx === zone.to   && p.degInRasi <= 3.2)) {
        gandanta.push({
          planet: name, rasi: p.rasi, degree: p.degInRasi.toFixed(2),
          junction: zone.desc,
          desc: `${name} at ${zone.desc} — Gandanta point: deep karmic stress, transformation through endings, spiritual intensity`
        });
      }
    }
  }
  return gandanta;
}
 
// ── Additional Yogas ──
function detectAdvancedYogas(planets, lagnaIdx) {
  const yogas = [];
  const H = name => planets[name]?.house || 0;
 
  // Guru Chandal Yoga
  if (Math.abs((planets.Jupiter?.sid||0) - (planets.Rahu?.sid||0)) < 10)
    yogas.push({name:'Guru Chandal Yoga',type:'warn',
      desc:'Jupiter conjunct Rahu — unconventional wisdom, breaks from tradition, foreign guru, obsessive beliefs'});
 
  // Pitru Dosha (Sun afflicted by Rahu/Ketu, or Sun in 9th with malefics)
  const sunH = H('Sun');
  const rahuNearSun = Math.abs((planets.Rahu?.sid||0) - (planets.Sun?.sid||0)) < 15;
  const ketuNearSun = Math.abs((planets.Ketu?.sid||0) - (planets.Sun?.sid||0)) < 15;
  if (rahuNearSun || ketuNearSun || (sunH === 9 && (H('Saturn')===9 || H('Mars')===9)))
    yogas.push({name:'Pitru Dosha',type:'warn',
      desc:'Sun afflicted by nodes — ancestral karma unresolved, father-related difficulties, debt to ancestors. Pitra tarpan and Navgraha puja recommended.'});
 
  // Shrapit Dosha (Saturn + Rahu conjunction)
  if (Math.abs((planets.Saturn?.sid||0) - (planets.Rahu?.sid||0)) < 10)
    yogas.push({name:'Shrapit Dosha',type:'warn',
      desc:'Saturn + Rahu conjunct — curse from past life, repeated patterns of suffering and delay in same area of life. Requires Shrapit Dosha Nivaran puja.'});
 
  // Kemdrum Yoga (Moon alone, no planets in adjacent houses)
  const moonH = H('Moon');
  const adjH1 = ((moonH - 2 + 12) % 12) + 1, adjH2 = (moonH % 12) + 1;
  const planetsExceptRahuKetu = ['Sun','Mars','Mercury','Jupiter','Venus','Saturn'];
  const noAdj = planetsExceptRahuKetu.every(n => H(n) !== adjH1 && H(n) !== adjH2 && H(n) !== moonH);
  if (noAdj) {
    const kemNull = [];
    if ([1,4,7,10].includes(moonH)) kemNull.push('Moon in Kendra — Kemdrum cancelled');
    yogas.push({name:`Kemdrum Yoga${kemNull.length?' (CANCELLED)':''}`,type:'warn',
      nullified:kemNull.length>0, nullifiers:kemNull,
      desc:`Moon isolated in H${moonH} — ${kemNull.length?'cancelled: '+kemNull.join('; '):'emotional isolation, mental loneliness, periods of self-reliance forced by circumstances'}`});
  }
 
  // Lakshmi Yoga: 9th lord in own/exalt in Kendra or Trikona + Venus strong
  const l9 = RASI_LORD[(lagnaIdx+8)%12];
  const l9H = H(l9), l9St = planets[l9]?.status||'';
  if ([1,4,5,7,9,10].includes(l9H) && (l9St.includes('Exalted')||l9St.includes('Own')))
    yogas.push({name:'Lakshmi Yoga',type:'good',
      desc:`9th lord ${l9} strong in H${l9H} — exceptional wealth, grace, material prosperity, divine favor`});
 
  // Dharma-Karma Adhipati Yoga: lords of 9 and 10 conjunct or exchange
  const l10 = RASI_LORD[(lagnaIdx+9)%12];
  const l10H = H(l10);
  if (l9===l10 || l9H===10 || l10H===9 || l9H===l10H ||
      Math.abs((planets[l9]?.sid||0) - (planets[l10]?.sid||0)) < 10)
    yogas.push({name:'Dharma-Karma Adhipati Yoga',type:'good',
      desc:`9th lord (${l9}) and 10th lord (${l10}) connected — exceptional career rise, dharmic success, respected profession, work aligned with higher purpose`});
 
  return yogas;
}
 
module.exports.buildHouseLordsEngine = buildHouseLordsEngine;
module.exports.buildDivisionalChart = buildDivisionalChart;
module.exports.getCurrentTransits = getCurrentTransits;
module.exports.calcA7 = calcA7;
module.exports.getVenusAffliction = getVenusAffliction;
module.exports.getDivorceIndicators = getDivorceIndicators;
module.exports.getPsychologicalProfile = getPsychologicalProfile;
module.exports.detectGandanta = detectGandanta;
module.exports.detectAdvancedYogas = detectAdvancedYogas;
 
// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 2
// ═══════════════════════════════════════════════════
 
// ── Antardasha + Pratyantar with event trigger logic ──
function getDashaEventTriggers(dasha, planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  const MARRIAGE_HOUSES = [7,2,11];
  const CAREER_HOUSES   = [10,6,11];
  const WEALTH_HOUSES   = [2,11,9];
  const CHILD_HOUSES    = [5,9,1];
  const FOREIGN_HOUSES  = [12,9,8];
 
  function isActivator(lord, houses) {
    const h = H(lord);
    const aspects = planets[lord]?.aspects || [];
    return houses.some(hx => h === hx || aspects.includes(hx));
  }
 
  const triggers = {
    marriage:[], career:[], wealth:[], children:[], foreign:[], health:[]
  };
 
  const { current, antardashas, prayantardashas } = dasha;
  if (!current || !antardashas) return triggers;
 
  // Check each antardasha for event triggers
  antardashas.forEach(ant => {
    const isMarriage = isActivator(current.lord, MARRIAGE_HOUSES) &&
                       isActivator(ant.lord, MARRIAGE_HOUSES);
    const isCareer   = isActivator(current.lord, CAREER_HOUSES) &&
                       isActivator(ant.lord, CAREER_HOUSES);
    const isWealth   = isActivator(current.lord, WEALTH_HOUSES) &&
                       isActivator(ant.lord, WEALTH_HOUSES);
    const isChild    = isActivator(current.lord, CHILD_HOUSES) &&
                       isActivator(ant.lord, CHILD_HOUSES);
    const isForeign  = isActivator(current.lord, FOREIGN_HOUSES) &&
                       isActivator(ant.lord, FOREIGN_HOUSES);
 
    if (isMarriage) triggers.marriage.push(
      `${current.lord}–${ant.lord} (${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)})`);
    if (isCareer)   triggers.career.push(
      `${current.lord}–${ant.lord} (${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)})`);
    if (isWealth)   triggers.wealth.push(
      `${current.lord}–${ant.lord} (${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)})`);
    if (isChild)    triggers.children.push(
      `${current.lord}–${ant.lord} (${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)})`);
    if (isForeign)  triggers.foreign.push(
      `${current.lord}–${ant.lord} (${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)})`);
  });
 
  // Pratyantar level for current antardasha
  if (prayantardashas) {
    prayantardashas.forEach(pr => {
      const now = Date.now();
      const isNow = new Date(pr.startDate) <= now && new Date(pr.endDate) > now;
      if (isNow) {
        triggers.currentPratyantar = `${current.lord}–${dasha.currentAntar?.lord}–${pr.lord} (now until ${pr.endDate.slice(0,7)})`;
        triggers.pratantarTriggers = {
          marriage: isActivator(pr.lord, MARRIAGE_HOUSES),
          career:   isActivator(pr.lord, CAREER_HOUSES),
          wealth:   isActivator(pr.lord, WEALTH_HOUSES),
        };
      }
    });
  }
 
  return triggers;
}
 
// ── Upapada Lord Analysis ──
function analyzeUpapadaLord(upapadaLagna, planets, lagnaIdx) {
  if (!upapadaLagna) return null;
  const ulRasiIdx = upapadaLagna.rasiIdx;
  const ulLord = RASI_LORD[ulRasiIdx];
  const ulLordData = planets[ulLord];
  if (!ulLordData) return null;
 
  const ulLordH = ulLordData.house;
  const ulLordStatus = ulLordData.status;
  const afflictions = [];
 
  if (ulLordData.combust) afflictions.push('Combust — spouse karma heavy, marriage suffers');
  if (ulLordData.retrograde) afflictions.push('Retrograde — karmic marriage, past-life connection');
  if ([6,8,12].includes(ulLordH)) afflictions.push(`UL lord in H${ulLordH} (dusthana) — difficult spouse or troubled marriage`);
  if (ulLordStatus.includes('Debilitated')) afflictions.push('UL lord debilitated — weak marriage promise');
  if ((planets.Saturn?.aspects||[]).includes(ulLordH)) afflictions.push('Saturn aspects UL lord — delay, burden in marriage');
  if ((planets.Mars?.aspects||[]).includes(ulLordH)) afflictions.push('Mars aspects UL lord — conflict, aggression in marriage');
  if (Math.abs((planets.Rahu?.sid||0) - ulLordData.sid) < 10) afflictions.push('Rahu conjunct UL lord — unconventional or foreign spouse');
 
  const quality = afflictions.length === 0 ? 'Strong — stable, good quality marriage'
    : afflictions.length <= 2 ? 'Moderate — marriage has challenges but survives'
    : 'Afflicted — significant marriage difficulties, needs remedies';
 
  return {
    upapadaSign: RASI_NAMES[ulRasiIdx],
    lord: ulLord, lordHouse: ulLordH, lordStatus: ulLordStatus,
    afflictions, quality,
    summary: `Upapada in ${RASI_NAMES[ulRasiIdx]}, lord ${ulLord} in H${ulLordH} (${ulLordStatus}) — ${quality}${afflictions.length ? ' | Afflictions: ' + afflictions.join('; ') : ''}`
  };
}
 
// ── Navamsa Marriage Engine ──
function analyzeNavamsaMarriage(navamsa, karakas, lagnaIdx) {
  if (!navamsa) return null;
  const d9Planets = navamsa.planets;
  const d9LagnaIdx = navamsa.lagna.rasiIdx;
 
  // D9 7th house and lord
  const d9SeventhSign = (d9LagnaIdx + 6) % 12;
  const d9SeventhLord = RASI_LORD[d9SeventhSign];
  const d9SeventhLordData = d9Planets[d9SeventhLord];
  const d9SeventhOccupants = Object.entries(d9Planets)
    .filter(([,p]) => p.house === 7).map(([n]) => n);
 
  // D9 Venus
  const d9Venus = d9Planets['Venus'];
  const d9VenusStatus = d9Venus?.status || '';
 
  // Darakaraka in D9
  const darakaraka = karakas?.Darakaraka;
  const d9Dara = darakaraka ? d9Planets[darakaraka] : null;
 
  const analysis = [];
  if (d9VenusStatus.includes('Exalted') || d9VenusStatus.includes('Own'))
    analysis.push('Venus strong in D9 — excellent marriage partner, loving relationship');
  if (d9VenusStatus.includes('Debilitated'))
    analysis.push('Venus debilitated in D9 — spouse may be troubled or relationship difficult');
  if (d9SeventhLordData?.status.includes('Exalted') || d9SeventhLordData?.status.includes('Own'))
    analysis.push(`D9 7th lord ${d9SeventhLord} strong — spouse of good character and stability`);
  if ([6,8,12].includes(d9SeventhLordData?.house))
    analysis.push(`D9 7th lord in H${d9SeventhLordData?.house} (dusthana) — marriage faces hidden difficulties`);
  if (d9Dara)
    analysis.push(`Darakaraka ${darakaraka} in D9 H${d9Dara.house} (${d9Dara.status}) — spouse's core nature revealed`);
 
  return {
    d9SeventhSign: RASI_NAMES[d9SeventhSign],
    d9SeventhLord,
    d9SeventhLordHouse: d9SeventhLordData?.house,
    d9SeventhLordStatus: d9SeventhLordData?.status,
    d9SeventhOccupants,
    d9Venus: { rasi: d9Venus?.rasi, house: d9Venus?.house, status: d9VenusStatus },
    darakaraka, d9DaraHouse: d9Dara?.house, d9DaraStatus: d9Dara?.status,
    analysis,
    summary: `D9 7th: ${RASI_NAMES[d9SeventhSign]}, lord ${d9SeventhLord} H${d9SeventhLordData?.house||'?'} (${d9SeventhLordData?.status||'?'}) | D9 Venus: ${d9Venus?.rasi} H${d9Venus?.house} ${d9VenusStatus} | ${analysis.join(' | ')}`
  };
}
 
// ── Second Marriage Indicators ──
function getSecondMarriageIndicators(planets, lagnaIdx, upapadaLagna, venusAffliction, divorceIndicators) {
  const H = name => planets[name]?.house || 0;
  const l7 = RASI_LORD[(lagnaIdx+6)%12];
  const indicators = [];
 
  // 7th lord in 8th or 12th
  if ([8,12].includes(H(l7))) indicators.push(`7th lord ${l7} in H${H(l7)} — strong second marriage signal`);
  // 8th house involvement in marriage (8th = second marriage in some traditions)
  const h8Planets = Object.values(planets).filter(p=>p.house===8);
  if (h8Planets.length >= 2) indicators.push('Multiple planets in H8 — transformation of marriage life');
  // Dual signs (Mithuna, Kanya, Dhanu, Meena) as 7th
  const h7Sign = (lagnaIdx+6)%12;
  if ([2,5,8,11].includes(h7Sign)) indicators.push(`7th house in ${RASI_NAMES[h7Sign]} (dual sign) — possibility of multiple marriages`);
  // Venus heavily afflicted
  if (venusAffliction?.level === 'HIGH') indicators.push('Venus highly afflicted — difficulty maintaining one relationship');
  // High divorce indicators
  if (divorceIndicators?.count >= 3) indicators.push('Multiple divorce indicators present');
  // Rahu in 7th or 9th
  if (H('Rahu')===7||H('Rahu')===9) indicators.push(`Rahu in H${H('Rahu')} — unconventional relationship path, possible second union`);
 
  return {
    count: indicators.length,
    likely: indicators.length >= 3,
    indicators,
    summary: indicators.length >= 3
      ? `Second marriage likely (${indicators.length} indicators): ${indicators.join(' | ')}`
      : indicators.length > 0
        ? `Second marriage possible (${indicators.length} indicators): ${indicators.join(' | ')}`
        : 'Second marriage not strongly indicated'
  };
}
 
// ── Secret Relationship Indicators ──
function getSecretRelationshipIndicators(planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  const indicators = [];
 
  // Venus in 8th or 12th
  if ([8,12].includes(H('Venus'))) indicators.push(`Venus in H${H('Venus')} — hidden love, secret affairs possible`);
  // Rahu + Venus conjunction
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10)
    indicators.push('Rahu-Venus conjunct — obsessive hidden attraction, secret relationship pattern');
  // 5th-8th connection (5th lord in 8th or vice versa)
  const l5 = RASI_LORD[(lagnaIdx+4)%12], l8 = RASI_LORD[(lagnaIdx+7)%12];
  if (H(l5)===8) indicators.push(`5th lord ${l5} in H8 — romance hidden, secret love affairs`);
  if (H(l8)===5) indicators.push(`8th lord ${l8} in H5 — hidden intimacy in romantic relationships`);
  // Moon in 12th
  if (H('Moon')===12) indicators.push('Moon in H12 — emotional life kept very private, hidden feelings');
  // Mars in 12th
  if (H('Mars')===12) indicators.push('Mars in H12 — secret desires, hidden passion');
 
  return {
    count: indicators.length,
    present: indicators.length >= 2,
    indicators,
    summary: indicators.length >= 2
      ? `Secret relationship pattern present (${indicators.length} indicators): ${indicators.join(' | ')}`
      : 'No strong secret relationship indicators'
  };
}
 
// ── Foreign Settlement Engine ──
function getForeignSettlementIndicators(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const indicators = [];
  let score = 0;
 
  // H12 occupied
  const h12Planets = Object.values(planets).filter(p=>p.house===12);
  if (h12Planets.length > 0) { score+=20; indicators.push(`${h12Planets.length} planet(s) in H12 (foreign lands house)`); }
  // Rahu in H12, 9, or 8
  if ([12,9,8].includes(H('Rahu'))) { score+=25; indicators.push(`Rahu in H${H('Rahu')} — strong foreign magnetism`); }
  // Moon in H12
  if (H('Moon')===12) { score+=20; indicators.push('Moon in H12 — heart naturally in foreign lands'); }
  // 9th lord in 12th or 12th lord in 9th
  const l9=RASI_LORD[(lagnaIdx+8)%12], l12=RASI_LORD[(lagnaIdx+11)%12];
  if (H(l9)===12) { score+=20; indicators.push(`9th lord ${l9} in H12 — foreign destiny linked to dharma`); }
  if (H(l12)===9) { score+=15; indicators.push(`12th lord ${l12} in H9 — long journeys, foreign pilgrimage`); }
  // Mercury in 12th (work abroad)
  if (H('Mercury')===12) { score+=15; indicators.push('Mercury in H12 — work or communication in foreign context'); }
  // Dasha trigger for foreign
  if (dasha.current && [H('Rahu'),12,9].includes(planets[dasha.current.lord]?.house))
    { score+=15; indicators.push(`Current ${dasha.current.lord} Dasha activates foreign houses`); }
 
  return {
    score, level: score>=60?'HIGH':score>=30?'MODERATE':'LOW',
    indicators,
    summary: `Foreign settlement ${score>=60?'STRONGLY':score>=30?'MODERATELY':'MILDLY'} indicated (score ${score}/100): ${indicators.join(' | ')}`
  };
}
 
// ── Children Timing Engine ──
function getChildrenTiming(planets, lagnaIdx, dasha, transits) {
  const H = name => planets[name]?.house || 0;
  const l5 = RASI_LORD[(lagnaIdx+4)%12];
  const windows = [];
 
  // Jupiter Dasha or Antardasha triggers children
  dasha.antardashas?.forEach(ant => {
    const isChildActivator = (lord) => {
      const h = H(lord);
      const aspects = planets[lord]?.aspects||[];
      return h===5 || h===9 || aspects.includes(5) || aspects.includes(9) || lord===l5;
    };
    if (isChildActivator(dasha.current?.lord) || isChildActivator(ant.lord) || ant.lord==='Jupiter') {
      windows.push(`${dasha.current?.lord}–${ant.lord} (${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)})`);
    }
  });
 
  // Concerns
  const concerns = [];
  const h5Planets = Object.values(planets).filter(p=>p.house===5);
  if (h5Planets.some(p=>['Saturn','Rahu','Ketu'].includes(Object.keys(planets).find(k=>planets[k]===p))))
    concerns.push('Malefic in H5 — possible delay or difficulty in having children');
  if (H('Jupiter')===6||H('Jupiter')===8||H('Jupiter')===12)
    concerns.push(`Jupiter in H${H('Jupiter')} (dusthana) — Jupiter's children signification weakened`);
  const l5Status = planets[l5]?.status||'';
  if (l5Status.includes('Debilitated')||l5Status.includes('Enemy'))
    concerns.push(`5th lord ${l5} weak (${l5Status}) — children may come late or with difficulty`);
 
  return {
    triggerWindows: windows.slice(0,3),
    concerns,
    summary: `Best child conception windows: ${windows.slice(0,3).join(' | ')||'Requires Dasha analysis'}.${concerns.length?' Concerns: '+concerns.join('; '):'No major concerns.'}`
  };
}
 
module.exports.getDashaEventTriggers = getDashaEventTriggers;
module.exports.analyzeUpapadaLord = analyzeUpapadaLord;
module.exports.analyzeNavamsaMarriage = analyzeNavamsaMarriage;
module.exports.getSecondMarriageIndicators = getSecondMarriageIndicators;
module.exports.getSecretRelationshipIndicators = getSecretRelationshipIndicators;
module.exports.getForeignSettlementIndicators = getForeignSettlementIndicators;
module.exports.getChildrenTiming = getChildrenTiming;
 
// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 3
// ═══════════════════════════════════════════════════
 
// ── Exact Transit Trigger Logic ──
function getTransitTriggers(planets, lagnaIdx, dasha, transits, karakas, upapadaLagna) {
  const H = name => planets[name]?.house || 0;
  const triggers = { marriage:[], career:[], wealth:[], children:[], health:[], property:[] };
 
  // Get current transit positions
  const now = new Date();
  const jdNow = 2451545.0 + (now - new Date('2000-01-01T12:00:00Z')) / (1000*86400);
  const ayan = getLahiriAyanamsha(jdNow);
  const T = (jdNow - 2451545.0) / 36525;
 
  const Mjup = norm360(20.9 + 3034.906*T);
  const jupTrop = norm360(34.3515 + 3034.9057*T + 5.5549*Math.sin(toRad(Mjup)) - 14.3312);
  const jupTransitRasi = Math.floor(sid(jupTrop,ayan)/30);
 
  const Msat = norm360(317.0207 + 1222.1138*T);
  const satTrop = norm360(50.0775 + 1222.1138*T + 6.3585*Math.sin(toRad(Msat)) - 92.8553);
  const satTransitRasi = Math.floor(sid(satTrop,ayan)/30);
 
  const rahuTrop = norm360(125.044555 - 1934.136261*T);
  const rahuTransitRasi = Math.floor(sid(rahuTrop,ayan)/30);
 
  const jupTransitH = ((jupTransitRasi - lagnaIdx + 12)%12)+1;
  const satTransitH = ((satTransitRasi - lagnaIdx + 12)%12)+1;
  const rahuTransitH = ((rahuTransitRasi - lagnaIdx + 12)%12)+1;
 
  // Natal positions of key planets
  const natVenusRasi   = planets.Venus?.rasiIdx  || 0;
  const natJupRasi     = planets.Jupiter?.rasiIdx || 0;
  const l7             = RASI_LORD[(lagnaIdx+6)%12];
  const natL7Rasi      = planets[l7]?.rasiIdx    || 0;
  const ulRasi         = upapadaLagna?.rasiIdx   || 0;
  const dk             = karakas?.Darakaraka;
  const natDKRasi      = dk ? planets[dk]?.rasiIdx || 0 : 0;
  const l10            = RASI_LORD[(lagnaIdx+9)%12];
  const natL10Rasi     = planets[l10]?.rasiIdx   || 0;
  const l4             = RASI_LORD[(lagnaIdx+3)%12];
 
  // ── Marriage transit triggers ──
  // Jupiter transiting over natal Venus, 7th lord, UL, or DK
  if (jupTransitRasi === natVenusRasi)  triggers.marriage.push('Transit Jupiter over natal Venus — marriage activation strong');
  if (jupTransitRasi === natL7Rasi)     triggers.marriage.push(`Transit Jupiter over natal 7th lord ${l7} — marriage timing active`);
  if (jupTransitRasi === ulRasi)        triggers.marriage.push('Transit Jupiter over Upapada Lagna — marriage event very likely');
  if (dk && jupTransitRasi === natDKRasi) triggers.marriage.push(`Transit Jupiter over Darakaraka ${dk} — spouse-related event`);
  if (jupTransitH === 7)                triggers.marriage.push('Transit Jupiter in natal H7 — auspicious for marriage');
  if (jupTransitH === 2 || jupTransitH === 11) triggers.marriage.push(`Transit Jupiter in H${jupTransitH} — wealth through marriage, partnership gains`);
  // Saturn aspecting 7th from transit
  const satTransitAspects = getAspects('Saturn', satTransitH);
  if (satTransitAspects.includes(7)) triggers.marriage.push(`Transit Saturn aspects natal H7 — marriage delayed or tested, but serious commitment possible`);
  // Rahu transiting 7th
  if (rahuTransitH === 7) triggers.marriage.push('Transit Rahu in H7 — unconventional marriage, foreign partner possible');
 
  // ── Career transit triggers ──
  if (jupTransitRasi === natL10Rasi)  triggers.career.push(`Transit Jupiter over 10th lord ${l10} — career breakthrough`);
  if (jupTransitH === 10)             triggers.career.push('Transit Jupiter in H10 — promotion, recognition, career expansion');
  if (jupTransitH === 6)              triggers.career.push('Transit Jupiter in H6 — new job, service, competitive success');
  if (satTransitH === 10)             triggers.career.push('Transit Saturn in H10 — career responsibility increases, slow but solid advancement');
  if (satTransitAspects.includes(10)) triggers.career.push('Transit Saturn aspects H10 — career restructuring, demands hard work');
 
  // ── Wealth transit triggers ──
  if (jupTransitH === 2 || jupTransitH === 11) triggers.wealth.push(`Transit Jupiter in H${jupTransitH} — income increase, financial expansion`);
  if (jupTransitH === 9)              triggers.wealth.push('Transit Jupiter in H9 — luck, windfall, fortunate period');
  if (satTransitH === 11)             triggers.wealth.push('Transit Saturn in H11 — gains through discipline, slow wealth build');
  if (rahuTransitH === 11)            triggers.wealth.push('Transit Rahu in H11 — sudden or unexpected gains');
 
  // ── Health transit triggers ──
  if (satTransitH === 1 || satTransitH === 8) triggers.health.push(`Transit Saturn in H${satTransitH} — health pressure, chronic conditions possible, need preventive care`);
  if (satTransitAspects.includes(1))  triggers.health.push('Transit Saturn aspects H1 (self) — health demands attention');
  if (rahuTransitH === 6 || rahuTransitH === 8) triggers.health.push(`Transit Rahu in H${rahuTransitH} — unusual health events, hidden illness possible`);
 
  // ── Property transit triggers ──
  if (jupTransitH === 4)              triggers.property.push('Transit Jupiter in H4 — home purchase, property gain very favored');
  if (satTransitH === 4)              triggers.property.push('Transit Saturn in H4 — property responsibility, home renovation or relocation');
 
  // Double transit check (Jupiter + Saturn both favorable = major event)
  const JFAV = [1,2,4,5,7,9,10,11];
  const SFAV = [3,6,11];
  const moonRasi = planets.Moon?.rasiIdx || 0;
  const jupFromMoon = ((jupTransitRasi - moonRasi + 12)%12)+1;
  const satFromMoon = ((satTransitRasi - moonRasi + 12)%12)+1;
  const doubleTransitActive = JFAV.includes(jupFromMoon) && SFAV.includes(satFromMoon);
 
  return {
    ...triggers,
    currentPositions: {
      jupiter: `${RASI_NAMES[jupTransitRasi]} H${jupTransitH} (H${jupFromMoon} from Moon)`,
      saturn:  `${RASI_NAMES[satTransitRasi]} H${satTransitH} (H${satFromMoon} from Moon)`,
      rahu:    `${RASI_NAMES[rahuTransitRasi]} H${rahuTransitH}`,
    },
    doubleTransitActive,
    summary: Object.entries(triggers)
      .filter(([,v])=>Array.isArray(v)&&v.length)
      .map(([k,v])=>`${k.toUpperCase()}: ${v.join(' | ')}`)
      .join(' || ')
  };
}
 
// ── Refined Marriage Trigger (needs 2 of 4 key activators) ──
function getRefinedMarriageTrigger(dasha, planets, lagnaIdx, karakas, upapadaLagna) {
  const H = name => planets[name]?.house || 0;
  const l7  = RASI_LORD[(lagnaIdx+6)%12];
  const dk  = karakas?.Darakaraka;
  const ulLord = upapadaLagna ? RASI_LORD[upapadaLagna.rasiIdx] : null;
 
  function activates(lord, targetHouses) {
    if (!lord || !planets[lord]) return false;
    const h = H(lord);
    const aspects = planets[lord]?.aspects || [];
    return targetHouses.some(th => h===th || aspects.includes(th));
  }
 
  const MAR_HOUSES = [2,7,11];
  const windows = [];
 
  dasha.antardashas?.forEach(ant => {
    let score = 0;
    const mLord = dasha.current?.lord;
    const aLord = ant.lord;
 
    if (activates(mLord, MAR_HOUSES) || mLord===l7 || mLord===dk || mLord===ulLord || mLord==='Venus') score++;
    if (activates(aLord, MAR_HOUSES) || aLord===l7 || aLord===dk || aLord===ulLord || aLord==='Venus') score++;
    // Jupiter always supports marriage
    if (aLord==='Jupiter'||mLord==='Jupiter') score++;
    // 7th lord or DK as antardasha
    if (aLord===l7||aLord===dk) score++;
 
    if (score >= 2) {
      windows.push({
        period: `${mLord}–${aLord}`,
        dates: `${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)}`,
        score, strength: score>=4?'VERY HIGH':score>=3?'HIGH':'MODERATE',
        reason: [
          activates(mLord,MAR_HOUSES)?`${mLord} activates marriage houses`:'',
          activates(aLord,MAR_HOUSES)?`${aLord} activates marriage houses`:'',
          aLord===l7||mLord===l7?`7th lord ${l7} active`:'',
          aLord===dk||mLord===dk?`Darakaraka ${dk} active`:'',
          aLord==='Venus'||mLord==='Venus'?'Venus active':'',
          aLord==='Jupiter'||mLord==='Jupiter'?'Jupiter blesses':'',
        ].filter(Boolean).join(', ')
      });
    }
  });
 
  windows.sort((a,b)=>b.score-a.score);
  return {
    windows: windows.slice(0,3),
    best: windows[0] || null,
    summary: windows.length
      ? `Best marriage windows: ${windows.slice(0,3).map(w=>`${w.period} (${w.dates}) — ${w.strength}: ${w.reason}`).join(' | ')}`
      : 'No strong marriage dasha trigger in current Mahadasha — check next Mahadasha'
  };
}
 
// ── Health Engine ──
function getHealthEngine(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const l1 = RASI_LORD[lagnaIdx];
  const l6 = RASI_LORD[(lagnaIdx+5)%12];
  const l8 = RASI_LORD[(lagnaIdx+7)%12];
  const l12= RASI_LORD[(lagnaIdx+11)%12];
 
  const concerns = [];
  const dangerPeriods = [];
 
  // Acute disease (6th house)
  const h6Planets = Object.values(planets).filter(p=>p.house===6);
  if (h6Planets.length>0) concerns.push(`Planets in H6 — tendency toward infections, enemies of health, immune challenges`);
  if ([6,8,12].includes(H(l1))) concerns.push(`Lagna lord ${l1} in H${H(l1)} — fundamental vitality weakened`);
 
  // Chronic/hidden disease (8th house)
  const h8Planets = Object.values(planets).filter(p=>p.house===8);
  if (h8Planets.length>0) concerns.push(`Planets in H8 — chronic conditions, sudden health events, surgery possible`);
 
  // Hospitalization (12th house)
  const h12Planets = Object.values(planets).filter(p=>p.house===12);
  if (h12Planets.length>0) concerns.push(`Planets in H12 — hospitalization or long illness periods in life`);
 
  // Saturn afflictions
  if ((planets.Saturn?.aspects||[]).includes(1)) concerns.push('Saturn aspects H1 — chronic stress, bones/joints/teeth vulnerable');
  if (H('Saturn')===6||H('Saturn')===8) concerns.push(`Saturn in H${H('Saturn')} — chronic disease tendency, slow healing`);
 
  // Mars afflictions  
  if ((planets.Mars?.aspects||[]).includes(1)) concerns.push('Mars aspects H1 — accident risk, inflammatory conditions, blood issues');
  if (H('Mars')===6||H('Mars')===8) concerns.push(`Mars in H${H('Mars')} — injury, surgery, fever tendency`);
 
  // Rahu in health houses
  if ([1,6,8].includes(H('Rahu'))) concerns.push(`Rahu in H${H('Rahu')} — mysterious ailments, unusual diagnoses, anxiety disorders`);
 
  // Dasha danger periods for health
  dasha.antardashas?.forEach(ant => {
    const mLord = dasha.current?.lord;
    const aLord = ant.lord;
    const mH = H(mLord), aH = H(aLord);
    if ([6,8,12].includes(mH) && [6,8,12].includes(aH))
      dangerPeriods.push(`${mLord}–${aLord} (${ant.startDate.slice(0,7)}–${ant.endDate.slice(0,7)}) — both lords in health-stress houses`);
    if ((aLord==='Saturn'||aLord==='Rahu'||aLord==='Ketu') && [6,8,12].includes(mH))
      dangerPeriods.push(`${mLord}–${aLord} (${ant.startDate.slice(0,7)}–${ant.endDate.slice(0,7)}) — malefic Bhukti in health-active Mahadasha`);
  });
 
  // Body parts vulnerable (from Lagna sign)
  const LAGNA_BODY = {
    Mesha:'head, brain, blood pressure', Rishabha:'throat, thyroid, neck',
    Mithuna:'lungs, arms, nervous system', Kataka:'chest, stomach, digestion',
    Simha:'heart, spine, upper back', Kanya:'intestines, digestion, skin',
    Tula:'kidneys, lower back, hormones', Vrischika:'reproductive organs, elimination',
    Dhanu:'hips, thighs, liver', Makara:'knees, joints, bones, teeth',
    Kumbha:'ankles, circulation, nervous system', Meena:'feet, lymphatic, immune'
  };
  const lagnaRasi = RASI_NAMES[lagnaIdx];
  const vulnerableBodyParts = LAGNA_BODY[lagnaRasi] || 'general constitution';
 
  return {
    concerns, dangerPeriods: dangerPeriods.slice(0,4),
    vulnerableBodyParts,
    summary: [
      `Vulnerable body parts: ${vulnerableBodyParts}`,
      concerns.length ? `Health concerns: ${concerns.join(' | ')}` : 'No major chronic health indicators',
      dangerPeriods.length ? `Danger periods: ${dangerPeriods.slice(0,2).join(' | ')}` : ''
    ].filter(Boolean).join(' || ')
  };
}
 
// ── Wealth Timing Engine ──
function getWealthTimingEngine(planets, lagnaIdx, dasha, transits) {
  const H = name => planets[name]?.house || 0;
  const l2  = RASI_LORD[(lagnaIdx+1)%12];
  const l11 = RASI_LORD[(lagnaIdx+10)%12];
  const WEALTH_HOUSES = [2,9,11];
  const windows = [];
 
  dasha.antardashas?.forEach(ant => {
    const mLord = dasha.current?.lord;
    const aLord = ant.lord;
    let score = 0;
 
    // Check if either activates wealth houses
    const mActivates = WEALTH_HOUSES.some(h=>H(mLord)===h||(planets[mLord]?.aspects||[]).includes(h));
    const aActivates = WEALTH_HOUSES.some(h=>H(aLord)===h||(planets[aLord]?.aspects||[]).includes(h));
    if (mActivates) score++;
    if (aActivates) score++;
    if (aLord===l2||mLord===l2) { score++; }
    if (aLord===l11||mLord===l11) { score++; }
    if (aLord==='Jupiter'||mLord==='Jupiter') score++;
 
    if (score >= 2) windows.push({
      period:`${mLord}–${aLord}`,
      dates:`${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)}`,
      score, strength: score>=4?'PEAK':score>=3?'HIGH':'MODERATE'
    });
  });
 
  // Dhana yogas check
  const dhanaYogas = [];
  if ((planets.Jupiter?.aspects||[]).includes(2)||(planets.Jupiter?.aspects||[]).includes(11)||H('Jupiter')===2||H('Jupiter')===11)
    dhanaYogas.push('Jupiter activates wealth houses — natural prosperity');
  if (H('Venus')===2||H('Venus')===11||(planets.Venus?.aspects||[]).includes(2))
    dhanaYogas.push('Venus in wealth house — income through arts, beauty, luxury');
  if (H(l2)===11||H(l11)===2)
    dhanaYogas.push(`2nd lord (${l2}) and 11th lord (${l11}) exchange — Dhana Yoga`);
 
  windows.sort((a,b)=>b.score-a.score);
  return {
    windows: windows.slice(0,4),
    dhanaYogas,
    summary: [
      dhanaYogas.length ? `Dhana Yogas: ${dhanaYogas.join(' | ')}` : '',
      windows.length ? `Peak wealth windows: ${windows.slice(0,3).map(w=>`${w.period} (${w.dates}) — ${w.strength}`).join(', ')}` : 'Wealth comes gradually, not in sudden bursts'
    ].filter(Boolean).join(' | ')
  };
}
 
// ── Property Engine ──
function getPropertyEngine(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const l4 = RASI_LORD[(lagnaIdx+3)%12];
  const PROP_HOUSES = [4,12];
  const windows = [];
 
  dasha.antardashas?.forEach(ant => {
    const mLord = dasha.current?.lord;
    const aLord = ant.lord;
    let score = 0;
 
    if (H(mLord)===4||(planets[mLord]?.aspects||[]).includes(4)) score++;
    if (H(aLord)===4||(planets[aLord]?.aspects||[]).includes(4)) score++;
    if (mLord===l4||aLord===l4) score+=2;
    if (mLord==='Mars'||aLord==='Mars') score++; // Mars = property karaka
    if (mLord==='Moon'||aLord==='Moon') score++; // Moon = home karaka
    if (mLord==='Saturn'||aLord==='Saturn') score++; // Saturn = land karaka
 
    if (score>=2) windows.push({
      period:`${mLord}–${aLord}`,
      dates:`${ant.startDate.slice(0,7)} to ${ant.endDate.slice(0,7)}`,
      score, strength: score>=4?'PEAK':score>=3?'HIGH':'MODERATE'
    });
  });
 
  // Property indicators in natal chart
  const indicators = [];
  if (H(l4)===4)   indicators.push(`4th lord ${l4} in own house — own home strongly indicated`);
  if ([1,4,7,10].includes(H('Mars'))) indicators.push(`Mars in Kendra — property acquisition supported`);
  if ((planets.Jupiter?.aspects||[]).includes(4)) indicators.push('Jupiter aspects H4 — blessed home, good property');
  if ([6,8,12].includes(H(l4))) indicators.push(`4th lord ${l4} in H${H(l4)} — property may be delayed or involve debt`);
 
  windows.sort((a,b)=>b.score-a.score);
  return {
    windows: windows.slice(0,3), indicators,
    summary: [
      indicators.join(' | ')||'Property from own effort',
      windows.length ? `Best property periods: ${windows.slice(0,2).map(w=>`${w.period} (${w.dates})`).join(', ')}` : ''
    ].filter(Boolean).join(' | ')
  };
}
 
// ── Argala Engine ──
function getArgala(planets, lagnaIdx, targetHouse) {
  // Argala = hidden influence on a house
  // Primary Argala: 2nd, 4th, 11th from target house
  // Obstruction: 12th, 10th, 3rd from target house
  const norm = h => ((h-1+12)%12)+1;
  const argalaHouses = [norm(targetHouse+1), norm(targetHouse+3), norm(targetHouse+10)];
  const obstructHouses= [norm(targetHouse+11), norm(targetHouse+9), norm(targetHouse+2)];
 
  const argalaOccupants = [], obstructOccupants = [];
  for (const [name, p] of Object.entries(planets)) {
    if (argalaHouses.includes(p.house))    argalaOccupants.push(`${name} in H${p.house} (${p.status.split(' ')[0]})`);
    if (obstructHouses.includes(p.house))  obstructOccupants.push(`${name} in H${p.house}`);
  }
 
  const netArgala = argalaOccupants.length > obstructOccupants.length ? 'positive' : 
                    argalaOccupants.length < obstructOccupants.length ? 'obstructed' : 'balanced';
 
  return {
    targetHouse, argalaHouses, obstructHouses,
    argalaOccupants, obstructOccupants, netArgala,
    summary: `Argala on H${targetHouse}: ${netArgala} — Supporters: ${argalaOccupants.join(', ')||'none'} | Obstructors: ${obstructOccupants.join(', ')||'none'}`
  };
}
 
 
// ═══════════════════════════════════════════════════
// SCORING ENGINES
// ═══════════════════════════════════════════════════
 
// ── Weighted Planet Ranking ──
function getWeightedPlanetRanking(planets, yogas) {
  const ranked = [];
  for (const [name, p] of Object.entries(planets)) {
    if (name === 'Rahu' || name === 'Ketu') continue;
    let score = p.bala || 50;
    // Yoga boost
    yogas.forEach(y => {
      if (y.planet === name && y.type === 'good') score += 15;
      if (y.planet === name && y.type === 'bad' && !y.nullified) score -= 15;
    });
    // Retrograde adds strength
    if (p.retrograde) score += 5;
    // Combust heavily penalizes
    if (p.combust) score -= 25;
    ranked.push({ name, score, house: p.house, status: p.status,
      retrograde: p.retrograde, combust: p.combust, bala: p.bala });
  }
  ranked.sort((a,b) => b.score - a.score);
  return {
    strongest: ranked.slice(0, 3).map(p => `${p.name} (score ${p.score}, H${p.house}, ${p.status})`),
    weakest:   ranked.slice(-3).map(p => `${p.name} (score ${p.score}, H${p.house}, ${p.status}${p.combust?' COMBUST':''})`),
    all: ranked
  };
}
 
// ── Contradiction Detector ──
function detectContradictions(planets, yogas) {
  const contradictions = [];
  for (const [name, p] of Object.entries(planets)) {
    const positives = yogas.filter(y => y.planet === name && y.type === 'good');
    const negatives = yogas.filter(y => y.planet === name && (y.type === 'bad' || y.type === 'warn') && !y.nullified);
    if (positives.length > 0 && negatives.length > 0) {
      contradictions.push({
        planet: name,
        positive: positives.map(y => y.name).join(', '),
        negative: negatives.map(y => y.name).join(', '),
        resolution: `${name} is both elevated (${positives.map(y=>y.name).join(', ')}) and afflicted (${negatives.map(y=>y.name).join(', ')}) — this creates potential that is partially blocked or delayed. The strength exists but manifests inconsistently.`
      });
    }
    // Combust but strong sign
    if (p.combust && (p.status.includes('Exalted') || p.status.includes('Own'))) {
      contradictions.push({
        planet: name,
        positive: `${name} ${p.status}`,
        negative: `${name} combust`,
        resolution: `${name} is dignified but combust — the potential is present but suppressed near the Sun. Results come but with ego conflict or delayed recognition.`
      });
    }
  }
  return contradictions;
}
 
// ── Shock Fact Guardrail (min 3 indicators) ──
function getVerifiedShockFacts(psychProfile, planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const verified = [];
 
  // Abandonment wound — need Moon affliction + one more
  const moonH = H('Moon');
  const moonAffBysat = (planets.Saturn?.aspects||[]).includes(moonH);
  const moonAffByKetu = Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0)) < 10;
  const moonInDust = [8,12].includes(moonH);
  const l4 = RASI_LORD[(lagnaIdx+3)%12];
  const l4Afflicted = [6,8,12].includes(planets[l4]?.house);
  const abandonCount = [moonAffBysat,moonAffByKetu,moonInDust,l4Afflicted].filter(Boolean).length;
  if (abandonCount >= 2) verified.push({
    type: 'abandonment',
    confidence: abandonCount >= 3 ? 'HIGH' : 'MODERATE',
    statement: `There is a deep-seated pattern of emotional withdrawal and feeling unsupported — not imagined, but wired into the chart through Moon placement in H${moonH}${moonAffBysat?', Saturn aspect on it':''}.`,
    count: abandonCount
  });
 
  // Father wound
  const sunH = H('Sun');
  const sunInDust = [6,8,12].includes(sunH);
  const sunDebil = planets.Sun?.status.includes('Debilitated');
  const satAspectsSun = (planets.Saturn?.aspects||[]).includes(sunH);
  const rahuNearSun = Math.abs((planets.Rahu?.sid||0)-(planets.Sun?.sid||0)) < 10;
  const fatherCount = [sunInDust,sunDebil,satAspectsSun,rahuNearSun].filter(Boolean).length;
  if (fatherCount >= 2) verified.push({
    type: 'father_wound',
    confidence: fatherCount >= 3 ? 'HIGH' : 'MODERATE',
    statement: `The relationship with father or authority figures has been complicated — either distant, controlling, or absent in key moments. Sun in H${sunH}${sunDebil?' debilitated':''}${satAspectsSun?', aspected by Saturn':''} confirms this pattern.`,
    count: fatherCount
  });
 
  // Obsessive love
  const venusH = H('Venus');
  const rahuNearVenus = Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0)) < 10;
  const marsAspectsVenus = (planets.Mars?.aspects||[]).includes(venusH);
  const venusIn812 = [8,12].includes(venusH);
  const obsessCount = [rahuNearVenus,marsAspectsVenus,venusIn812].filter(Boolean).length;
  if (obsessCount >= 2) verified.push({
    type: 'obsessive_love',
    confidence: 'HIGH',
    statement: `Love and attraction run intense and sometimes obsessive in this chart — ${rahuNearVenus?'Rahu conjunct Venus amplifies desire beyond comfort':''}${marsAspectsVenus?', Mars aspects Venus adding passion and possessiveness':''}. This person loves deeply but struggles with attachment.`,
    count: obsessCount
  });
 
  // Self-sabotage
  const ketuH = H('Ketu');
  const lagnaLord = RASI_LORD[lagnaIdx];
  const lagnaLordInDust = [6,8,12].includes(planets[lagnaLord]?.house);
  const ketuInSuccess = [1,5,9,10].includes(ketuH);
  const satAspectsLagna = (planets.Saturn?.aspects||[]).includes(1);
  const sabotageCount = [lagnaLordInDust,ketuInSuccess,satAspectsLagna].filter(Boolean).length;
  if (sabotageCount >= 2) verified.push({
    type: 'self_sabotage',
    confidence: sabotageCount >= 3 ? 'HIGH' : 'MODERATE',
    statement: `There is a pattern of stepping back from success just before it arrives — Ketu in H${ketuH}${lagnaLordInDust?`, lagna lord in H${planets[lagnaLord]?.house} (dusthana)`:''}. This is karmic and requires conscious awareness to override.`,
    count: sabotageCount
  });
 
  return verified;
}
 
// ── Marriage Stability Scores ──
function getMarriageScores(planets, lagnaIdx, yogas, venusAffliction, divorceIndicators, navamsaMarriage) {
  let emotional = 50, physical = 50, stability = 50, karmic = 50;
 
  const H = name => planets[name]?.house || 0;
  const l7 = RASI_LORD[(lagnaIdx+6)%12];
  const l7Status = planets[l7]?.status || '';
 
  // Emotional (Moon, Venus, 7th house atmosphere)
  if (planets.Moon?.status.includes('Exalted')||planets.Moon?.status.includes('Own')) emotional += 15;
  if ([6,8,12].includes(H('Moon'))) emotional -= 15;
  if ((planets.Saturn?.aspects||[]).includes(H('Moon'))) emotional -= 10;
  if (planets.Venus?.status.includes('Exalted')||planets.Venus?.status.includes('Own')) emotional += 15;
  emotional = Math.max(0, Math.min(100, emotional));
 
  // Physical (Venus, Mars, 8th house)
  physical -= (venusAffliction?.score || 0) * 0.3;
  if (H('Mars') === 7 && !yogas.some(y=>y.name.includes('Mangal')&&y.nullified)) physical -= 15;
  if (planets.Venus?.status.includes('Exalted')) physical += 20;
  physical = Math.max(0, Math.min(100, physical));
 
  // Stability (7th lord, Jupiter, Saturn in 7th own sign)
  if (l7Status.includes('Exalted')||l7Status.includes('Own')) stability += 20;
  if ([6,8,12].includes(H(l7))) stability -= 20;
  if (H('Jupiter')===7&&planets.Jupiter?.status.includes('Exalted')) stability += 20;
  stability -= (divorceIndicators?.count || 0) * 8;
  if (navamsaMarriage?.analysis?.some(a=>a.includes('strong'))) stability += 10;
  if (navamsaMarriage?.analysis?.some(a=>a.includes('difficult'))) stability -= 10;
  stability = Math.max(0, Math.min(100, stability));
 
  // Karmic (UL, Darakaraka, D9)
  if (navamsaMarriage?.d9Venus?.status.includes('Exalted')) karmic += 20;
  if (navamsaMarriage?.d9Venus?.status.includes('Debilitated')) karmic -= 20;
  if (yogas.some(y=>y.name.includes('Hamsa'))) karmic += 15;
  if (yogas.some(y=>y.name.includes('Love Marriage'))) karmic += 10;
  karmic = Math.max(0, Math.min(100, karmic));
 
  const overall = Math.round(emotional*0.3 + physical*0.2 + stability*0.3 + karmic*0.2);
  const delay = Math.max(0, Math.min(100,
    (divorceIndicators?.count||0)*10 +
    ([6,8,12].includes(H(l7)) ? 20 : 0) +
    (H('Saturn')===7 ? 15 : 0) +
    (planets[l7]?.retrograde ? 10 : 0)
  ));
  const conflict = Math.max(0, Math.min(100,
    (venusAffliction?.score||0)*0.5 +
    (H('Mars')===7 ? 20 : 0) +
    ((planets.Saturn?.aspects||[]).includes(7) ? 15 : 0)
  ));
 
  return {
    emotional: Math.round(emotional),
    physical:  Math.round(physical),
    stability: Math.round(stability),
    karmic:    Math.round(karmic),
    overall, delay: Math.round(delay), conflict: Math.round(conflict),
    summary: `Marriage Stability ${overall}/100 | Emotional ${Math.round(emotional)}% | Physical ${Math.round(physical)}% | Stability ${Math.round(stability)}% | Karmic ${Math.round(karmic)}% | Delay risk ${Math.round(delay)}% | Conflict risk ${Math.round(conflict)}%`
  };
}
 
module.exports.getWeightedPlanetRanking = getWeightedPlanetRanking;
module.exports.detectContradictions = detectContradictions;
module.exports.getVerifiedShockFacts = getVerifiedShockFacts;
module.exports.getMarriageScores = getMarriageScores;
 
module.exports.getTransitTriggers = getTransitTriggers;
module.exports.getRefinedMarriageTrigger = getRefinedMarriageTrigger;
module.exports.getHealthEngine = getHealthEngine;
module.exports.getWealthTimingEngine = getWealthTimingEngine;
module.exports.getPropertyEngine = getPropertyEngine;
module.exports.getArgala = getArgala;
