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

  // Kaal Sarpa — CORRECT: all 7 planets must be within 180° arc from Rahu to Ketu (going forward in zodiac)
  const rahuSid = planets.Rahu?.sid || 0, ketuSid = planets.Ketu?.sid || 0;
  const allSids = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].map(n=>planets[n]?.sid||0);
  // Arc from Rahu → Ketu going FORWARD (Rahu always retrograde, so arc is Rahu→ zodiac forward → Ketu)
  // A planet is "between" Rahu and Ketu if going from Rahu forward you reach it before Ketu
  function isBetweenRahuKetu(sid, rahuSid, ketuSid) {
    // Normalize all to 0-360
    const r = norm360(rahuSid), k = norm360(ketuSid), s = norm360(sid);
    // Arc from r to k going forward
    if (r <= k) return s >= r && s <= k;
    else return s >= r || s <= k; // wraps around 0
  }
  const allBetween = allSids.every(s => isBetweenRahuKetu(s, rahuSid, ketuSid));
  const allOutside = allSids.every(s => !isBetweenRahuKetu(s, rahuSid, ketuSid));
  if (allBetween || allOutside) {
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
        desc:`${name} retrograde — internalized energy, results come through revisiting and reworking themes; not simply stronger or weaker, depends on sign dignity and house context`});
  }

  // Love marriage yoga — 5th and 7th lords connected
  const l5 = RASI_LORD[(lagnaIdx+4)%12], l7 = RASI_LORD[(lagnaIdx+6)%12];
  const l5H = H(l5), l7H = H(l7);
  if (l5H===7||l7H===5||l5H===l7H||(Math.abs((planets[l5]?.sid||0)-(planets[l7]?.sid||0))<10))
    yogas.push({name:'Love Marriage Indicators',type:'good',
      desc:`5th lord (${l5}) and 7th lord (${l7}) connected — love marriage strongly indicated`});

  // Delayed marriage indicators
  const satInH7 = H('Saturn')===7, rahuInH7 = H('Rahu')===7, ketuInH7 = H('Ketu')===7;
  const l7InDust = DUSTHANA.includes(H(l7));
  if (satInH7||rahuInH7||ketuInH7||l7InDust)
    yogas.push({name:'Marriage Delay Indicators (placement effects, not dosha)',type:'warn',
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

  // Full weighted scores + triple confirmation
  const weightedScores = getFullWeightedScores(planets, lagnaIdx, allYogas, navamsa, upapadaLordAnalysis, divorceIndicators);
  const tripleConfirmation = getTripleConfirmation(planets, lagnaIdx,
    {...dasha, dashaEventTriggers}, transits, allYogas, weightedScores);

  // Scoring engines
  const planetRanking = getWeightedPlanetRanking(planets, allYogas);
  const contradictions = detectContradictions(planets, allYogas);
  const verifiedShockFacts = getVerifiedShockFacts({}, planets, lagnaIdx, allYogas);
  const marriageScores = getMarriageScores(planets, lagnaIdx, allYogas, venusAffliction, divorceIndicators, navamsaMarriage);

  // Batch 5 — Precision layer
  const age = Math.floor((Date.now()-new Date(dob))/(365.25*24*3600*1000));
  const planetMaturity = getPlanetMaturityStatus(planets, dob);
  const functionalNature = getFunctionalNature(lagnaIdx);
  const lifeStage = getLifeStageContext(age);
  const relationshipKarma = getRelationshipKarmaScore(planets, lagnaIdx, karakas, upapadaLagna, navamsa);
  const manifestationResistance = getManifestationResistance(planets, lagnaIdx, allYogas);
  const bhriguBindu = getBhriguBindu(planets);
  const unfinishedKarma = getUnfinishedKarma(planets, karakas);
  const probabilityMatrix = getProbabilityMatrix({dasha,refinedMarriage}, weightedScores, tripleConfirmation);

  // Batch 6 — Precision Layer 2
  const vargottama = detectVargottama(planets);
  const pushkaraNavamsa = detectPushkaraNavamsa(planets);
  const planetDominance = getPlanetDominance(planets, lagnaIdx, allYogas, dasha);
  const dashaQuality = getDashaQualityScore(dasha, planets, lagnaIdx, allYogas);
  const birthTimeConfidence = getBirthTimeConfidence(lagna, planets.Moon);
  const recoveryIndicators = getRecoveryIndicators(planets, lagnaIdx, allYogas);
  const transitHeatmap = getTransitHeatmap(lagnaIdx, planets.Moon.rasiIdx);
  const dusthanaTransformations = getDusthanaTransformations(planets, lagnaIdx, allYogas);

  // Batch 7 — Certainty & Precision
  const rectificationWarning = getRectificationWarning(lagna, planets);

  // Batch 8 — Deep Analysis Engines
  const houseStory = buildHouseStoryEngine(planets, lagnaIdx, allYogas);
  const dispositorChain = getDispositorChain(planets, lagnaIdx);
  const planetClusters = getPlanetClusters(planets, lagnaIdx);
  const elementBalance = getElementBalance(planets);
  const modalityEngine = getModalityEngine(planets);
  const alVsLagna = getALvsLagna(planets, lagnaIdx, arudhaLagna);
  const breakpointYears = getBreakpointYears(planets, lagnaIdx, dasha, dob);
  const wealthStyle = getWealthStyle(planets, lagnaIdx, allYogas);
  const relationshipWounds = getRelationshipWounds(planets, lagnaIdx, allYogas);
  const powerEngine = getPowerEngine(planets, lagnaIdx, allYogas);
  const fearEngine = getFearEngine(planets, lagnaIdx, allYogas);
  const nakshatraDeep = getNakshatraDeepAnalysis(planets, nakshatra);
  const peakPowerYears = getPeakPowerYears(planets, lagnaIdx, dasha, dob);
  const marriageTriggerStack = getMarriageTriggerStack(planets, lagnaIdx, {...dasha, dashaEventTriggers}, transitTriggers, karakas, upapadaLagna, navamsa, weightedScores);
  const venusAfflictionDetailed = getAfflictionSeverityDetailed('Venus', planets, lagnaIdx, allYogas);
  const saturnAfflictionDetailed = getAfflictionSeverityDetailed('Saturn', planets, lagnaIdx, allYogas);
  const marriageProtector = getDomainProtector(planets, lagnaIdx, allYogas, 'marriage');
  const careerProtector = getDomainProtector(planets, lagnaIdx, allYogas, 'career');
  const wealthProtector = getDomainProtector(planets, lagnaIdx, allYogas, 'wealth');
  const karmaClassification = getKarmaClassification(planets, lagnaIdx, allYogas, karakas);

  // Batch 12 — Esoteric + D60 Forensic
  const esotericEngines = getEsotericEngines(planets, lagnaIdx, karakas, allYogas, dasha, nakshatra);
  const d60Forensic = getD60ForensicEngines(planets, lagnaIdx, karakas, nakshatra, allYogas);

  // Batch 11 — Divine Architecture + Cosmic Memory (171-230)
  const divineArch = getDivineArchitectureEngines(planets, lagnaIdx, karakas, allYogas, dasha);
  const cosmicMem = getCosmicMemoryEngines(planets, lagnaIdx, karakas);
  const cosmicDest = getCosmicDestinyEngines(planets, lagnaIdx, karakas, allYogas, dasha);
  const forbiddenRishi = getForbiddenRishiEngines(planets, lagnaIdx, karakas, allYogas);
  const plOrigin = getPastLifeOriginEngines(planets, lagnaIdx, karakas);
  const soulAgeExp = getSoulAgeExpansionEngines(planets, lagnaIdx, karakas);
  const plEvents = getPastLifeEventEngines(planets, lagnaIdx, karakas);
  const soulTravel = getSoulTravelEngines(planets, lagnaIdx, karakas, nakshatra);
  const deepMemory = getDeepMemoryEngines(planets, lagnaIdx, karakas);
  const finalSynth230 = getFinalSynthesisEngines225to230(planets, lagnaIdx, karakas, allYogas);

  // Batch 10 — Deep Karma Engines
  const kulaDevata = getKulaDevataEngine(planets, lagnaIdx, karakas);
  const finalSentence = getFinalUnfinishedSentence(planets, lagnaIdx, karakas);
  const soulExhaustion = getSoulExhaustionIndex(planets, lagnaIdx);
  const vakShakti = getVakShaktiEngine(planets, lagnaIdx, karakas);
  const sacredSound = getSacredSoundKey(nakshatra, karakas, lagnaIdx);
  const drishtiShakti = getDrishtiShaktiEngine(planets, lagnaIdx);
  const swapnaEngine = getSwapnaEngine(planets, lagnaIdx);
  const guruArrival = getGuruArrivalEngine(planets, lagnaIdx, dasha);
  const hiddenEnemy = getHiddenEnemyEngine(planets, lagnaIdx);
  const sacredFear = getSacredFearEngine(planets, lagnaIdx);
  const divineProtection = getDivineProtectionEngine(planets, lagnaIdx, allYogas);
  const preBirthChoice = getPreBirthChoiceEngine(planets, lagnaIdx, nakshatra, karakas);
  const breakingEvent = getBreakingEventEngine(planets, lagnaIdx, dasha);
  const deathPurpose = getDeathPurposeEngine(planets, lagnaIdx, karakas);
  const shaktiAwakening = getShaktiAwakeningEngine(planets, lagnaIdx, allYogas);
  const shadowInheritance = getShadowInheritance(planets, lagnaIdx);
  const personToForgive = getPersonToForgiveEngine(planets, lagnaIdx, karakas);
  const lifeAlmostLived = getLifeAlmostLived(planets, lagnaIdx, allYogas, dasha);
  const timeOfDayKarma = getTimeOfDayKarma(tob, lagna);

  // Batch 9 — Domain engines
  const parentKarma = getParentKarmaEngine(planets, lagnaIdx, dasha, allYogas);
  const businessVsJob = getBusinessVsJobEngine(planets, lagnaIdx, dasha, allYogas);
  const lossEngine = getLossEngine(planets, lagnaIdx, dasha);
  const reputationEngine = getReputationEngine(planets, lagnaIdx, dasha, allYogas, karakas);
  const inLawKarma = getInLawKarmaEngine(planets, lagnaIdx, upapadaLagna, navamsa);
  const siblingKarma = getSiblingKarmaEngine(planets, lagnaIdx, dasha);
  const debtLitigation = getDebtLitigationEngine(planets, lagnaIdx, dasha);
  const repeatedKarma = getRepeatedKarmaDetection(planets, lagnaIdx, navamsa, d10, d7);

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
    weightedScores, tripleConfirmation,
    planetMaturity, functionalNature, lifeStage,
    relationshipKarma, manifestationResistance, bhriguBindu, unfinishedKarma,
    vargottama, pushkaraNavamsa, planetDominance, dashaQuality,
    birthTimeConfidence, recoveryIndicators, transitHeatmap, dusthanaTransformations,
    rectificationWarning, marriageTriggerStack,
    houseStory, dispositorChain, planetClusters, elementBalance, modalityEngine,
    parentKarma, businessVsJob, lossEngine, reputationEngine, inLawKarma,
    siblingKarma, debtLitigation, repeatedKarma,
    alVsLagna, breakpointYears, wealthStyle, relationshipWounds,
    kulaDevata, finalSentence, soulExhaustion, vakShakti, sacredSound,
    esotericEngines, d60Forensic,
    divineArch, cosmicMem, cosmicDest, forbiddenRishi, plOrigin,
    soulAgeExp, plEvents, soulTravel, deepMemory, finalSynth230,
    drishtiShakti, swapnaEngine, guruArrival, hiddenEnemy, sacredFear,
    divineProtection, preBirthChoice, breakingEvent, deathPurpose,
    shaktiAwakening, shadowInheritance, personToForgive, lifeAlmostLived, timeOfDayKarma,
    powerEngine, fearEngine, nakshatraDeep, peakPowerYears,
    venusAfflictionDetailed, saturnAfflictionDetailed,
    marriageProtector, careerProtector, wealthProtector, karmaClassification,
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
    // Benefic aspect cancellation
    if ((planets.Jupiter?.aspects||[]).includes(moonH)) kemNull.push('Jupiter aspects Moon — Kemdrum cancelled');
    if ((planets.Venus?.aspects||[]).includes(moonH)) kemNull.push('Venus aspects Moon — Kemdrum cancelled');
    // Sun or Mercury in adjacent houses
    const sunAdj = [planets.Sun?.house].some(h => [adjH1, adjH2, moonH].includes(h));
    if (sunAdj) kemNull.push('Sun in adjacent house — Kemdrum cancelled');
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
    analysis.push(`Darakaraka ${darakaraka} in D9 H${d9Dara.house} (${d9Dara.status}) — spouse core nature revealed`);

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

// ═══════════════════════════════════════════════════
// WEIGHTED SCORING ENGINE — BATCH 4
// ═══════════════════════════════════════════════════

// ── Weighted indicator system ──
// Each factor has a weight. Final score = sum of weights.
// Prediction only made if minimum threshold met.

const WEIGHTS = {
  // Marriage factors
  marriage: {
    l7_in_kendra:       { weight: 8,  desc: '7th lord in Kendra — strong marriage promise' },
    l7_in_trikona:      { weight: 7,  desc: '7th lord in Trikona — auspicious marriage' },
    l7_in_dusthana:     { weight: -8, desc: '7th lord in dusthana — marriage obstacles' },
    l7_exalted:         { weight: 9,  desc: '7th lord exalted — excellent spouse' },
    l7_debilitated:     { weight: -9, desc: '7th lord debilitated — difficult spouse karma' },
    jupiter_in_7:       { weight: 9,  desc: 'Jupiter in H7 — Hamsa yoga, blessed marriage' },
    venus_exalted:      { weight: 8,  desc: 'Venus exalted — strong love and beauty' },
    venus_debilitated:  { weight: -8, desc: 'Venus debilitated — weak romantic karma' },
    venus_combust:      { weight: -7, desc: 'Venus combust — suppressed love' },
    venus_rahu:         { weight: -6, desc: 'Rahu-Venus — obsessive/unstable relationships' },
    saturn_in_7:        { weight: -5, desc: 'Saturn in H7 — delay but eventual stability' },
    mars_in_7_active:   { weight: -7, desc: 'Mars in H7 active — Mangal Dosha' },
    rahu_in_7:          { weight: -6, desc: 'Rahu in H7 — unconventional marriage' },
    ul_strong:          { weight: 7,  desc: 'Upapada lord strong — good marriage quality' },
    ul_afflicted:       { weight: -7, desc: 'Upapada lord afflicted — troubled marriage' },
    d9_venus_strong:    { weight: 8,  desc: 'D9 Venus strong — marriage karma positive' },
    d9_venus_weak:      { weight: -8, desc: 'D9 Venus weak — marriage karma difficult' },
    d9_7lord_strong:    { weight: 7,  desc: 'D9 7th lord strong — stable marriage destiny' },
    d9_7lord_weak:      { weight: -7, desc: 'D9 7th lord weak — marriage challenges' },
    love_yoga:          { weight: 6,  desc: 'Love marriage yoga — romantic meeting indicated' },
    gajakesari:         { weight: 5,  desc: 'Gajakesari yoga — wisdom and grace in marriage' },
  },
  // Career factors
  career: {
    l10_in_kendra:      { weight: 9,  desc: '10th lord in Kendra — strong career' },
    l10_exalted:        { weight: 9,  desc: '10th lord exalted — peak career achievement' },
    l10_debilitated:    { weight: -8, desc: '10th lord debilitated — career struggles' },
    sun_strong:         { weight: 7,  desc: 'Strong Sun — authority and leadership' },
    saturn_strong:      { weight: 7,  desc: 'Strong Saturn — discipline and longevity in career' },
    mercury_exalted:    { weight: 8,  desc: 'Mercury exalted — communication, intellect excel' },
    jupiter_in_10:      { weight: 8,  desc: 'Jupiter in H10 — respected profession' },
    ruchaka:            { weight: 9,  desc: 'Ruchaka yoga — leadership, competitive excellence' },
    dharma_karma:       { weight: 8,  desc: 'Dharma-Karma yoga — aligned career' },
    l10_in_dusthana:    { weight: -7, desc: '10th lord in dusthana — career blockages' },
    saturn_in_10:       { weight: 6,  desc: 'Saturn in H10 — slow but solid rise' },
  },
  // Wealth factors
  wealth: {
    jupiter_exalted:    { weight: 9,  desc: 'Jupiter exalted — abundant prosperity' },
    jupiter_in_2_11:    { weight: 8,  desc: 'Jupiter in wealth house — natural financial grace' },
    l2_l11_exchange:    { weight: 8,  desc: '2nd-11th lord exchange — Dhana Yoga' },
    venus_strong:       { weight: 7,  desc: 'Strong Venus — material comfort, luxury' },
    lakshmi_yoga:       { weight: 9,  desc: 'Lakshmi Yoga — exceptional wealth indicated' },
    l2_debilitated:     { weight: -7, desc: '2nd lord weak — wealth accumulation difficult' },
    ketu_in_11:         { weight: -4, desc: 'Ketu in H11 — irregular gains, sudden losses' },
  },
  // Health factors
  health: {
    lagna_lord_strong:  { weight: 7,  desc: 'Lagna lord strong — robust constitution' },
    mars_in_1:          { weight: 6,  desc: 'Mars in H1 — strong physical energy' },
    saturn_h6_h8:       { weight: -7, desc: 'Saturn in H6/H8 — chronic conditions' },
    mars_h6_h8:         { weight: -6, desc: 'Mars in H6/H8 — injury, acute illness' },
    rahu_h1_h6_h8:      { weight: -6, desc: 'Rahu in health houses — unusual ailments' },
    moon_h8_h12:        { weight: -5, desc: 'Moon in H8/H12 — mental/emotional stress' },
    h6_empty:           { weight: 4,  desc: 'H6 empty — less chronic illness tendency' },
  }
};

function computeWeightedScore(factors, weightTable) {
  let total = 0;
  const applied = [];
  for (const [key, active] of Object.entries(factors)) {
    if (active && weightTable[key]) {
      total += weightTable[key].weight;
      applied.push({ key, ...weightTable[key] });
    }
  }
  // Normalize to 0-100
  const maxPossible = Object.values(weightTable).reduce((s,w)=>s+(w.weight>0?w.weight:0),0);
  const minPossible = Object.values(weightTable).reduce((s,w)=>s+(w.weight<0?w.weight:0),0);
  const normalized = Math.round(((total - minPossible) / (maxPossible - minPossible)) * 100);
  return { raw: total, normalized: Math.max(0,Math.min(100,normalized)), applied };
}

function getFullWeightedScores(planets, lagnaIdx, yogas, navamsa, upapadaLordAnalysis, divorceIndicators) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const l7  = RASI_LORD[(lagnaIdx+6)%12];
  const l10 = RASI_LORD[(lagnaIdx+9)%12];
  const l2  = RASI_LORD[(lagnaIdx+1)%12];
  const l11 = RASI_LORD[(lagnaIdx+10)%12];

  // Marriage factors
  const mangalActive = yogas.some(y=>y.name.includes('Mangal Dosha — ACTIVE'));
  const d9VenusStatus = navamsa?.planets?.Venus?.status || '';
  const d97Sign = (navamsa?.lagna?.rasiIdx+6)%12;
  const d97Lord = RASI_LORD[d97Sign];
  const d97LordStatus = navamsa?.planets?.[d97Lord]?.status || '';

  const marriageFactors = {
    l7_in_kendra:      [1,4,7,10].includes(H(l7)),
    l7_in_trikona:     [1,5,9].includes(H(l7)),
    l7_in_dusthana:    [6,8,12].includes(H(l7)),
    l7_exalted:        ST(l7).includes('Exalted'),
    l7_debilitated:    ST(l7).includes('Debilitated'),
    jupiter_in_7:      H('Jupiter')===7,
    venus_exalted:     ST('Venus').includes('Exalted'),
    venus_debilitated: ST('Venus').includes('Debilitated'),
    venus_combust:     planets.Venus?.combust,
    venus_rahu:        Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10,
    saturn_in_7:       H('Saturn')===7,
    mars_in_7_active:  mangalActive && H('Mars')===7,
    rahu_in_7:         H('Rahu')===7,
    ul_strong:         upapadaLordAnalysis?.quality?.includes('Strong'),
    ul_afflicted:      upapadaLordAnalysis?.quality?.includes('Afflicted'),
    d9_venus_strong:   d9VenusStatus.includes('Exalted')||d9VenusStatus.includes('Own'),
    d9_venus_weak:     d9VenusStatus.includes('Debilitated')||d9VenusStatus.includes('Enemy'),
    d9_7lord_strong:   d97LordStatus.includes('Exalted')||d97LordStatus.includes('Own'),
    d9_7lord_weak:     d97LordStatus.includes('Debilitated')||[6,8,12].includes(navamsa?.planets?.[d97Lord]?.house),
    love_yoga:         yogas.some(y=>y.name.includes('Love Marriage')),
    gajakesari:        yogas.some(y=>y.name.includes('Gajakesari')),
  };

  // Career factors
  const careerFactors = {
    l10_in_kendra:     [1,4,7,10].includes(H(l10)),
    l10_exalted:       ST(l10).includes('Exalted'),
    l10_debilitated:   ST(l10).includes('Debilitated'),
    sun_strong:        ST('Sun').includes('Exalted')||ST('Sun').includes('Own')||ST('Sun').includes('Mooltrikona'),
    saturn_strong:     ST('Saturn').includes('Exalted')||ST('Saturn').includes('Own'),
    mercury_exalted:   ST('Mercury').includes('Exalted'),
    jupiter_in_10:     H('Jupiter')===10,
    ruchaka:           yogas.some(y=>y.name.includes('Ruchaka')),
    dharma_karma:      yogas.some(y=>y.name.includes('Dharma-Karma')),
    l10_in_dusthana:   [6,8,12].includes(H(l10)),
    saturn_in_10:      H('Saturn')===10,
  };

  // Wealth factors
  const wealthFactors = {
    jupiter_exalted:   ST('Jupiter').includes('Exalted'),
    jupiter_in_2_11:   [2,11].includes(H('Jupiter')),
    l2_l11_exchange:   H(l2)===11||H(l11)===2,
    venus_strong:      ST('Venus').includes('Exalted')||ST('Venus').includes('Own'),
    lakshmi_yoga:      yogas.some(y=>y.name.includes('Lakshmi')),
    l2_debilitated:    ST(l2).includes('Debilitated'),
    ketu_in_11:        H('Ketu')===11,
  };

  // Health factors
  const healthFactors = {
    lagna_lord_strong: ST(RASI_LORD[lagnaIdx]).includes('Exalted')||ST(RASI_LORD[lagnaIdx]).includes('Own'),
    mars_in_1:         H('Mars')===1,
    saturn_h6_h8:      [6,8].includes(H('Saturn')),
    mars_h6_h8:        [6,8].includes(H('Mars')),
    rahu_h1_h6_h8:     [1,6,8].includes(H('Rahu')),
    moon_h8_h12:       [8,12].includes(H('Moon')),
    h6_empty:          Object.values(planets).every(p=>p.house!==6),
  };

  const marriage = computeWeightedScore(marriageFactors, WEIGHTS.marriage);
  const career   = computeWeightedScore(careerFactors,  WEIGHTS.career);
  const wealth   = computeWeightedScore(wealthFactors,  WEIGHTS.wealth);
  const health   = computeWeightedScore(healthFactors,  WEIGHTS.health);

  // D1 vs D9 weighted marriage (D1=40%, D9=40%, UL/A7=20%)
  const d1MarriageBase = marriage.normalized;
  const d9Score = (marriageFactors.d9_venus_strong?80:marriageFactors.d9_venus_weak?20:50)*0.4 +
                  (marriageFactors.d9_7lord_strong?80:marriageFactors.d9_7lord_weak?20:50)*0.6;
  const ulScore = (marriageFactors.ul_strong?80:marriageFactors.ul_afflicted?20:50);
  const marriageBlended = Math.round(d1MarriageBase*0.4 + d9Score*0.4 + ulScore*0.2);

  return {
    marriage: { ...marriage, blended: marriageBlended,
      summary: `Marriage (blended D1+D9+UL): ${marriageBlended}/100 | D1: ${d1MarriageBase}% | D9: ${Math.round(d9Score)}% | UL: ${ulScore}%` },
    career:  { ...career,  summary: `Career: ${career.normalized}/100` },
    wealth:  { ...wealth,  summary: `Wealth: ${wealth.normalized}/100` },
    health:  { ...health,  summary: `Health resilience: ${health.normalized}/100` },
    topPositive: [...marriage.applied,...career.applied,...wealth.applied]
      .filter(f=>f.weight>=7).slice(0,5).map(f=>f.desc),
    topNegative: [...marriage.applied,...career.applied,...health.applied]
      .filter(f=>f.weight<=-6).slice(0,5).map(f=>f.desc),
  };
}

// ── Triple confirmation for major predictions ──
function getTripleConfirmation(planets, lagnaIdx, dasha, transits, yogas, weightedScores) {
  const H = name => planets[name]?.house || 0;
  const l7 = RASI_LORD[(lagnaIdx+6)%12];
  const confirmations = {};

  // Marriage confirmation (need 3 of: Dasha active, Transit active, House activated, Score high)
  const marriageDashaActive = (dasha.dashaEventTriggers?.marriage?.length > 0);
  const marriageTransitActive = (transits?.marriage?.length > 0);
  const marriageHouseActive = H(dasha.current?.lord)===7 || H(dasha.currentAntar?.lord)===7 ||
    (planets[dasha.current?.lord]?.aspects||[]).includes(7);
  const marriageScoreHigh = (weightedScores?.marriage?.blended||0) >= 55;
  const marriageCount = [marriageDashaActive, marriageTransitActive, marriageHouseActive, marriageScoreHigh].filter(Boolean).length;
  confirmations.marriage = {
    count: marriageCount,
    confirmed: marriageCount >= 3,
    level: marriageCount >= 4 ? 'VERY HIGH' : marriageCount >= 3 ? 'HIGH' : marriageCount >= 2 ? 'MODERATE' : 'LOW',
    factors: [
      marriageDashaActive ? 'Dasha active' : '',
      marriageTransitActive ? 'Transit active' : '',
      marriageHouseActive ? 'H7 activated' : '',
      marriageScoreHigh ? `Score ${weightedScores?.marriage?.blended}/100` : '',
    ].filter(Boolean)
  };

  // Career confirmation
  const careerDashaActive = (dasha.dashaEventTriggers?.career?.length > 0);
  const careerTransitActive = (transits?.career?.length > 0);
  const careerHouseActive = H(dasha.current?.lord)===10 || H(dasha.currentAntar?.lord)===10 ||
    (planets[dasha.current?.lord]?.aspects||[]).includes(10);
  const careerScoreHigh = (weightedScores?.career?.normalized||0) >= 55;
  const careerCount = [careerDashaActive, careerTransitActive, careerHouseActive, careerScoreHigh].filter(Boolean).length;
  confirmations.career = {
    count: careerCount,
    confirmed: careerCount >= 3,
    level: careerCount >= 4 ? 'VERY HIGH' : careerCount >= 3 ? 'HIGH' : careerCount >= 2 ? 'MODERATE' : 'LOW',
    factors: [careerDashaActive?'Dasha':'',careerTransitActive?'Transit':'',careerHouseActive?'H10 active':'',careerScoreHigh?'Score high':''].filter(Boolean)
  };

  // Wealth confirmation
  const wealthDashaActive = (dasha.dashaEventTriggers?.wealth?.length > 0);
  const wealthTransitActive = (transits?.wealth?.length > 0);
  const wealthHouseActive = [2,11].includes(H(dasha.currentAntar?.lord)) ||
    (planets[dasha.currentAntar?.lord]?.aspects||[]).some(h=>[2,11].includes(h));
  const wealthScoreHigh = (weightedScores?.wealth?.normalized||0) >= 55;
  const wealthCount = [wealthDashaActive, wealthTransitActive, wealthHouseActive, wealthScoreHigh].filter(Boolean).length;
  confirmations.wealth = {
    count: wealthCount,
    confirmed: wealthCount >= 2,
    level: wealthCount >= 3 ? 'HIGH' : wealthCount >= 2 ? 'MODERATE' : 'LOW',
    factors: [wealthDashaActive?'Dasha':'',wealthTransitActive?'Transit':'',wealthHouseActive?'House':'',wealthScoreHigh?'Score high':''].filter(Boolean)
  };

  return {
    confirmations,
    summary: Object.entries(confirmations)
      .map(([k,v])=>`${k.toUpperCase()}: ${v.level} (${v.count}/4 confirmations: ${v.factors.join(', ')})`)
      .join(' | ')
  };
}

module.exports.getFullWeightedScores = getFullWeightedScores;
module.exports.getTripleConfirmation = getTripleConfirmation;

// ═══════════════════════════════════════════════════
// COMPREHENSIVE MATCH SCORING ENGINE
// ═══════════════════════════════════════════════════

const RASI_ELEMENT = {
  Mesha:'Fire',Simha:'Fire',Dhanu:'Fire',
  Rishabha:'Earth',Kanya:'Earth',Makara:'Earth',
  Mithuna:'Air',Tula:'Air',Kumbha:'Air',
  Kataka:'Water',Vrischika:'Water',Meena:'Water'
};
const RASI_MODALITY = {
  Mesha:'Movable',Kataka:'Movable',Tula:'Movable',Makara:'Movable',
  Rishabha:'Fixed',Simha:'Fixed',Vrischika:'Fixed',Kumbha:'Fixed',
  Mithuna:'Dual',Kanya:'Dual',Dhanu:'Dual',Meena:'Dual'
};

// Element compatibility matrix
function getElementCompat(e1, e2) {
  if (e1===e2) return { score:90, desc:`Same element (${e1}) — natural harmony and understanding` };
  const compat = {
    'Fire-Air':85, 'Air-Fire':85,
    'Earth-Water':80, 'Water-Earth':80,
    'Fire-Earth':60, 'Earth-Fire':60,
    'Air-Water':60, 'Water-Air':60,
    'Fire-Water':40, 'Water-Fire':40,
    'Earth-Air':50, 'Air-Earth':50,
  };
  const key = `${e1}-${e2}`;
  const sc = compat[key]||55;
  return { score:sc, desc:`${e1}+${e2} elements — ${sc>=75?'compatible':sc>=60?'workable':'challenging'}` };
}

// Planet friendship for lord compatibility
function arePlanetFriends(p1, p2) {
  return PLANET_FRIENDS[p1]?.includes(p2) || PLANET_FRIENDS[p2]?.includes(p1);
}
function arePlanetEnemies(p1, p2) {
  return PLANET_ENEMIES[p1]?.includes(p2) || PLANET_ENEMIES[p2]?.includes(p1);
}

// Cross-chart aspect check
function crossAspects(p1Sid, p2House, p2Sid, p1Name) {
  const orb = 10; // degrees
  const diff = Math.abs(p1Sid - p2Sid);
  const normDiff = Math.min(diff, 360-diff);
  // Check conjunction, opposition, trine, square
  if (normDiff < orb)   return { type:'conjunction', strength: Math.round((orb-normDiff)/orb*100) };
  if (Math.abs(normDiff-180) < orb) return { type:'opposition', strength: Math.round((orb-Math.abs(normDiff-180))/orb*100) };
  if (Math.abs(normDiff-120) < orb) return { type:'trine', strength: Math.round((orb-Math.abs(normDiff-120))/orb*100) };
  if (Math.abs(normDiff-90)  < orb) return { type:'square', strength: Math.round((orb-Math.abs(normDiff-90))/orb*100) };
  return null;
}

function computeMatchScore(chart1, chart2, matchResult) {
  const p1 = chart1.planets, p2 = chart2.planets;
  const l1 = chart1.lagna, l2 = chart2.lagna;
  const scores = {};

  // ── LAYER 1: CORE COMPATIBILITY (30%) ──

  // 1a. Lagna element compatibility (15%)
  const e1 = RASI_ELEMENT[l1.rasi]||'Air', e2 = RASI_ELEMENT[l2.rasi]||'Air';
  const elemComp = getElementCompat(e1, e2);
  scores.lagnaCompat = { score: elemComp.score, weight:0.15, desc: elemComp.desc };

  // 1b. Moon sign relationship (15%)
  const moon1Rasi = chart1.rasi.index, moon2Rasi = chart2.rasi.index;
  const moonDist = ((moon2Rasi - moon1Rasi + 12)%12)+1;
  const moonScore = [1,5,9].includes(moonDist)?90:[4,10].includes(moonDist)?80:[3,11].includes(moonDist)?70:
    moonDist===7?65:[2,12].includes(moonDist)||[6,8].includes(moonDist)?35:60;
  const moon1Lord = RASI_LORD[moon1Rasi], moon2Lord = RASI_LORD[moon2Rasi];
  const moonLordBonus = arePlanetFriends(moon1Lord,moon2Lord)?10:arePlanetEnemies(moon1Lord,moon2Lord)?-10:0;
  scores.moonCompat = {
    score: Math.min(100,moonScore+moonLordBonus), weight:0.15,
    desc:`Moon signs ${RASI_NAMES[moon1Rasi]}-${RASI_NAMES[moon2Rasi]} (${moonDist}th relation) — lords ${moon1Lord}/${moon2Lord} ${arePlanetFriends(moon1Lord,moon2Lord)?'friends':'neutral/enemies'}`
  };

  // ── LAYER 2: CHEMISTRY (20%) ──

  // 2a. Venus-Mars cross analysis (10%)
  const vm1 = crossAspects(p1.Venus?.sid||0, p2.Mars?.house||0, p2.Mars?.sid||0, 'Venus');
  const vm2 = crossAspects(p2.Venus?.sid||0, p1.Mars?.house||0, p1.Mars?.sid||0, 'Venus');
  let chemScore = 55;
  if (vm1?.type==='conjunction'||vm2?.type==='conjunction') chemScore=85;
  else if (vm1?.type==='trine'||vm2?.type==='trine') chemScore=80;
  else if (vm1?.type==='opposition'||vm2?.type==='opposition') chemScore=70;
  else if (vm1?.type==='square'||vm2?.type==='square') chemScore=45;
  scores.venusMarsChemistry = {
    score:chemScore, weight:0.10,
    desc:`Venus-Mars cross: ${vm1?`P1 Venus ${vm1.type} P2 Mars`:'no major aspect'}, ${vm2?`P2 Venus ${vm2.type} P1 Mars`:'no major aspect'} — ${chemScore>=75?'strong attraction':chemScore>=60?'moderate chemistry':'weak chemistry'}`
  };

  // 2b. Moon-Venus compatibility (10%)
  const mv1 = crossAspects(p1.Moon?.sid||0, p2.Venus?.house||0, p2.Venus?.sid||0, 'Moon');
  const mv2 = crossAspects(p2.Moon?.sid||0, p1.Venus?.house||0, p1.Venus?.sid||0, 'Moon');
  let mvScore = 55;
  if (mv1?.type==='conjunction'||mv2?.type==='conjunction') mvScore=85;
  else if (mv1?.type==='trine'||mv2?.type==='trine') mvScore=78;
  else if (mv1?.type==='opposition'||mv2?.type==='opposition') mvScore=65;
  scores.moonVenusSync = {
    score:mvScore, weight:0.10,
    desc:`Moon-Venus sync: ${mvScore>=75?'emotional-romantic harmony':mvScore>=60?'workable sync':'emotional disconnect possible'}`
  };

  // ── LAYER 3: MARRIAGE STABILITY (25%) ──

  // 3a. 7th house cross match (10%)
  const h7lord1 = RASI_LORD[(l1.rasiIdx+6)%12], h7lord2 = RASI_LORD[(l2.rasiIdx+6)%12];
  const h7lord1Status = p1[h7lord1]?.status||'', h7lord2Status = p2[h7lord2]?.status||'';
  const h7Score1 = h7lord1Status.includes('Exalted')?90:h7lord1Status.includes('Own')?80:
    h7lord1Status.includes('Debilitated')?30:[6,8,12].includes(p1[h7lord1]?.house)?40:60;
  const h7Score2 = h7lord2Status.includes('Exalted')?90:h7lord2Status.includes('Own')?80:
    h7lord2Status.includes('Debilitated')?30:[6,8,12].includes(p2[h7lord2]?.house)?40:60;
  const h7LordFriends = arePlanetFriends(h7lord1,h7lord2);
  const h7CrossScore = Math.round((h7Score1+h7Score2)/2) + (h7LordFriends?10:-5);
  scores.seventhHouse = {
    score:Math.min(100,h7CrossScore), weight:0.10,
    desc:`7th lords: P1 ${h7lord1} H${p1[h7lord1]?.house} (${h7lord1Status.split(' ')[0]}) + P2 ${h7lord2} H${p2[h7lord2]?.house} (${h7lord2Status.split(' ')[0]}) — lords ${h7LordFriends?'are friends':'not friends'}`
  };

  // 3b. Upapada compatibility (10%)
  const ul1 = chart1.upapadaLagna, ul2 = chart2.upapadaLagna;
  let ulScore = 60;
  if (ul1&&ul2) {
    const ulDist = ((ul2.rasiIdx-ul1.rasiIdx+12)%12)+1;
    ulScore = [1,5,9].includes(ulDist)?85:[4,10].includes(ulDist)?75:
      [6,8].includes(ulDist)||[2,12].includes(ulDist)?35:60;
  }
  const ul1Good = chart1.upapadaLordAnalysis?.quality?.includes('Strong');
  const ul2Good = chart2.upapadaLordAnalysis?.quality?.includes('Strong');
  if (ul1Good) ulScore+=8; if (ul2Good) ulScore+=8;
  if (chart1.upapadaLordAnalysis?.quality?.includes('Afflicted')) ulScore-=10;
  if (chart2.upapadaLordAnalysis?.quality?.includes('Afflicted')) ulScore-=10;
  scores.upapadaCompat = {
    score:Math.min(100,Math.max(0,ulScore)), weight:0.10,
    desc:`Upapada: P1 ${ul1?.rasi||'N/A'} (${chart1.upapadaLordAnalysis?.quality?.split('—')[0]||'?'}) vs P2 ${ul2?.rasi||'N/A'} (${chart2.upapadaLordAnalysis?.quality?.split('—')[0]||'?'})`
  };

  // 3c. A7 compatibility (5%)
  const a7_1 = chart1.a7, a7_2 = chart2.a7;
  let a7Score = 60;
  if (a7_1&&a7_2) {
    const a7Dist = ((a7_2.rasiIdx-a7_1.rasiIdx+12)%12)+1;
    a7Score = [1,5,9].includes(a7Dist)?80:[4,10].includes(a7Dist)?70:[6,8].includes(a7Dist)?35:60;
  }
  scores.a7Compat = {
    score:a7Score, weight:0.05,
    desc:`A7 (relationship image): P1 ${a7_1?.rasi||'?'} vs P2 ${a7_2?.rasi||'?'}`
  };

  // ── LAYER 4: KARMIC ALIGNMENT (15%) ──

  // 4a. Darakaraka cross-match (10%)
  const dk1 = chart1.karakas?.Darakaraka, dk2 = chart2.karakas?.Darakaraka;
  let dkScore = 60;
  if (dk1&&dk2&&p1[dk1]&&p2[dk2]) {
    const dkAspect = crossAspects(p1[dk1].sid, p2[dk2].house, p2[dk2].sid, dk1);
    const dkFriends = arePlanetFriends(dk1,dk2);
    if (dkAspect?.type==='conjunction') dkScore=90;
    else if (dkAspect?.type==='trine') dkScore=80;
    else if (dkAspect?.type==='opposition') dkScore=65;
    if (dkFriends) dkScore+=10; else if (arePlanetEnemies(dk1,dk2)) dkScore-=10;
  }
  scores.darakaraka = {
    score:Math.min(100,dkScore), weight:0.10,
    desc:`Darakaraka: P1 ${dk1||'?'} (H${p1[dk1]?.house||'?'}) vs P2 ${dk2||'?'} (H${p2[dk2]?.house||'?'}) — ${arePlanetFriends(dk1||'',dk2||'')?'friends, good karmic bond':arePlanetEnemies(dk1||'',dk2||'')?'enemies, karmic tension':'neutral'}`
  };

  // 4b. Atmakaraka compatibility (5%)
  const ak1 = chart1.karakas?.Atmakaraka, ak2 = chart2.karakas?.Atmakaraka;
  const akFriends = ak1&&ak2?arePlanetFriends(ak1,ak2):false;
  const akEnemies = ak1&&ak2?arePlanetEnemies(ak1,ak2):false;
  scores.atmakaraka = {
    score:akFriends?80:akEnemies?35:60, weight:0.05,
    desc:`Atmakaraka: P1 ${ak1||'?'} vs P2 ${ak2||'?'} — soul-level ${akFriends?'resonance':akEnemies?'friction':'neutral'}`
  };

  // ── LAYER 5: NAVAMSA (15%) ──

  // 5a. D9 Lagna compatibility (5%)
  const d9l1 = chart1.navamsa?.lagna?.rasiIdx||0, d9l2 = chart2.navamsa?.lagna?.rasiIdx||0;
  const d9LagnaDist = ((d9l2-d9l1+12)%12)+1;
  const d9LagnaScore = [1,5,9].includes(d9LagnaDist)?85:[4,10].includes(d9LagnaDist)?75:[6,8].includes(d9LagnaDist)?35:60;
  scores.d9Lagna = {
    score:d9LagnaScore, weight:0.05,
    desc:`D9 Lagna: P1 ${RASI_NAMES[d9l1]} vs P2 ${RASI_NAMES[d9l2]} (${d9LagnaDist}th relation)`
  };

  // 5b. D9 Venus comparison (10%)
  const d9v1 = chart1.navamsa?.planets?.Venus, d9v2 = chart2.navamsa?.planets?.Venus;
  const d9v1Score = d9v1?.status.includes('Exalted')?90:d9v1?.status.includes('Own')?80:d9v1?.status.includes('Debilitated')?20:55;
  const d9v2Score = d9v2?.status.includes('Exalted')?90:d9v2?.status.includes('Own')?80:d9v2?.status.includes('Debilitated')?20:55;
  const d9VenusScore = Math.round((d9v1Score+d9v2Score)/2);
  scores.d9Venus = {
    score:d9VenusScore, weight:0.10,
    desc:`D9 Venus: P1 ${d9v1?.rasi||'?'} H${d9v1?.house||'?'} (${d9v1?.status?.split(' ')[0]||'?'}) | P2 ${d9v2?.rasi||'?'} H${d9v2?.house||'?'} (${d9v2?.status?.split(' ')[0]||'?'})`
  };

  // ── LAYER 6: RISK DETECTION (10%) ──

  // Mangal cross-match
  const m1Active = chart1.yogas?.some(y=>y.name.includes('Mangal Dosha — ACTIVE'));
  const m2Active = chart2.yogas?.some(y=>y.name.includes('Mangal Dosha — ACTIVE'));
  const mangalOk = (m1Active&&m2Active)||(!m1Active&&!m2Active);
  const mangalRisk = m1Active!==m2Active ? 25 : 0;

  // Divorce indicator overlap
  const di1 = chart1.divorceIndicators?.count||0, di2 = chart2.divorceIndicators?.count||0;
  const divorceRisk = Math.min(100, (di1+di2)*10);

  // Venus affliction mismatch
  const va1 = chart1.venusAffliction?.score||0, va2 = chart2.venusAffliction?.score||0;
  const venusRisk = Math.round((va1+va2)/2);

  // Saturn-Mars cross clash
  const satMarsClash = (chart1.planets.Saturn?.aspects||[]).includes(chart2.planets.Mars?.house) ||
    (chart2.planets.Saturn?.aspects||[]).includes(chart1.planets.Mars?.house);

  const riskScore = Math.max(0, 100 - mangalRisk - divorceRisk*0.3 - venusRisk*0.2 - (satMarsClash?10:0));
  scores.riskFactors = {
    score:Math.round(riskScore), weight:0.10,
    desc:`Risk: Mangal ${mangalOk?'matched':'MISMATCH'} | Divorce indicators ${di1+di2} total | Venus affliction avg ${Math.round((va1+va2)/2)}/100 | Saturn-Mars clash: ${satMarsClash?'YES':'no'}`
  };

  // ── LAYER 7: TIMING ALIGNMENT (5%) ──
  const mw1 = chart1.refinedMarriage?.windows||[], mw2 = chart2.refinedMarriage?.windows||[];
  // Check overlap in marriage windows
  let timingOverlap = false;
  for (const w1 of mw1) {
    for (const w2 of mw2) {
      const s1=new Date(w1.dates?.split(' to ')[0]||'2030'), e1=new Date(w1.dates?.split(' to ')[1]||'2031');
      const s2=new Date(w2.dates?.split(' to ')[0]||'2032'), e2=new Date(w2.dates?.split(' to ')[1]||'2033');
      if (s1<=e2&&s2<=e1) { timingOverlap=true; break; }
    }
    if (timingOverlap) break;
  }
  scores.timingAlignment = {
    score:timingOverlap?85:50, weight:0.05,
    desc:`Marriage timing overlap: ${timingOverlap?'YES — windows align, good for joint marriage':'Windows may not align — timing needs careful planning'}`
  };

  // ── PORUTHAM INTEGRATION (included in overall) ──
  const porScore = matchResult?.pct||50;
  scores.porutham = {
    score:porScore, weight:0.05,
    desc:`10 Porutham: ${matchResult?.totalScore||0}/${matchResult?.maxScore||44} (${porScore}%) — ${matchResult?.verdict||''}`
  };

  // ── COMPUTE FINAL SCORES ──
  const weighted = Object.values(scores).reduce((sum,s) => sum + s.score*s.weight, 0);
  const overall = Math.round(weighted);

  // Domain scores
  const emotional = Math.round((scores.moonCompat.score*0.5 + scores.moonVenusSync.score*0.3 + scores.lagnaCompat.score*0.2));
  const physical  = Math.round((scores.venusMarsChemistry.score*0.6 + scores.moonVenusSync.score*0.4));
  const stability = Math.round((scores.seventhHouse.score*0.35 + scores.upapadaCompat.score*0.35 + scores.a7Compat.score*0.15 + scores.porutham.score*0.15));
  const karmic    = Math.round((scores.darakaraka.score*0.5 + scores.atmakaraka.score*0.25 + scores.d9Lagna.score*0.25));
  const conflict  = Math.round(100 - scores.riskFactors.score);
  const longterm  = Math.round((stability*0.4 + karmic*0.3 + scores.d9Venus.score*0.3));

  const verdict = overall>=80?'Excellent Match':overall>=70?'Very Good Match':overall>=60?'Good Match':
    overall>=50?'Acceptable Match':overall>=40?'Challenging Match':'Difficult Match';

  return {
    scores, overall, emotional, physical, stability, karmic, conflict, longterm,
    verdict,
    topStrengths: Object.entries(scores).filter(([,s])=>s.score>=75).map(([k,s])=>s.desc).slice(0,4),
    topConcerns:  Object.entries(scores).filter(([,s])=>s.score<45).map(([k,s])=>s.desc).slice(0,4),
    mangalOk, timingOverlap, satMarsClash,
    summary: `Overall: ${overall}/100 (${verdict}) | Emotional: ${emotional}% | Physical: ${physical}% | Stability: ${stability}% | Karmic: ${karmic}% | Conflict risk: ${conflict}% | Long-term: ${longterm}%`
  };
}

module.exports.computeMatchScore = computeMatchScore;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 5: PRECISION LAYER
// ═══════════════════════════════════════════════════

// ── 46. Planet Maturity Ages ──
const PLANET_MATURITY = { Sun:22, Moon:24, Mars:28, Mercury:32, Jupiter:16, Venus:25, Saturn:36, Rahu:42, Ketu:48 };

function getPlanetMaturityStatus(planets, dob) {
  const ageNow = Math.floor((Date.now() - new Date(dob)) / (365.25*24*3600*1000));
  const status = {};
  for (const [name, age] of Object.entries(PLANET_MATURITY)) {
    const matured = ageNow >= age;
    status[name] = {
      maturityAge: age,
      matured,
      yearsToMaturity: matured ? 0 : age - ageNow,
      interpretation: matured
        ? `${name} matured at ${age} — now gives full stable results`
        : `${name} matures at ${age} (in ${age-ageNow} years) — currently unstable/learning phase`
    };
  }
  return {
    status,
    summary: Object.entries(status)
      .filter(([,s]) => !s.matured)
      .map(([n,s]) => `${n} matures at ${s.maturityAge} (${s.yearsToMaturity} years)`)
      .join(' | ') || 'All major planets matured',
    matureNow: Object.entries(status).filter(([,s])=>s.matured).map(([n])=>n),
    immatureNow: Object.entries(status).filter(([,s])=>!s.matured).map(([n])=>n),
  };
}

// ── 30. Functional Benefic/Malefic Engine ──
// Based on Lagna — each planet has a functional role
function getFunctionalNature(lagnaIdx) {
  // Yogakaraka = lord of both Kendra and Trikona
  const KENDRA_LORDS  = [1,4,7,10].map(h => RASI_LORD[(lagnaIdx+h-1)%12]);
  const TRIKONA_LORDS = [1,5,9].map(h  => RASI_LORD[(lagnaIdx+h-1)%12]);
  const DUSTHANA_LORDS= [6,8,12].map(h => RASI_LORD[(lagnaIdx+h-1)%12]);
  const MARAKA_LORDS  = [2,7].map(h    => RASI_LORD[(lagnaIdx+h-1)%12]);

  const nature = {};
  for (const planet of ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']) {
    const isKendra  = KENDRA_LORDS.includes(planet);
    const isTrikona = TRIKONA_LORDS.includes(planet);
    const isDusthana= DUSTHANA_LORDS.includes(planet);
    const isMaraka  = MARAKA_LORDS.includes(planet);
    const isYogakaraka = isKendra && isTrikona;

    let role = 'neutral';
    if (isYogakaraka) role = 'yogakaraka (most benefic)';
    else if (isTrikona && !isDusthana) role = 'functional benefic (trikona lord)';
    else if (isKendra && !isDusthana) role = 'functional benefic (kendra lord)';
    else if (isDusthana && !isKendra && !isTrikona) role = 'functional malefic (dusthana lord)';
    else if (isMaraka) role = 'maraka (2nd/7th lord)';

    nature[planet] = { isKendra, isTrikona, isDusthana, isMaraka, isYogakaraka, role };
  }
  return nature;
}

// ── 40. Age Filter / Life Stage Realism ──
function getLifeStageContext(age) {
  if (age < 18) return {
    stage: 'Teen',
    validPredictions: ['education','personality','family'],
    invalidPredictions: ['marriage','career peak','children','wealth'],
    note: 'No marriage, career peak, or children predictions appropriate at this age.'
  };
  if (age < 24) return {
    stage: 'Early Adult',
    validPredictions: ['education','early career','personality','family dynamics'],
    invalidPredictions: ['children before 24 unless early marriage shown','career peak'],
    note: 'No children timing predictions unless very early marriage is strongly indicated.'
  };
  if (age < 35) return {
    stage: 'Young Adult',
    validPredictions: ['career','marriage','children','wealth building','property'],
    invalidPredictions: [],
    note: 'Saturn matures at 36 — career authority builds toward that age.'
  };
  if (age < 45) return {
    stage: 'Maturity',
    validPredictions: ['career peak','family maturity','wealth accumulation','health monitoring','property'],
    invalidPredictions: [],
    note: 'Rahu karmic peak period. Major life decisions crystallize.'
  };
  if (age < 55) return {
    stage: 'Mid-Life',
    validPredictions: ['career authority','legacy building','health','grandchildren','spiritual turning'],
    invalidPredictions: ['new career starts','first marriage'],
    note: 'Ketu wisdom phase begins at 48. Spiritual dimension strengthens.'
  };
  return {
    stage: 'Senior',
    validPredictions: ['health','spiritual life','grandchildren','legacy','longevity'],
    invalidPredictions: ['career peaks','first marriage','new children'],
    note: 'Focus on longevity, wisdom, and family legacy.'
  };
}

// ── 44. Severity Control / Affliction Scoring ──
function getAfflictionSeverity(score) {
  if (score <= 30) return { level: 'mild', desc: 'mild tendency, easily managed' };
  if (score <= 60) return { level: 'moderate', desc: 'moderate — noticeable but manageable with awareness' };
  if (score <= 80) return { level: 'strong', desc: 'strong — likely to manifest, needs conscious effort' };
  return { level: 'severe', desc: 'severe — significant life impact, remedies strongly advised' };
}

// ── 46/47. Nakshatra Pada Psychology (deeper) ──
const PADA_NAVAMSA = [
  'Mesha','Rishabha','Mithuna','Kataka',  // Padas 1-4 of Nak 1
];
function getNakshatraPadaDetails(nakIdx, pada) {
  // Navamsa sign of a nakshatra pada
  const startNavamsa = (nakIdx * 4) % 12;
  const padaNavamsaIdx = (startNavamsa + pada - 1) % 12;
  const VARNA = { Mesha:'Kshatriya',Rishabha:'Vaishya',Mithuna:'Shudra',Kataka:'Brahmin',
    Simha:'Kshatriya',Kanya:'Vaishya',Tula:'Shudra',Vrischika:'Brahmin',
    Dhanu:'Kshatriya',Makara:'Vaishya',Kumbha:'Shudra',Meena:'Brahmin' };
  const navamsaSign = RASI_NAMES[padaNavamsaIdx];
  return {
    pada, navamsaSign,
    navamsaLord: RASI_LORD[padaNavamsaIdx],
    varna: VARNA[navamsaSign] || 'mixed',
    element: RASI_ELEMENT?.[navamsaSign] || 'mixed',
  };
}

// ── 54. Event Trigger Score ──
function getEventTriggerScore(dashaActive, transitActive, navamsaSupport, ashtakavargaScore) {
  // Dasha=40%, Transit=30%, Navamsa=15%, Ashtakavarga=15%
  const score = (dashaActive?40:0) + (transitActive?30:0) + (navamsaSupport?15:0) + (ashtakavargaScore>=4?15:ashtakavargaScore>=3?10:0);
  return {
    score,
    likely: score >= 70,
    possible: score >= 40,
    confidence: score>=70?'HIGH':score>=55?'MEDIUM':'LOW',
    breakdown: `Dasha:${dashaActive?40:0} Transit:${transitActive?30:0} Navamsa:${navamsaSupport?15:0} Ashtakavarga:${ashtakavargaScore>=4?15:ashtakavargaScore>=3?10:0}`
  };
}

// ── 56. Relationship Karma Score ──
function getRelationshipKarmaScore(planets, lagnaIdx, karakas, upapadaLagna, navamsa) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  let score = 50;
  const factors = [];

  const dk = karakas?.Darakaraka;
  const ul = upapadaLagna;
  const l7 = RASI_LORD[(lagnaIdx+6)%12];

  // DK strength
  if (dk && ST(dk).includes('Exalted')) { score+=15; factors.push(`DK ${dk} exalted`); }
  if (dk && ST(dk).includes('Debilitated')) { score-=15; factors.push(`DK ${dk} debilitated`); }
  // UL quality
  if (ul && ul.rasiIdx !== undefined) {
    const ulLord = RASI_LORD[ul.rasiIdx];
    if (ST(ulLord).includes('Exalted')||ST(ulLord).includes('Own')) { score+=10; factors.push(`UL lord ${ulLord} strong`); }
    if ([6,8,12].includes(planets[ulLord]?.house)) { score-=10; factors.push(`UL lord in dusthana`); }
  }
  // A7 strong
  const a7Lord = RASI_LORD[(lagnaIdx+6)%12];
  if (ST(a7Lord).includes('Exalted')) { score+=8; factors.push('A7 lord strong'); }
  // Venus quality
  const venSt = ST('Venus');
  if (venSt.includes('Exalted')||venSt.includes('Own')) { score+=12; factors.push('Venus dignified'); }
  if (venSt.includes('Debilitated')) { score-=12; factors.push('Venus debilitated'); }
  if (planets.Venus?.combust) { score-=10; factors.push('Venus combust'); }
  // D9 7th
  const d9v = navamsa?.planets?.Venus;
  if (d9v?.status.includes('Exalted')||d9v?.status.includes('Own')) { score+=10; factors.push('D9 Venus strong'); }
  if (d9v?.status.includes('Debilitated')) { score-=10; factors.push('D9 Venus weak'); }
  // Rahu-Venus — obsessive element
  const rahuVenus = Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0)) < 10;
  if (rahuVenus) { factors.push('Rahu-Venus: obsessive love element present'); }

  score = Math.max(0, Math.min(100, score));
  const level = score>=75?'Strong karmic bond — relationship feels destined':
    score>=55?'Moderate karmic bond — relationship takes effort to deepen':
    score>=35?'Weak karmic bond — relationship may feel karmic debt rather than gift':
    'Heavy karmic relationship — significant past-life patterns to resolve';

  return { score, level, factors,
    summary: `Relationship Karma: ${score}/100 — ${level} | Factors: ${factors.join(', ')}` };
}

// ── 65. Manifestation Resistance Score ──
function getManifestationResistance(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  let score = 0;
  const factors = [];

  // Saturn strong aspects
  if (planets.Saturn?.bala >= 70) { score+=15; factors.push('Saturn dominant — delays gratification'); }
  // Retrograde planets
  const retrogrades = Object.entries(planets).filter(([n,p])=>p.retrograde&&!['Rahu','Ketu','Sun','Moon'].includes(n));
  if (retrogrades.length >= 2) { score+=10; factors.push(`${retrogrades.length} retrograde planets — internalized energy`); }
  // H12 dominant
  const h12Count = Object.values(planets).filter(p=>p.house===12).length;
  if (h12Count >= 2) { score+=10; factors.push(`${h12Count} planets in H12 — withdrawal tendency`); }
  // Ketu in success houses
  if ([1,5,9,10].includes(H('Ketu'))) { score+=10; factors.push(`Ketu in H${H('Ketu')} — spiritual detachment from material success`); }
  // Multiple malefics in dusthana
  const dusthanaMalefics = ['Saturn','Mars','Rahu','Ketu'].filter(n=>[6,8,12].includes(H(n)));
  if (dusthanaMalefics.length >= 2) { score+=10; factors.push(`Malefics in dusthana: ${dusthanaMalefics.join(',')}`); }
  // Neecha planets without Bhanga
  const neechaActive = yogas.filter(y=>y.name.includes('ACTIVE')&&y.name.includes('Neecham'));
  if (neechaActive.length >= 1) { score+=15; factors.push(`${neechaActive.length} active debilitation(s) — results blocked`); }

  score = Math.min(100, score);
  const level = score>=70?'HIGH resistance — good yogas may manifest late or partially':
    score>=40?'MODERATE resistance — some delay expected, consistent effort needed':
    'LOW resistance — chart manifests relatively smoothly';

  return { score, level, factors,
    summary: `Manifestation Resistance: ${score}/100 (${level}) | ${factors.join(' | ')}` };
}

// ── 74. Probability Matrix for Major Events ──
function getProbabilityMatrix(chart, weightedScores, tripleConfirmation) {
  const ms = weightedScores?.marriage;
  const cs = weightedScores?.career;
  const ws = weightedScores?.wealth;
  const d  = chart.dasha;
  const mw = chart.refinedMarriage?.windows || [];

  const marriageProb = ms?.blended >= 70 ? 'HIGH (80-100%)' : ms?.blended >= 55 ? 'LIKELY (60-79%)' : ms?.blended >= 40 ? 'POSSIBLE (40-59%)' : 'LOWER (20-39%)';
  const careerProb   = cs?.normalized >= 65 ? 'HIGH' : cs?.normalized >= 50 ? 'LIKELY' : 'MODERATE';
  const wealthProb   = ws?.normalized >= 65 ? 'HIGH' : ws?.normalized >= 50 ? 'LIKELY' : 'MODERATE';

  return {
    marriage: {
      bestCase: mw[0] ? `Engagement/meeting in ${mw[0].period} (${mw[0].dates})` : 'Next favorable Dasha',
      mostLikely: mw[1] ? `Marriage in ${mw[1].period} (${mw[1].dates})` : mw[0] ? `Marriage in ${mw[0].period}` : 'Requires Dasha alignment',
      worstCase: `Delayed — possible until age 35+ if current patterns persist`,
      probability: marriageProb
    },
    career: {
      bestCase: `Breakthrough in current ${d.current?.lord} Dasha`,
      mostLikely: `Career advancement in next 3-5 years`,
      probability: careerProb
    },
    wealth: {
      bestCase: `Significant gains in next wealth window`,
      mostLikely: `Steady accumulation, peak in Saturn/Jupiter periods`,
      probability: wealthProb
    },
    summary: `Marriage: ${marriageProb} | Career: ${careerProb} | Wealth: ${wealthProb}`
  };
}

// ── Bhrigu Bindu (Moon-Rahu midpoint) ──
function getBhriguBindu(planets) {
  const moonSid = planets.Moon?.sid || 0;
  const rahuSid = planets.Rahu?.sid || 0;
  let midpoint = (moonSid + rahuSid) / 2;
  // If they are more than 180° apart, add 180 to the midpoint
  if (Math.abs(moonSid - rahuSid) > 180) midpoint = norm360(midpoint + 180);
  const bbRasiIdx = Math.floor(midpoint / 30);
  const bbHouse = ((bbRasiIdx - (planets.Sun?.rasiIdx||0) + 12) % 12) + 1;
  return {
    longitude: midpoint.toFixed(2),
    rasi: RASI_NAMES[bbRasiIdx],
    rasiIdx: bbRasiIdx,
    summary: `Bhrigu Bindu at ${midpoint.toFixed(1)}° (${RASI_NAMES[bbRasiIdx]}) — transiting planets over this point trigger major life events`
  };
}

// ── Unfinished Karma Detector ──
function getUnfinishedKarma(planets, karakas) {
  const H = name => planets[name]?.house || 0;
  const flags = [];
  const dk = karakas?.Darakaraka;
  const ak = karakas?.Atmakaraka;

  if (dk && planets[dk]?.retrograde) flags.push(`Darakaraka ${dk} retrograde — unfinished lover/spouse karma from past life`);
  if (ak && planets[ak]?.retrograde) flags.push(`Atmakaraka ${ak} retrograde — soul still working on its core lesson`);
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10) flags.push('Rahu-Venus: obsessive unfulfilled desire pattern from past life');
  if (H('Ketu')===5) flags.push('Ketu in H5: unfinished creative/romantic karma — may repeat patterns from past life');
  if (H('Saturn')===7) flags.push('Saturn in H7: serious karmic debt in partnerships — must be worked through with patience');
  if (H('Ketu')===7) flags.push('Ketu in H7: past life spouse/partner karma — relationships feel familiar but incomplete');

  return {
    flags,
    count: flags.length,
    summary: flags.length ? `Unfinished karma detected (${flags.length}): ${flags.join(' | ')}` : 'No major unfinished karma signatures'
  };
}

module.exports.getPlanetMaturityStatus = getPlanetMaturityStatus;
module.exports.getFunctionalNature = getFunctionalNature;
module.exports.getLifeStageContext = getLifeStageContext;
module.exports.getAfflictionSeverity = getAfflictionSeverity;
module.exports.getNakshatraPadaDetails = getNakshatraPadaDetails;
module.exports.getEventTriggerScore = getEventTriggerScore;
module.exports.getRelationshipKarmaScore = getRelationshipKarmaScore;
module.exports.getManifestationResistance = getManifestationResistance;
module.exports.getProbabilityMatrix = getProbabilityMatrix;
module.exports.getBhriguBindu = getBhriguBindu;
module.exports.getUnfinishedKarma = getUnfinishedKarma;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 6: PRECISION LAYER 2
// ═══════════════════════════════════════════════════

// ── 81. Orb-weighted aspect strength ──
function getAspectStrength(planet1Sid, planet2Sid) {
  const diff = Math.abs(planet1Sid - planet2Sid);
  const normDiff = Math.min(diff, 360 - diff);
  // Check each aspect type with orb
  const aspects = [
    { type: 'conjunction', angle: 0,   orb: 10 },
    { type: 'opposition',  angle: 180, orb: 10 },
    { type: 'trine',       angle: 120, orb: 8  },
    { type: 'square',      angle: 90,  orb: 8  },
    { type: 'sextile',     angle: 60,  orb: 6  },
  ];
  for (const asp of aspects) {
    const deviation = Math.abs(normDiff - asp.angle);
    if (deviation <= asp.orb) {
      const strength = deviation <= 3 ? 'FULL' : deviation <= 6 ? 'STRONG' : 'MEDIUM';
      const score = deviation <= 3 ? 100 : deviation <= 6 ? 75 : 50;
      return { type: asp.type, deviation: parseFloat(deviation.toFixed(2)), strength, score,
        desc: `${asp.type} (${deviation.toFixed(1)}° orb — ${strength} power)` };
    }
  }
  return null;
}

// ── 83. Vargottama Detection ──
// Planet in same sign in D1 and D9 = massively strong
function detectVargottama(planets) {
  const vargottama = [];
  for (const [name, p] of Object.entries(planets)) {
    if (p.rasiIdx === p.navamsaRasiIdx) {
      vargottama.push({
        planet: name,
        rasi: p.rasi,
        desc: `${name} Vargottama in ${p.rasi} — same sign in D1 and D9 — exceptional strength, results come fully`
      });
    }
  }
  return vargottama;
}

// ── 84. Pushkara Navamsa ──
// Certain navamsa positions are highly auspicious
const PUSHKARA_NAVAMSA = {
  Mesha: [1, 9],      // Pada 1 (Mesha navamsa) and pada 9 (Dhanu navamsa)
  Rishabha: [4, 12],
  Mithuna: [3, 11],
  Kataka: [6, 8],
  Simha: [5, 7],
  Kanya: [2, 10],
  Tula: [3, 9],
  Vrischika: [4, 8],
  Dhanu: [1, 7],
  Makara: [6, 12],
  Kumbha: [5, 11],
  Meena: [2, 10],
};
function detectPushkaraNavamsa(planets) {
  const pushkara = [];
  for (const [name, p] of Object.entries(planets)) {
    if (name === 'Rahu' || name === 'Ketu') continue;
    const padas = PUSHKARA_NAVAMSA[p.rasi];
    if (padas && padas.includes(p.pada)) {
      pushkara.push({
        planet: name, rasi: p.rasi, pada: p.pada,
        desc: `${name} in Pushkara Navamsa (${p.rasi} Pada ${p.pada}) — special grace, results better than expected, afflictions softened`
      });
    }
  }
  return pushkara;
}

// ── 82. Planet Dominance Score (priority weighting) ──
function getPlanetDominance(planets, lagnaIdx, yogas, dasha) {
  const H = name => planets[name]?.house || 0;
  const vargottama = detectVargottama(planets);
  const pushkara = detectPushkaraNavamsa(planets);

  const dominance = [];
  for (const [name, p] of Object.entries(planets)) {
    if (name === 'Rahu' || name === 'Ketu') continue;
    let score = p.bala || 50;

    // Vargottama bonus (+20)
    if (vargottama.some(v => v.planet === name)) score += 20;
    // Pushkara bonus (+10)
    if (pushkara.some(v => v.planet === name)) score += 10;
    // Yoga involvement
    yogas.forEach(y => {
      if (y.planet === name && y.type === 'good' && !y.nullified) score += 12;
      if (y.planet === name && y.type === 'bad' && !y.nullified) score -= 12;
    });
    // Current dasha relevance
    if (dasha.current?.lord === name) score += 15;
    if (dasha.currentAntar?.lord === name) score += 10;
    // Avastha
    if (p.avastha?.includes('Yuva')) score += 8;
    if (p.avastha?.includes('Mrita')) score -= 15;
    if (p.avastha?.includes('Bala')) score -= 5;
    // Retrograde adds internalized strength
    if (p.retrograde) score += 5;
    // Combust removes much of the power
    if (p.combust) score -= 20;

    dominance.push({ name, score: Math.max(0, Math.min(150, Math.round(score))),
      house: p.house, status: p.status, bala: p.bala,
      isVargottama: vargottama.some(v=>v.planet===name),
      isPushkara: pushkara.some(v=>v.planet===name),
      isDashaLord: dasha.current?.lord===name,
      isAntarLord: dasha.currentAntar?.lord===name,
    });
  }
  dominance.sort((a,b) => b.score - a.score);
  return {
    ranked: dominance,
    dominant: dominance.slice(0,3).map(p=>`${p.name}(${p.score}pts,H${p.house},${p.status.split(' ')[0]}${p.isVargottama?',VARG':''}${p.isDashaLord?',DASHA':''})`),
    suppressed: dominance.slice(-3).map(p=>`${p.name}(${p.score}pts,H${p.house}${p.combust?',COMBUST':''})`),
    summary: `Dominant: ${dominance.slice(0,3).map(p=>p.name).join('>')} | Suppressed: ${dominance.slice(-3).map(p=>p.name).join(',')}`
  };
}

// ── 89. Dasha Quality Score ──
function getDashaQualityScore(dasha, planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const current = dasha.current;
  const antar   = dasha.currentAntar;
  if (!current) return null;

  const lord = current.lord;
  const antarLord = antar?.lord;
  const lordH = H(lord);
  const lordStatus = planets[lord]?.status || '';

  let opportunity = 50, stress = 50, growth = 50, loss = 50, relationship = 50;

  // Opportunity: Dasha lord in good house / strong
  if ([1,4,7,9,10,11].includes(lordH)) opportunity += 20;
  if ([6,8,12].includes(lordH)) opportunity -= 20;
  if (lordStatus.includes('Exalted') || lordStatus.includes('Own')) opportunity += 15;
  if (lordStatus.includes('Debilitated')) opportunity -= 15;
  opportunity = Math.max(0, Math.min(100, opportunity));

  // Stress: malefic dashas, dusthana lords
  if (['Saturn','Mars','Rahu','Ketu'].includes(lord) && [6,8,12].includes(lordH)) stress += 20;
  if (['Saturn','Mars'].includes(lord) && lordStatus.includes('Enemy')) stress += 15;
  if ([1,4,7,10].includes(lordH) && (lordStatus.includes('Exalted')||lordStatus.includes('Own'))) stress -= 15;
  stress = Math.max(0, Math.min(100, stress));

  // Growth: benefic dashas
  if (['Jupiter','Venus','Moon','Mercury'].includes(lord) && [1,4,5,7,9,10,11].includes(lordH)) growth += 20;
  if (yogas.some(y=>y.planet===lord&&y.type==='good')) growth += 15;
  growth = Math.max(0, Math.min(100, growth));

  // Loss: dusthana placement, malefics
  if ([6,8,12].includes(lordH)) loss += 15;
  if (planets[lord]?.combust) loss += 10;
  if (planets[lord]?.retrograde) loss -= 5; // retrograde can delay loss
  loss = Math.max(0, Math.min(100, loss));

  // Relationship: Venus/Moon/7th house involvement
  if (['Venus','Moon'].includes(lord) || lordH===7 || lordH===2 || lordH===11) relationship += 20;
  if (['Saturn','Mars'].includes(lord) && [7,8,12].includes(lordH)) relationship -= 15;
  relationship = Math.max(0, Math.min(100, relationship));

  const overall = Math.round((opportunity + growth + (100-stress) + (100-loss) + relationship) / 5);

  return {
    opportunity: Math.round(opportunity),
    stress: Math.round(stress),
    growth: Math.round(growth),
    loss: Math.round(loss),
    relationship: Math.round(relationship),
    overall,
    quality: overall >= 70 ? 'FAVORABLE' : overall >= 50 ? 'MIXED' : 'CHALLENGING',
    summary: `${lord} Mahadasha quality: ${overall}/100 (${overall>=70?'FAVORABLE':overall>=50?'MIXED':'CHALLENGING'}) | Opportunity:${Math.round(opportunity)}% Growth:${Math.round(growth)}% Stress:${Math.round(stress)}% Relationship:${Math.round(relationship)}%`
  };
}

// ── 92. Birth Time Confidence Score ──
function getBirthTimeConfidence(lagna, moonData) {
  const lagnaDegs = lagna.degInRasi;
  const moonDegs = moonData?.degInRasi || 15;
  const risks = [];

  // Lagna near sign boundary (within 2°)
  if (lagnaDegs < 2 || lagnaDegs > 28) {
    risks.push(`Lagna at ${lagnaDegs.toFixed(1)}° — near sign boundary. 15-minute birth time error could change Lagna sign.`);
  }
  // Moon near nakshatra boundary (affects Dasha calculation)
  const nakDeg = moonData?.sid % (360/27);
  const nakSize = 360/27; // 13.33°
  if (nakDeg < 0.5 || nakDeg > (nakSize - 0.5)) {
    risks.push(`Moon near Nakshatra boundary — Dasha starting period may be off if birth time inaccurate.`);
  }

  const level = risks.length >= 2 ? 'HIGH' : risks.length === 1 ? 'MODERATE' : 'LOW';
  return {
    level, risks,
    lagnaAtDeg: lagnaDegs.toFixed(1),
    summary: risks.length
      ? `Birth time accuracy: ${level} RISK — ${risks.join(' | ')}`
      : `Birth time confidence: GOOD — Lagna at ${lagnaDegs.toFixed(1)}° and Moon well within Nakshatra boundaries`
  };
}

// ── 95. Recovery Engine ──
function getRecoveryIndicators(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const recovery = [];

  // Jupiter as healer
  const jupH = H('Jupiter');
  const jupSt = planets.Jupiter?.status || '';
  if ([1,4,5,7,9,10].includes(jupH)) recovery.push(`Jupiter in H${jupH} (${jupSt.split(' ')[0]}) — protection, expansion, optimism; recovers from setbacks faster`);
  if (jupSt.includes('Exalted')) recovery.push('Jupiter exalted — exceptional grace and recovery power throughout life');

  // Moon in good position
  const moonH = H('Moon');
  if (planets.Moon?.status.includes('Exalted') || planets.Moon?.status.includes('Own'))
    recovery.push(`Moon in ${planets.Moon?.rasi} (${planets.Moon?.status.split(' ')[0]}) — emotional resilience, strong support from family/mother`);
  if ([1,4,5].includes(moonH)) recovery.push(`Moon in H${moonH} — emotional stability, ability to heal and move forward`);

  // 9th house strength (dharma/luck)
  const l9 = RASI_LORD[(lagnaIdx+8)%12];
  const l9St = planets[l9]?.status || '';
  if (l9St.includes('Exalted')||l9St.includes('Own')) recovery.push(`9th lord ${l9} strong — divine grace, luck returns after difficult periods`);

  // Vipareeta Raja Yoga = rises from destruction
  if (yogas.some(y=>y.name.includes('Vipareeta')))
    recovery.push('Vipareeta Raja Yoga present — this chart is built to rise after collapse. Difficulties actually strengthen this person.');

  // 12th house benefic = spiritual recovery
  const h12Benefics = Object.entries(planets).filter(([n,p])=>p.house===12 && ['Jupiter','Venus','Moon'].includes(n));
  if (h12Benefics.length > 0) recovery.push(`${h12Benefics.map(([n])=>n).join(',')} in H12 — hidden spiritual support, recovers through retreat and introspection`);

  return {
    indicators: recovery,
    strength: recovery.length >= 3 ? 'STRONG' : recovery.length >= 2 ? 'MODERATE' : 'LIMITED',
    summary: recovery.length
      ? `Recovery strength: ${recovery.length >= 3 ? 'STRONG' : 'MODERATE'} | ${recovery.join(' | ')}`
      : 'Limited recovery indicators — requires active remedies and effort to bounce back'
  };
}

// ── 90. Transit Heatmap (next 6 months scored) ──
function getTransitHeatmap(lagnaIdx, moonRasiIdx) {
  const now = new Date();
  const jdNow = 2451545.0 + (now - new Date('2000-01-01T12:00:00Z')) / (1000*86400);
  const ayan = getLahiriAyanamsha(jdNow);
  const T = (jdNow - 2451545.0) / 36525;

  const months = [];
  for (let m = 0; m < 6; m++) {
    const futureT = T + (m * 30.44 / 365.25);
    const futureJd = jdNow + m * 30.44;

    const Mjup = norm360(20.9 + 3034.906 * futureT);
    const jupTrop = norm360(34.3515 + 3034.9057*futureT + 5.5549*Math.sin(toRad(Mjup)) - 14.3312);
    const jupH = ((Math.floor(sid(jupTrop,ayan)/30) - lagnaIdx + 12)%12)+1;
    const jupFromMoon = ((Math.floor(sid(jupTrop,ayan)/30) - moonRasiIdx + 12)%12)+1;

    const Msat = norm360(317.0207 + 1222.1138*futureT);
    const satTrop = norm360(50.0775 + 1222.1138*futureT + 6.3585*Math.sin(toRad(Msat)) - 92.8553);
    const satH = ((Math.floor(sid(satTrop,ayan)/30) - lagnaIdx + 12)%12)+1;
    const satFromMoon = ((Math.floor(sid(satTrop,ayan)/30) - moonRasiIdx + 12)%12)+1;

    // Score this month
    let score = 50;
    if ([1,2,4,5,7,9,10,11].includes(jupFromMoon)) score += 15;
    if ([3,6,11].includes(satFromMoon)) score += 10;
    if ([6,8,12].includes(jupH)) score -= 10;
    if ([4,8].includes(satFromMoon)) score -= 15;
    if ([1,2].includes(satFromMoon)) score -= 10; // Sade Sati
    score = Math.max(0, Math.min(100, Math.round(score)));

    const d = new Date(now);
    d.setMonth(d.getMonth() + m);
    const monthName = d.toLocaleDateString('en-IN',{month:'short',year:'numeric'});
    months.push({ month: monthName, score,
      quality: score >= 70 ? 'FAVORABLE' : score >= 50 ? 'MIXED' : 'CHALLENGING',
      jupH, satH, jupFromMoon, satFromMoon
    });
  }

  const best = months.reduce((a,b) => a.score > b.score ? a : b);
  const worst = months.reduce((a,b) => a.score < b.score ? a : b);
  return {
    months,
    best: `${best.month} (${best.score}/100)`,
    worst: `${worst.month} (${worst.score}/100)`,
    summary: months.map(m=>`${m.month}:${m.score}(${m.quality.slice(0,3)})`).join(' | ')
  };
}

// ── Dusthana Transformation Logic ──
function getDusthanaTransformations(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const transformations = [];

  // 6th lord in 6/8/12 = Vipareeta Raja (Harsha) — already detected in yogas
  // 8th lord in 6/8/12 = Vipareeta Raja (Sarala)
  // 12th lord in 6/8/12 = Vipareeta Raja (Vimala)
  // These are already in yoga engine — just surface the transformation logic

  // Benefic in dusthana = hidden growth
  for (const [name, p] of Object.entries(planets)) {
    if (![6,8,12].includes(p.house)) continue;
    if (['Jupiter','Venus','Moon'].includes(name)) {
      transformations.push({
        planet: name, house: p.house,
        type: 'hidden_growth',
        desc: `${name} (benefic) in H${p.house} — hidden growth, gains come through unusual channels, spiritual depth, healing`
      });
    }
    if (['Saturn','Mars','Rahu'].includes(name) && !ST(name).includes('Debilitated')) {
      transformations.push({
        planet: name, house: p.house,
        type: 'struggle_resilience',
        desc: `${name} (malefic) in H${p.house} — struggle present but builds resilience, eventual strength through repeated challenge`
      });
    }
  }

  return {
    transformations,
    summary: transformations.length
      ? transformations.map(t=>t.desc).join(' | ')
      : 'No major dusthana transformations'
  };
}

module.exports.getAspectStrength = getAspectStrength;
module.exports.detectVargottama = detectVargottama;
module.exports.detectPushkaraNavamsa = detectPushkaraNavamsa;
module.exports.getPlanetDominance = getPlanetDominance;
module.exports.getDashaQualityScore = getDashaQualityScore;
module.exports.getBirthTimeConfidence = getBirthTimeConfidence;
module.exports.getRecoveryIndicators = getRecoveryIndicators;
module.exports.getTransitHeatmap = getTransitHeatmap;
module.exports.getDusthanaTransformations = getDusthanaTransformations;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 7: CERTAINTY & PRECISION
// ═══════════════════════════════════════════════════

// ── 1. Certainty Engine ──
// confidence = supporting signals - blocking signals → normalized 0-100%
function getCertaintyScore(supportingSignals, blockingSignals, label) {
  const net = supportingSignals.length - blockingSignals.length;
  const total = supportingSignals.length + blockingSignals.length;
  // Normalize: net of +5 = 100%, net of -5 = 0%, 0 = 50%
  const raw = Math.round(50 + (net / Math.max(total, 1)) * 50);
  const score = Math.max(5, Math.min(95, raw));
  const level = score >= 80 ? 'VERY HIGH' : score >= 65 ? 'HIGH' : score >= 45 ? 'MEDIUM' : 'LOW';
  return {
    label, score, level,
    supporting: supportingSignals,
    blocking: blockingSignals,
    supportCount: supportingSignals.length,
    blockCount: blockingSignals.length,
    summary: `${label}: ${score}% confidence (${level}) | ${supportingSignals.length} supporting, ${blockingSignals.length} blocking`
  };
}

// ── 3. Trigger Stack Engine ──
// Event = Natal Promise × Dasha × Transit × House Lord × Divisional
function getTriggerStack(event, checks) {
  // checks = { natal, dasha, transit, houseLord, divisional }
  const stack = [
    { name: 'Natal Promise',      active: !!checks.natal,      desc: checks.natal      || 'not confirmed' },
    { name: 'Dasha Activation',   active: !!checks.dasha,      desc: checks.dasha      || 'not active'    },
    { name: 'Transit Trigger',    active: !!checks.transit,    desc: checks.transit    || 'not active'    },
    { name: 'House Lord Active',  active: !!checks.houseLord,  desc: checks.houseLord  || 'not active'    },
    { name: 'Divisional Support', active: !!checks.divisional, desc: checks.divisional || 'not confirmed' },
  ];
  const count = stack.filter(s => s.active).length;
  const strength = count === 5 ? 'CERTAIN' : count === 4 ? 'VERY STRONG' : count === 3 ? 'STRONG' :
    count === 2 ? 'POSSIBLE' : 'WEAK';
  return {
    event, stack, count, strength,
    summary: `${event} trigger stack: ${count}/5 (${strength}) | ${stack.filter(s=>s.active).map(s=>s.name).join(' + ')}`
  };
}

// ── Marriage Trigger Stack ──
function getMarriageTriggerStack(planets, lagnaIdx, dasha, transits, karakas, upapadaLagna, navamsa, weightedScores) {
  const H = name => planets[name]?.house || 0;
  const l7 = RASI_LORD[(lagnaIdx+6)%12];
  const dk = karakas?.Darakaraka;

  // Natal promise: H7 lord strong, Venus dignified, UL good, DK strong
  const l7Good = !['Debilitated','Enemy'].some(s => planets[l7]?.status?.includes(s)) && ![6,8,12].includes(H(l7));
  const venusGood = !planets.Venus?.combust && !planets.Venus?.status.includes('Debilitated');
  const ulGood = upapadaLagna && ![6,8,12].includes(planets[RASI_LORD[upapadaLagna.rasiIdx]]?.house);
  const d9VenusGood = !navamsa?.planets?.Venus?.status.includes('Debilitated');
  const natalCount = [l7Good, venusGood, ulGood, d9VenusGood].filter(Boolean).length;
  const natal = natalCount >= 2 ? `${natalCount}/4 marriage indicators strong (H7 lord, Venus, UL, D9 Venus)` : null;

  // Dasha activation
  const dashaActive = dasha.dashaEventTriggers?.marriage?.length > 0;
  const dashaDesc = dashaActive ? `${dasha.current?.lord}–${dasha.currentAntar?.lord} activates marriage houses` : null;

  // Transit trigger
  const transitActive = transits.marriage?.length > 0 || transits.doubleTransitActive;
  const transitDesc = transitActive ? (transits.marriage?.[0] || 'Double transit active') : null;

  // House lord active
  const houseLordActive = H(dasha.current?.lord) === 7 || H(dasha.currentAntar?.lord) === 7 ||
    (planets[dasha.current?.lord]?.aspects||[]).includes(7) ||
    (dasha.current?.lord === l7) || (dasha.currentAntar?.lord === l7);
  const houseLordDesc = houseLordActive ? `7th lord or H7 activated by current Dasha` : null;

  // Divisional: D9 supports
  const divDesc = d9VenusGood ? 'D9 Venus supports marriage karma' : null;

  return getTriggerStack('Marriage', {
    natal, dasha: dashaDesc, transit: transitDesc, houseLord: houseLordDesc, divisional: divDesc
  });
}

// ── 4. Affliction Severity Engine ──
function getAfflictionSeverityDetailed(planet, planets, lagnaIdx, yogas) {
  if (!planets[planet]) return null;
  const p = planets[planet];
  const H = name => planets[name]?.house || 0;
  const afflictions = [];
  let severityScore = 0;

  // Sign affliction
  if (p.status.includes('Debilitated')) { severityScore += 30; afflictions.push('Debilitated in sign'); }
  if (p.status.includes('Enemy')) { severityScore += 15; afflictions.push('Enemy sign'); }

  // Combustion
  if (p.combust) { severityScore += 25; afflictions.push('Combust (within Sun orb)'); }

  // Malefic aspects (with orb check)
  const satAspects = (planets.Saturn?.aspects||[]).includes(p.house);
  const marsAspects = (planets.Mars?.aspects||[]).includes(p.house);
  const rahuConj = Math.abs((planets.Rahu?.sid||0) - p.sid) < 10;
  if (satAspects) { severityScore += 20; afflictions.push('Saturn aspects'); }
  if (marsAspects) { severityScore += 15; afflictions.push('Mars aspects'); }
  if (rahuConj)  { severityScore += 20; afflictions.push('Rahu conjunct'); }

  // Dusthana house
  if ([6,8,12].includes(p.house)) { severityScore += 10; afflictions.push(`In H${p.house} (dusthana)`); }

  // Protections (reduce severity)
  const beneficAspects = (planets.Jupiter?.aspects||[]).includes(p.house) || (planets.Venus?.aspects||[]).includes(p.house);
  const isVargottama = p.rasiIdx === p.navamsaRasiIdx;
  const hasNeechaBhanga = yogas.some(y => y.planet === planet && y.name.includes('Neecha Bhanga'));

  if (beneficAspects) { severityScore -= 15; }
  if (isVargottama)   { severityScore -= 20; }
  if (hasNeechaBhanga){ severityScore -= 25; }
  if (p.retrograde)   { severityScore -= 10; }

  severityScore = Math.max(0, Math.min(100, severityScore));
  const level = severityScore >= 70 ? 'SEVERE' : severityScore >= 50 ? 'STRONG' :
    severityScore >= 30 ? 'MODERATE' : 'MILD';

  const protections = [];
  if (beneficAspects) protections.push('Jupiter/Venus aspect softens');
  if (isVargottama)   protections.push('Vargottama — D9 support strong');
  if (hasNeechaBhanga)protections.push('Neecha Bhanga active');
  if (p.retrograde)   protections.push('Retrograde adds internalized strength');

  return {
    planet, severityScore, level, afflictions, protections,
    summary: `${planet} affliction: ${level} (${severityScore}/100) | Afflictions: ${afflictions.join(', ') || 'none'} | Protected by: ${protections.join(', ') || 'none'}`
  };
}

// ── 2. Rectification Warning ──
function getRectificationWarning(lagna, planets) {
  const warnings = [];
  const lagnaDegs = lagna.degInRasi;
  const moonDegs  = planets.Moon?.degInRasi || 15;
  const nakDeg    = (planets.Moon?.sid || 0) % (360/27);
  const nakSize   = 360/27;

  if (lagnaDegs < 2 || lagnaDegs > 28)
    warnings.push(`Lagna at ${lagnaDegs.toFixed(1)}° — within 2° of sign boundary. A 15-minute birth time error could change Lagna to ${lagnaDegs < 2 ? 'previous sign' : 'next sign'}.`);

  if (nakDeg < 1 || nakDeg > (nakSize - 1))
    warnings.push(`Moon near Nakshatra boundary — Vimshottari Dasha starting lord may change with ±15 min birth time correction.`);

  // Check navamsa sensitivity (planet near 3.2° navamsa division)
  const navamsaDiv = 3.333;
  for (const [name, p] of Object.entries(planets)) {
    if (['Rahu','Ketu'].includes(name)) continue;
    const posInNavamsa = p.degInRasi % navamsaDiv;
    if (posInNavamsa < 0.2 || posInNavamsa > (navamsaDiv - 0.2))
      warnings.push(`${name} near Navamsa boundary (${p.degInRasi.toFixed(2)}° in ${p.rasi}) — D9 position may shift with small birth time correction.`);
  }

  const risk = warnings.length >= 3 ? 'HIGH' : warnings.length >= 1 ? 'MODERATE' : 'LOW';
  return {
    risk, warnings,
    summary: warnings.length
      ? `BIRTH TIME SENSITIVITY: ${risk} | ${warnings.join(' | ')}`
      : 'Birth time appears stable — Lagna and Moon well within boundaries'
  };
}

// ── 5. Domain Protector Engine ──
function getDomainProtector(planets, lagnaIdx, yogas, domain) {
  const H = name => planets[name]?.house || 0;
  const protectors = [];

  // Jupiter protection
  const jupH = H('Jupiter');
  const jupSt = planets.Jupiter?.status || '';
  if (jupSt.includes('Exalted') || jupSt.includes('Own') || [1,4,5,7,9,10].includes(jupH))
    protectors.push(`Jupiter in H${jupH} (${jupSt.split(' ')[0]}) — grace, expansion, protection`);

  // Lagna lord protection
  const lagnaLord = RASI_LORD[lagnaIdx];
  if (![6,8,12].includes(H(lagnaLord)) && !planets[lagnaLord]?.combust)
    protectors.push(`Lagna lord ${lagnaLord} in H${H(lagnaLord)} — self is protected, vitality maintained`);

  // D9 support
  const d9VenusSt = ''; // would need navamsa passed in
  // Vipareeta Raja
  if (yogas.some(y => y.name.includes('Vipareeta')))
    protectors.push('Vipareeta Raja Yoga — chart rises from adversity, difficulties become fuel');

  // Pushkara planet
  // Vargottama
  const vargottamaPlanets = Object.entries(planets).filter(([,p]) => p.rasiIdx === p.navamsaRasiIdx).map(([n]) => n);
  if (vargottamaPlanets.length > 0)
    protectors.push(`${vargottamaPlanets.join(', ')} Vargottama — full strength in D9, long-term outcomes better than short-term appears`);

  // Domain-specific
  if (domain === 'marriage') {
    if (yogas.some(y => y.name.includes('Hamsa'))) protectors.push('Hamsa Yoga (Jupiter Kendra) — blessed marriage karma');
    const l7 = RASI_LORD[(lagnaIdx+6)%12];
    if (planets[l7]?.status.includes('Exalted') || planets[l7]?.status.includes('Own'))
      protectors.push(`7th lord ${l7} strong — marriage itself is protected`);
  }
  if (domain === 'career') {
    if (yogas.some(y => y.name.includes('Ruchaka'))) protectors.push('Ruchaka Yoga — career excellence, leadership protected');
    if (yogas.some(y => y.name.includes('Dharma-Karma'))) protectors.push('Dharma-Karma Yoga — career aligned with purpose');
  }
  if (domain === 'wealth') {
    if (yogas.some(y => y.name.includes('Lakshmi'))) protectors.push('Lakshmi Yoga — wealth karma exceptionally protected');
    if (yogas.some(y => y.name.includes('Gajakesari'))) protectors.push('Gajakesari Yoga — financial grace, Jupiter-Moon alignment');
  }

  return {
    domain, protectors,
    strongest: protectors[0] || 'No major protector active — requires self-effort',
    summary: protectors.length
      ? `${domain} PROTECTORS: ${protectors.join(' | ')}`
      : `${domain}: limited natural protection — conscious effort required`
  };
}

// ── 6. Destiny vs Free Will Classification ──
function getKarmaClassification(planets, lagnaIdx, yogas, karakas) {
  const H = name => planets[name]?.house || 0;
  const classifications = {
    fixed: [],
    flexible: [],
    avoidable: [],
    earned: []
  };

  // Fixed karma — very strong yogas, 5+ indicators, AK in fixed patterns
  const ak = karakas?.Atmakaraka;
  if (yogas.some(y => y.name.includes('Pancha Mahapurusha') || y.name.includes('Hamsa') || y.name.includes('Ruchaka') || y.name.includes('Malavya')))
    classifications.fixed.push('Career/life direction strongly fixed by Pancha Mahapurusha yoga — this person is built for a specific calling');

  if (planets[ak]?.status.includes('Exalted'))
    classifications.fixed.push(`Soul-level mission (Atmakaraka ${ak} exalted) — life purpose is clearly defined and likely to manifest`);

  // Flexible karma — moderate indicators, dasha-dependent
  const l7 = RASI_LORD[(lagnaIdx+6)%12];
  const marriageScore = yogas.filter(y => y.planet === 'Venus' || y.planet === l7).length;
  if (marriageScore >= 2 && marriageScore <= 4)
    classifications.flexible.push(`Marriage timing is flexible — chart shows potential but exact timing depends on choices and dasha activation`);

  if (H('Jupiter') !== 7 && ![6,8,12].includes(H(l7)))
    classifications.flexible.push('Wealth accumulation is flexible — foundation exists but requires disciplined action');

  // Avoidable karma — afflictions that have cancellation routes
  const mangalActive = yogas.some(y => y.name.includes('Mangal Dosha — ACTIVE'));
  if (mangalActive)
    classifications.avoidable.push('Mangal Dosha effects can be reduced through pariharams and aware partner selection');

  if (yogas.some(y => y.name.includes('Pitru Dosha')))
    classifications.avoidable.push('Ancestral karma (Pitru Dosha) — can be cleared through specific tarpan and ancestor rituals');

  // Earned karma — requires effort, strong indicators but Saturn/Ketu gated
  if (planets.Saturn?.bala >= 60)
    classifications.earned.push('Career authority and wealth (Saturn strong) — comes only through sustained discipline and patience, not luck');

  if (H('Ketu') === 10 || H('Ketu') === 1)
    classifications.earned.push('Success requires overcoming self-sabotage tendencies (Ketu in success house) — must be consciously earned');

  return {
    classifications,
    summary: [
      classifications.fixed.length ? `FIXED KARMA: ${classifications.fixed.join(' | ')}` : '',
      classifications.flexible.length ? `FLEXIBLE KARMA: ${classifications.flexible.join(' | ')}` : '',
      classifications.avoidable.length ? `AVOIDABLE KARMA: ${classifications.avoidable.join(' | ')}` : '',
      classifications.earned.length ? `EARNED KARMA: ${classifications.earned.join(' | ')}` : '',
    ].filter(Boolean).join('\n')
  };
}

module.exports.getCertaintyScore = getCertaintyScore;
module.exports.getTriggerStack = getTriggerStack;
module.exports.getMarriageTriggerStack = getMarriageTriggerStack;
module.exports.getAfflictionSeverityDetailed = getAfflictionSeverityDetailed;
module.exports.getRectificationWarning = getRectificationWarning;
module.exports.getDomainProtector = getDomainProtector;
module.exports.getKarmaClassification = getKarmaClassification;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 8: DEEP ANALYSIS ENGINES
// ═══════════════════════════════════════════════════

// ── 1. House Story Engine ──
function buildHouseStoryEngine(planets, lagnaIdx, allYogas) {
  const H = name => planets[name]?.house || 0;
  const stories = {};

  for (let h = 1; h <= 12; h++) {
    const signIdx = (lagnaIdx + h - 1) % 12;
    const lord = RASI_LORD[signIdx];
    const lordData = planets[lord];
    const lordHouse = lordData?.house || 0;
    const occupants = Object.entries(planets).filter(([,p]) => p.house === h).map(([n]) => n);
    const aspects = Object.entries(planets).filter(([n,p]) => (p.aspects||[]).includes(h)).map(([n]) => n);
    const beneficAspects = aspects.filter(n => ['Jupiter','Venus','Moon'].includes(n));
    const maleficAspects = aspects.filter(n => ['Saturn','Mars','Rahu','Ketu'].includes(n));

    // Lord placement interpretation
    let lordStory = '';
    const HOUSE_SIGNIF_SHORT = {1:'self/health',2:'wealth/speech',3:'effort/siblings',4:'home/mother',5:'children/intelligence',
      6:'enemies/disease',7:'spouse/partnership',8:'transformation/hidden',9:'luck/father',10:'career/authority',
      11:'gains/wishes',12:'loss/foreign/spiritual'};
    const fromOwnHouse = ((lordHouse - h + 12) % 12) + 1;

    if (lordHouse === h) {
      lordStory = `Lord ${lord} in own house — maximum strength, house themes manifest strongly`;
    } else if ([6,8,12].includes(lordHouse)) {
      const dusthanaTheme = lordHouse === 6 ? 'conflict/service' : lordHouse === 8 ? 'transformation/obstacles' : 'foreign/loss/spiritual';
      lordStory = `Lord ${lord} in H${lordHouse} (${dusthanaTheme}) — house themes face obstruction or manifest through hidden/difficult channels`;
    } else if ([1,4,7,10].includes(lordHouse)) {
      lordStory = `Lord ${lord} in H${lordHouse} (Kendra) — house themes are strongly activated and visible`;
    } else {
      lordStory = `Lord ${lord} in H${lordHouse} (${HOUSE_SIGNIF_SHORT[lordHouse]||''}) — house themes connect to ${HOUSE_SIGNIF_SHORT[lordHouse]||''}`;
    }

    // Special cross-house stories
    let specialStory = '';
    if (h === 7 && lordHouse === 12) specialStory = 'H7 lord in H12: spouse may be from foreign place, or relationship involves sacrifice/distance';
    if (h === 7 && lordHouse === 8) specialStory = 'H7 lord in H8: marriage involves transformation, possible secrecy, or karmic intensity';
    if (h === 10 && lordHouse === 12) specialStory = 'H10 lord in H12: career in foreign lands, spiritual/NGO/hospital work, or career involves sacrifice';
    if (h === 2 && lordHouse === 12) specialStory = 'H2 lord in H12: wealth flows outward (expenses), foreign income possible, spiritual spending';
    if (h === 5 && lordHouse === 12) specialStory = 'H5 lord in H12: children may be delayed or involve spiritual/foreign connection';
    if (h === 4 && lordHouse === 6) specialStory = 'H4 lord in H6: home life involves conflict, mother may face health issues, property disputes possible';

    stories[h] = {
      house: h,
      sign: RASI_NAMES[signIdx],
      lord, lordHouse,
      lordStatus: lordData?.status || 'N/A',
      lordBala: lordData?.bala || 0,
      occupants,
      beneficAspects,
      maleficAspects,
      lordStory,
      specialStory,
      summary: `H${h} (${RASI_NAMES[signIdx]}): ${occupants.length ? 'Contains '+occupants.join(',') : 'Empty'} | ${lordStory}${specialStory ? ' | '+specialStory : ''}`
    };
  }
  return { stories, summary: Object.values(stories).map(s => s.summary).join('\n') };
}

// ── 13. Dispositor Chain Engine ──
function getDispositorChain(planets, lagnaIdx) {
  const chains = {};
  const H = name => planets[name]?.house || 0;

  for (const [name, p] of Object.entries(planets)) {
    if (['Rahu','Ketu'].includes(name)) continue;
    const chain = [name];
    let current = name;
    let depth = 0;

    while (depth < 8) {
      const signLord = RASI_LORD[planets[current]?.rasiIdx || 0];
      if (signLord === current || chain.slice(1).includes(signLord)) break; // own sign or loop
      chain.push(signLord);
      current = signLord;
      depth++;
    }

    const finalDispositor = chain[chain.length - 1];
    chains[name] = {
      chain,
      finalDispositor,
      finalDispositorHouse: H(finalDispositor),
      finalDispositorStatus: planets[finalDispositor]?.status || '',
      chainLength: chain.length,
      summary: `${name}: ${chain.join('→')} | Root controller: ${finalDispositor} (H${H(finalDispositor)}, ${(planets[finalDispositor]?.status||'').split(' ')[0]})`
    };
  }

  // Find the most influential final dispositor
  const fdCount = {};
  Object.values(chains).forEach(c => {
    fdCount[c.finalDispositor] = (fdCount[c.finalDispositor] || 0) + 1;
  });
  const chartRuler = Object.entries(fdCount).sort((a,b) => b[1]-a[1])[0];

  return {
    chains,
    chartRuler: chartRuler ? { planet: chartRuler[0], count: chartRuler[1],
      summary: `${chartRuler[0]} is the hidden chart ruler (controls ${chartRuler[1]} planets through dispositor chain)` } : null,
    summary: Object.values(chains).map(c => c.summary).join('\n')
  };
}

// ── 14. Planet Cluster Psychology ──
function getPlanetClusters(planets, lagnaIdx) {
  const houseClusters = {};
  const signClusters = {};

  for (const [name, p] of Object.entries(planets)) {
    if (!houseClusters[p.house]) houseClusters[p.house] = [];
    houseClusters[p.house].push(name);
    if (!signClusters[p.rasi]) signClusters[p.rasi] = [];
    signClusters[p.rasi].push(name);
  }

  const significantHouseClusters = Object.entries(houseClusters)
    .filter(([,planets]) => planets.length >= 3)
    .map(([h, planets]) => {
      const HOUSE_THEMES = {1:'identity/self',2:'wealth/values',3:'communication',4:'home/mother',5:'creativity/children',
        6:'service/conflict',7:'relationships',8:'transformation',9:'dharma/luck',10:'career',11:'gains/social',12:'spiritual/loss'};
      return { house: parseInt(h), planets, theme: HOUSE_THEMES[h] || 'unknown',
        desc: `Stellium in H${h} (${HOUSE_THEMES[h]||''}): ${planets.join('+')} — concentrated karma, obsessive energy in this life domain` };
    });

  return {
    houseClusters: significantHouseClusters,
    summary: significantHouseClusters.length
      ? significantHouseClusters.map(c => c.desc).join(' | ')
      : 'No major planetary clusters — karma is distributed'
  };
}

// ── 15. Element Balance Engine ──
const RASI_ELEM = {Mesha:'Fire',Simha:'Fire',Dhanu:'Fire',Rishabha:'Earth',Kanya:'Earth',Makara:'Earth',
  Mithuna:'Air',Tula:'Air',Kumbha:'Air',Kataka:'Water',Vrischika:'Water',Meena:'Water'};

function getElementBalance(planets) {
  const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const planetsByElement = { Fire: [], Earth: [], Air: [], Water: [] };
  const weightedCounts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };

  for (const [name, p] of Object.entries(planets)) {
    const elem = RASI_ELEM[p.rasi];
    if (!elem) continue;
    counts[elem]++;
    planetsByElement[elem].push(name);
    // Weight by bala
    weightedCounts[elem] += (p.bala || 50) / 50;
  }

  const total = Object.values(counts).reduce((a,b) => a+b, 0);
  const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
  const deficient = Object.entries(counts).sort((a,b) => a[1]-b[1])[0];

  const ELEM_MEANING = {
    Fire: 'action, ambition, leadership, confidence, risk-taking',
    Earth: 'stability, practicality, material focus, patience, stubbornness',
    Air: 'intellect, communication, social connections, adaptability, overthinking',
    Water: 'emotion, intuition, empathy, depth, sensitivity, mood swings'
  };

  const balance = Object.entries(counts).map(([e, c]) => `${e}:${c}(${Math.round(c/total*100)}%)`).join(' | ');

  return {
    counts, weightedCounts, dominant: dominant[0], deficient: deficient[0],
    planetsByElement, balance,
    interpretation: `Dominant: ${dominant[0]} (${dominant[1]} planets) — ${ELEM_MEANING[dominant[0]]}. Deficient: ${deficient[0]} — needs conscious development of ${ELEM_MEANING[deficient[0]]} qualities.`,
    summary: `Element balance: ${balance} | Dominant: ${dominant[0]} (${ELEM_MEANING[dominant[0]]?.split(',')[0]}) | Deficient: ${deficient[0]} (${ELEM_MEANING[deficient[0]]?.split(',')[0]})`
  };
}

// ── 16. Modality Engine ──
const RASI_MOD = {Mesha:'Movable',Kataka:'Movable',Tula:'Movable',Makara:'Movable',
  Rishabha:'Fixed',Simha:'Fixed',Vrischika:'Fixed',Kumbha:'Fixed',
  Mithuna:'Dual',Kanya:'Dual',Dhanu:'Dual',Meena:'Dual'};

function getModalityEngine(planets) {
  const counts = { Movable: 0, Fixed: 0, Dual: 0 };
  for (const [,p] of Object.entries(planets)) {
    const mod = RASI_MOD[p.rasi];
    if (mod) counts[mod]++;
  }
  const dominant = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
  const MOD_MEANING = {
    Movable: 'initiates change, restless, adaptable, starts many things, may not finish',
    Fixed: 'stubborn, persistent, reliable, resists change, depth over breadth',
    Dual: 'flexible, indecisive, sees all sides, good communicator, scattered energy'
  };
  return {
    counts, dominant: dominant[0],
    summary: `Modality: Movable:${counts.Movable} Fixed:${counts.Fixed} Dual:${counts.Dual} | Dominant: ${dominant[0]} — ${MOD_MEANING[dominant[0]]}`
  };
}

// ── 26. Public Image vs True Self (AL vs Lagna) ──
function getALvsLagna(planets, lagnaIdx, arudhaLagna) {
  if (!arudhaLagna) return null;
  const lagnaSign = RASI_NAMES[lagnaIdx];
  const alSign = arudhaLagna.rasi;
  const alLord = RASI_LORD[arudhaLagna.rasiIdx];
  const alLordStatus = planets[alLord]?.status || '';
  const alLordH = planets[alLord]?.house || 0;

  const lagnaMeaning = `True self: ${lagnaSign} — real personality, inner world, actual motivations`;
  const alMeaning = `Public image: ${alSign} — how the world perceives them, reputation, social persona`;

  let gap = '';
  if (lagnaIdx !== arudhaLagna.rasiIdx) {
    gap = `Real self (${lagnaSign}) differs from public image (${alSign}) — person may appear ${alSign}-natured to the world but feels very different inside`;
  } else {
    gap = `Lagna and Arudha Lagna aligned — inner self and public image are consistent, authentic presentation`;
  }

  return {
    lagnaSign, alSign, alLord, alLordStatus, alLordH, gap,
    summary: `${lagnaMeaning} | ${alMeaning} | ${gap}`
  };
}

// ── 28. Breakpoint Years Engine ──
function getBreakpointYears(planets, lagnaIdx, dasha, dob) {
  const birthYear = new Date(dob).getFullYear();
  const breakpoints = [];

  // Major Dasha transitions
  let cumYrs = 0;
  dasha.dashaSequence?.forEach((ds, i) => {
    const transitionAge = Math.round(cumYrs);
    const transitionYear = birthYear + transitionAge;
    if (transitionAge >= 15 && transitionAge <= 75) {
      breakpoints.push({
        type: 'Dasha Transition',
        age: transitionAge, year: transitionYear,
        desc: `Age ${transitionAge} (${transitionYear}): ${i > 0 ? dasha.dashaSequence[i-1]?.lord : '?'} → ${ds.lord} Dasha — major life shift`
      });
    }
    cumYrs += ds.years;
  });

  // Planet maturity ages
  const MATURITY = { Mars:28, Mercury:32, Jupiter:16, Venus:25, Saturn:36, Rahu:42, Ketu:48 };
  for (const [planet, age] of Object.entries(MATURITY)) {
    const year = birthYear + age;
    breakpoints.push({
      type: 'Planet Maturity',
      age, year,
      desc: `Age ${age} (${year}): ${planet} matures — ${planet} themes stabilize and integrate`
    });
  }

  // Saturn returns (age ~29, ~58)
  [29, 58].forEach(age => {
    breakpoints.push({
      type: 'Saturn Return',
      age, year: birthYear + age,
      desc: `Age ${age} (${birthYear + age}): Saturn Return — major restructuring of foundations, career, and responsibility`
    });
  });

  breakpoints.sort((a, b) => a.age - b.age);
  const upcoming = breakpoints.filter(b => b.year >= new Date().getFullYear()).slice(0, 5);

  return {
    allBreakpoints: breakpoints,
    upcoming,
    summary: `Key breakpoint years: ${upcoming.slice(0,3).map(b => `${b.year} (age ${b.age}): ${b.desc.split('—')[0].trim()}`).join(' | ')}`
  };
}

// ── 22. Wealth Style Engine ──
function getWealthStyle(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const style = [];

  // Salary (stable employment): Saturn, Mercury, H6/H10
  if ([10,6].includes(H('Saturn')) || [10,6].includes(H('Mercury'))) style.push('Salary/Service: disciplined, consistent income through employment');
  // Business: Mercury, Mars, 3rd/7th/10th connection
  const l3 = RASI_LORD[(lagnaIdx+2)%12], l10 = RASI_LORD[(lagnaIdx+9)%12];
  if (H('Mercury')===7 || H('Mars')===3 || Math.abs((planets[l3]?.sid||0)-(planets[l10]?.sid||0))<15) style.push('Business/Trade: entrepreneurial, partnership-based income');
  // Foreign: Rahu, H12, H9 link
  if ([H('Rahu'),H(RASI_LORD[(lagnaIdx+11)%12])].includes(12) || [H('Rahu'),H(RASI_LORD[(lagnaIdx+8)%12])].includes(9)) style.push('Foreign income: money from abroad, international clients, or overseas employment');
  // Inheritance: H8, H4
  const l8 = RASI_LORD[(lagnaIdx+7)%12];
  if ([1,4,7,10].includes(H(l8)) && !planets[l8]?.combust) style.push('Inheritance/Windfall: H8 lord strong — unexpected gains, family wealth');
  // Speculation: Rahu H5, Moon H5
  if (H('Rahu')===5 || H('Moon')===5) style.push('Speculation/Investments: risk-taking in finances, stock market tendency');
  // Property: Mars, Moon, H4 strong
  if (H('Mars')===4 || H('Moon')===4 || [1,4,7,10].includes(H(RASI_LORD[(lagnaIdx+3)%12]))) style.push('Property/Real estate: income through land and buildings');
  // Creative/Art: Venus H2/H10
  if ([2,10].includes(H('Venus')) && !planets.Venus?.combust) style.push('Creative/Arts: income through beauty, art, entertainment, luxury');

  return {
    styles: style,
    primary: style[0] || 'General income through own effort',
    summary: `Wealth comes through: ${style.join(' | ') || 'varied sources — chart shows multiple income paths'}`
  };
}

// ── 21. Relationship Wound Engine ──
function getRelationshipWounds(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const wounds = [];

  // Abandonment wound: Moon H8/H12 + Saturn aspect + Ketu conjunct (2+)
  const moonH = H('Moon');
  let abandCount = 0;
  if ([8,12].includes(moonH)) abandCount++;
  if ((planets.Saturn?.aspects||[]).includes(moonH)) abandCount++;
  if (Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10) abandCount++;
  if (abandCount >= 2) wounds.push({ type: 'Abandonment', count: abandCount,
    desc: 'Abandonment wound — tendency to expect people to leave, difficulty trusting continuity in relationships' });

  // Rejection wound: Venus in enemy sign + Saturn aspect + H7 afflicted (2+)
  let rejCount = 0;
  if (planets.Venus?.status.includes('Enemy') || planets.Venus?.status.includes('Debilitated')) rejCount++;
  if ((planets.Saturn?.aspects||[]).includes(H('Venus'))) rejCount++;
  if ([6,8,12].includes(H('Venus'))) rejCount++;
  if (rejCount >= 2) wounds.push({ type: 'Rejection', count: rejCount,
    desc: 'Rejection wound — fear of not being chosen or valued, over-giving in relationships to avoid abandonment' });

  // Betrayal wound: Rahu-Venus + 8th house involvement + Saturn H7 (2+)
  let betCount = 0;
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10) betCount++;
  if ([8,12].includes(H('Venus'))) betCount++;
  if (H('Saturn')===7) betCount++;
  if (betCount >= 2) wounds.push({ type: 'Betrayal', count: betCount,
    desc: 'Betrayal wound — guards emotions carefully after being hurt, tests partners repeatedly before trusting' });

  // Control wound: Saturn dominant + H4 afflicted + Sun H12/H6/H8 (2+)
  let ctrlCount = 0;
  if (planets.Saturn?.bala >= 70) ctrlCount++;
  if ([6,8,12].includes(H(RASI_LORD[(lagnaIdx+3)%12]))) ctrlCount++;
  if ([6,8,12].includes(H('Sun'))) ctrlCount++;
  if (ctrlCount >= 2) wounds.push({ type: 'Control', count: ctrlCount,
    desc: 'Control wound — either experienced controlling relationships or compensates by over-controlling; fear of vulnerability' });

  return {
    wounds,
    hasWounds: wounds.length > 0,
    summary: wounds.length
      ? `Relationship wounds (${wounds.length}): ${wounds.map(w=>`${w.type} (${w.count} indicators): ${w.desc}`).join(' | ')}`
      : 'No major relationship wounds confirmed (below 2-indicator threshold)'
  };
}

// ── 24. Power Engine ──
function getPowerEngine(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const powerAreas = [];

  // Sun strong in Kendra
  if ([1,4,7,10].includes(H('Sun')) && !planets.Sun?.combust) powerAreas.push(`Leadership/Authority (Sun H${H('Sun')}) — natural command, influence over others`);
  // Mars in Kendra
  if ([1,4,7,10].includes(H('Mars')) && planets.Mars?.status.includes('Exalted')) powerAreas.push(`Physical/Competitive power (Mars exalted H${H('Mars')}) — dominates through action, athletic/military strength`);
  // Saturn exalted/own + Kendra
  if ((planets.Saturn?.status.includes('Exalted')||planets.Saturn?.status.includes('Own')) && [1,4,7,10].includes(H('Saturn'))) powerAreas.push(`Organizational power (Saturn H${H('Saturn')}) — controls systems, institutions, long-term structures`);
  // H10/H6/H3 strength
  const l10 = RASI_LORD[(lagnaIdx+9)%12];
  if ([1,4,7,10].includes(H(l10))) powerAreas.push(`Career power (10th lord H${H(l10)} strong) — professional authority, reputation commands respect`);
  // Yogas
  if (yogas.some(y=>y.name.includes('Ruchaka'))) powerAreas.push('Competitive dominance (Ruchaka Yoga) — wins battles, conquers opponents');
  if (yogas.some(y=>y.name.includes('Hamsa'))) powerAreas.push('Spiritual authority (Hamsa Yoga) — wisdom commands respect, teaching power');

  return {
    powerAreas,
    summary: powerAreas.length
      ? `Power domains: ${powerAreas.join(' | ')}`
      : 'Power comes through quiet persistence rather than visible dominance'
  };
}

// ── 25. Fear Engine ──
function getFearEngine(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const fears = [];

  // Fear of failure/authority: Saturn H1/H4/H10 + weak Sun
  if (H('Saturn')===1 || (planets.Saturn?.aspects||[]).includes(1)) fears.push('Fear of failure/judgment — Saturn on Lagna creates self-criticism and fear of not meeting expectations');
  // Fear of abandonment: Moon afflicted
  if ((planets.Saturn?.aspects||[]).includes(H('Moon')) || [8,12].includes(H('Moon'))) fears.push('Fear of abandonment — Moon under pressure creates deep insecurity about being left or forgotten');
  // Fear of intimacy: Ketu H7 or Venus in H8
  if (H('Ketu')===7 || [8,12].includes(H('Venus'))) fears.push('Fear of deep intimacy — Ketu/Venus placement creates protective emotional distance');
  // Fear of poverty: H2 or H11 lord weak
  const l2 = RASI_LORD[(lagnaIdx+1)%12], l11 = RASI_LORD[(lagnaIdx+10)%12];
  if ([6,8,12].includes(H(l2)) && planets[l2]?.bala < 40) fears.push('Fear of financial insecurity — wealth lords weak creates anxiety around money');
  // Fear of change: Fixed modality dominant + Saturn H4
  if (planets.Saturn?.bala >= 70 && (H('Saturn')===4 || H('Saturn')===1)) fears.push('Fear of change/loss of control — strong Saturn creates rigidity and resistance to the unknown');

  return {
    fears,
    summary: fears.length
      ? `Core fears: ${fears.join(' | ')}`
      : 'No dominant fear patterns identified — Moon and Saturn relatively unafflicted'
  };
}

// ── 3. Nakshatra Deep Engine ──
function getNakshatraDeepAnalysis(planets, nakshatra) {
  const moonNak = nakshatra;
  const NAK_PSYCH = {
    'Ashwini': 'quick starter, healing ability, impatient, needs freedom',
    'Bharani': 'intense transformations, creative force, holds grudges, powerful',
    'Krittika': 'sharp focus, critical mind, nurturing but cutting, spiritual fire',
    'Rohini': 'love of beauty/luxury, sensual, stubborn about values, magnetic',
    'Mrigashira': 'eternal seeker, curious mind, restless, finds through searching',
    'Ardra': 'storms and renewal, raw intelligence, goes through destruction to rebuild',
    'Punarvasu': 'return and renewal, philosophical, generous, needs home base',
    'Pushya': 'nourishing others, disciplined devotion, seeks wisdom, protective',
    'Ashlesha': 'serpent wisdom, perceptive, intense, can be manipulative or deeply healing',
    'Magha': 'royal nature, pride in lineage, leadership, ancestral karma strong',
    'Purva Phalguni': 'pleasure seeker, creative, love-focused, artistic, needs enjoyment',
    'Uttara Phalguni': 'patron/protector, giving after receiving, mature love, seeks stability',
    'Hasta': 'skilled hands, adaptable, clever, healing through touch and craft',
    'Chitra': 'artistic vision, perfectionist, builds beautiful things, needs recognition',
    'Swati': 'independent, dispersed energy, trade-focused, flexible like wind',
    'Vishakha': 'focused ambition, two paths (spiritual/material), intense purpose',
    'Anuradha': 'devotion and friendship, succeeds far from birthplace, seeks true connection',
    'Jyeshtha': 'eldest sibling energy, protects others, sharp tongue, complex emotions',
    'Mula': 'goes to the root, destroys to rebuild, spiritual seeker, transformative',
    'Purva Ashadha': 'invincible determination, water energy, purifies through truth',
    'Uttara Ashadha': 'final victory after long effort, elephantine patience, spiritual warrior',
    'Shravana': 'listening and learning, media, preserves wisdom, travels for knowledge',
    'Dhanishtha': 'wealth through music/rhythm, Mars-Saturn energy, ambitious and lonely',
    'Shatabhisha': 'healer/scientist, secretive, unconventional, sees hidden patterns',
    'Purva Bhadrapada': 'dual nature (fierce/gentle), mystical, sacrifices for vision',
    'Uttara Bhadrapada': 'depth of wisdom, controls rain/nourishment, patience of serpent',
    'Revati': 'nourishing journey, final star, compassionate, walks others home'
  };

  const psychology = NAK_PSYCH[moonNak.name] || 'deep psychological patterns from this nakshatra';
  const lordMeaning = `Nakshatra lord ${moonNak.lord} — this planet's condition shapes the core emotional reality`;

  return {
    nakshatra: moonNak.name,
    lord: moonNak.lord,
    pada: moonNak.pada,
    gana: moonNak.gana,
    nadi: moonNak.nadi,
    psychology,
    lordMeaning,
    summary: `${moonNak.name} Nakshatra psychology: ${psychology} | Lord: ${moonNak.lord} | Pada ${moonNak.pada} | Gana: ${moonNak.gana} | Nadi: ${moonNak.nadi}`
  };
}

// ── 29. Peak Power Years Engine ──
function getPeakPowerYears(planets, lagnaIdx, dasha, dob) {
  const birthYear = new Date(dob).getFullYear();
  const peakWindows = [];
  const H = name => planets[name]?.house || 0;

  // Find dasha periods where the lord is strong and activates H10/H1/H11
  dasha.dashaSequence?.forEach(ds => {
    const lord = ds.lord;
    if (!planets[lord]) return;
    const lordH = H(lord);
    const lordBala = planets[lord]?.bala || 0;
    const isStrong = lordBala >= 60 || planets[lord]?.status.includes('Exalted') || planets[lord]?.status.includes('Own');
    const activatesPower = [1,3,6,10,11].includes(lordH);

    if (isStrong && activatesPower) {
      const startAge = Math.round((new Date(ds.startDate) - new Date(dob)) / (365.25*24*3600*1000));
      const endAge = Math.round((new Date(ds.endDate) - new Date(dob)) / (365.25*24*3600*1000));
      peakWindows.push({
        lord, period: `${ds.startDate.slice(0,4)}–${ds.endDate.slice(0,4)}`,
        ageRange: `${startAge}–${endAge}`,
        reason: `${lord} in H${lordH} (${planets[lord]?.status.split(' ')[0]}, Bala ${lordBala}) — activates authority/career`,
        score: lordBala + (planets[lord]?.status.includes('Exalted') ? 20 : 0)
      });
    }
  });

  peakWindows.sort((a,b) => b.score - a.score);
  return {
    peaks: peakWindows.slice(0, 4),
    summary: peakWindows.length
      ? `Peak power years: ${peakWindows.slice(0,3).map(p=>`${p.period} (age ${p.ageRange}) — ${p.reason.split('—')[0].trim()}`).join(' | ')}`
      : 'Power builds gradually — no single peak period stands out sharply'
  };
}

module.exports.buildHouseStoryEngine = buildHouseStoryEngine;
module.exports.getDispositorChain = getDispositorChain;
module.exports.getPlanetClusters = getPlanetClusters;
module.exports.getElementBalance = getElementBalance;
module.exports.getModalityEngine = getModalityEngine;
module.exports.getALvsLagna = getALvsLagna;
module.exports.getBreakpointYears = getBreakpointYears;
module.exports.getWealthStyle = getWealthStyle;
module.exports.getRelationshipWounds = getRelationshipWounds;
module.exports.getPowerEngine = getPowerEngine;
module.exports.getFearEngine = getFearEngine;
module.exports.getNakshatraDeepAnalysis = getNakshatraDeepAnalysis;
module.exports.getPeakPowerYears = getPeakPowerYears;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 9: LIFE DOMAIN ENGINES
// ═══════════════════════════════════════════════════

// ── Parent Karma Engine (Father + Mother separate) ──
function getParentKarmaEngine(planets, lagnaIdx, dasha, allYogas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';

  // FATHER ENGINE: Sun + H9 + H9 lord
  const h9Sign = (lagnaIdx + 8) % 12;
  const l9 = RASI_LORD[h9Sign];
  const sunH = H('Sun'), sunSt = ST('Sun');
  const l9H = H(l9), l9St = ST(l9);
  const fatherFactors = [];

  if ([6,8,12].includes(sunH)) fatherFactors.push(`Sun in H${sunH} — father relationship difficult or distant`);
  if (sunSt.includes('Debilitated')) fatherFactors.push('Sun debilitated — father authority weakened or absent');
  if ((planets.Saturn?.aspects||[]).includes(sunH)) fatherFactors.push('Saturn aspects Sun — father figure cold, strict, or burden-bearing');
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Sun?.sid||0))<10) fatherFactors.push('Rahu conjunct Sun — father unconventional or foreign element in father relationship');
  if ([6,8,12].includes(l9H)) fatherFactors.push(`9th lord ${l9} in H${l9H} — father luck or lineage faces obstruction`);
  if (l9St.includes('Exalted')||l9St.includes('Own')) fatherFactors.push(`9th lord ${l9} strong — father is source of blessing and support`);

  // Father dasha triggers
  const fatherDashas = dasha.dashaSequence?.filter(ds => ds.lord === 'Sun' || ds.lord === l9)
    .map(ds => `${ds.lord} Dasha (${ds.startDate.slice(0,4)}–${ds.endDate.slice(0,4)}) — father-related events`)
    .slice(0,2) || [];

  // MOTHER ENGINE: Moon + H4 + H4 lord
  const h4Sign = (lagnaIdx + 3) % 12;
  const l4 = RASI_LORD[h4Sign];
  const moonH = H('Moon'), moonSt = ST('Moon');
  const l4H = H(l4), l4St = ST(l4);
  const motherFactors = [];

  if ([6,8,12].includes(moonH)) motherFactors.push(`Moon in H${moonH} — mother emotionally burdened or physically distant`);
  if (moonSt.includes('Debilitated')) motherFactors.push('Moon debilitated — mother relationship source of emotional pain');
  if ((planets.Saturn?.aspects||[]).includes(moonH)) motherFactors.push('Saturn aspects Moon — mother cold or duty-bound, emotional warmth limited');
  if (Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10) motherFactors.push('Ketu conjunct Moon — mother-child separation or feeling of incompleteness with mother');
  if ([6,8,12].includes(l4H)) motherFactors.push(`4th lord ${l4} in H${l4H} — home environment difficult, property complications`);
  if (l4St.includes('Exalted')||l4St.includes('Own')) motherFactors.push(`4th lord ${l4} strong — mother is protector and nourisher`);

  const fatherQuality = fatherFactors.filter(f=>f.includes('difficult')||f.includes('absent')||f.includes('strict')||f.includes('obstruction')).length >= 2
    ? 'Challenging father relationship (2+ indicators)' : 'Father relationship mixed or supportive';
  const motherQuality = motherFactors.filter(f=>f.includes('burdened')||f.includes('pain')||f.includes('cold')||f.includes('difficult')).length >= 2
    ? 'Challenging mother relationship (2+ indicators)' : 'Mother relationship mixed or nourishing';

  return {
    father: { factors: fatherFactors, quality: fatherQuality, dashas: fatherDashas,
      summary: `Father karma: ${fatherQuality} | ${fatherFactors.join(' | ') || 'Father relationship supportive — Sun and H9 relatively well-placed'}` },
    mother: { factors: motherFactors, quality: motherQuality,
      summary: `Mother karma: ${motherQuality} | ${motherFactors.join(' | ') || 'Mother relationship nourishing — Moon and H4 relatively healthy'}` },
    summary: `FATHER: ${fatherQuality} | MOTHER: ${motherQuality}`
  };
}

// ── Business vs Job Engine ──
function getBusinessVsJobEngine(planets, lagnaIdx, dasha, allYogas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  let jobScore = 0, businessScore = 0;
  const jobIndicators = [], businessIndicators = [];

  // Job indicators: H6, H10, Saturn strong and regular
  const l6 = RASI_LORD[(lagnaIdx+5)%12], l10 = RASI_LORD[(lagnaIdx+9)%12];
  if ([1,4,7,10].includes(H('Saturn'))) { jobScore+=2; jobIndicators.push('Saturn in Kendra — disciplined service orientation'); }
  if ([1,4,7,10].includes(H(l10))) { jobScore+=2; jobIndicators.push(`10th lord ${l10} in Kendra — career in established institutions`); }
  if (H('Saturn')===10||H('Saturn')===6) { jobScore+=2; jobIndicators.push(`Saturn in H${H('Saturn')} — service/employment strongly indicated`); }
  if (ST('Saturn').includes('Exalted')||ST('Saturn').includes('Own')) { jobScore++; jobIndicators.push('Saturn strong — reliable employee, rises through seniority'); }

  // Business indicators: H7, H11, Mercury, Rahu, 3rd lord
  const l7 = RASI_LORD[(lagnaIdx+6)%12], l3 = RASI_LORD[(lagnaIdx+2)%12];
  if ([1,4,7,10].includes(H('Mercury'))) { businessScore+=2; businessIndicators.push('Mercury in Kendra — sharp business mind'); }
  if ([7,11].includes(H('Rahu'))) { businessScore+=2; businessIndicators.push(`Rahu in H${H('Rahu')} — unconventional business path, partnerships`); }
  if ([7,11].includes(H(l3))) { businessScore++; businessIndicators.push(`3rd lord ${l3} in H${H(l3)} — initiative and self-employment drive`); }
  if ([1,4,7,10].includes(H(l7))) { businessScore++; businessIndicators.push(`7th lord ${l7} in Kendra — business partnerships favored`); }
  if (allYogas.some(y=>y.name.includes('Ruchaka'))) { businessScore+=2; businessIndicators.push('Ruchaka Yoga — self-made leadership, independent enterprise'); }
  if (ST('Mercury').includes('Exalted')) { businessScore+=2; businessIndicators.push('Mercury exalted — exceptional business acumen'); }
  if (H('Jupiter')===11||(planets.Jupiter?.aspects||[]).includes(11)) { businessScore++; businessIndicators.push('Jupiter activates H11 — income through multiple channels'); }

  const verdict = businessScore > jobScore + 1 ? 'Business/Self-employment more suitable'
    : jobScore > businessScore + 1 ? 'Employment/Service career more suitable'
    : 'Hybrid path — both service and independent projects can work';

  return {
    jobScore, businessScore, verdict, jobIndicators, businessIndicators,
    summary: `${verdict} | Job score: ${jobScore} | Business score: ${businessScore} | Job: ${jobIndicators.join(', ')||'weak'} | Business: ${businessIndicators.join(', ')||'weak'}`
  };
}

// ── Loss Engine (where energy leaks) ──
function getLossEngine(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const leaks = [];

  const l12 = RASI_LORD[(lagnaIdx+11)%12];
  // Money leaks
  if ([6,8,12].includes(H(RASI_LORD[(lagnaIdx+1)%12]))) leaks.push('Money leak: 2nd lord in dusthana — wealth flows out faster than it accumulates');
  if (H(l12)===2) leaks.push('Money leak: 12th lord in H2 — spending exceeds saving, careful budgeting needed');
  if (planets.Ketu && [2,11].includes(H('Ketu'))) leaks.push('Money leak: Ketu in wealth house — irregular earnings, detachment from accumulation');
  // Relationship leaks
  if (planets.Venus?.combust) leaks.push('Relationship leak: Venus combust — love relationships feel suppressed or confused, energy dissipated');
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10) leaks.push('Relationship leak: Rahu-Venus — obsessive attractions drain emotional energy');
  // Mental/energy leaks
  const moonH = H('Moon');
  if ([6,8,12].includes(moonH)) leaks.push(`Mental energy leak: Moon in H${moonH} — emotional processing consumes significant energy, rest needed`);
  if (H('Saturn')===12) leaks.push('Spiritual/material leak: Saturn in H12 — energy invested in isolation, foreign places, or hidden work');
  // Physical leaks
  if (H('Mars')===12) leaks.push('Physical energy leak: Mars in H12 — strength spent in hidden/foreign contexts, restless sleep');
  // Combustion of benefics
  const combustBenefics = ['Jupiter','Venus','Moon'].filter(n => planets[n]?.combust);
  if (combustBenefics.length > 0) leaks.push(`Benefic power leak: ${combustBenefics.join('+')} combust — natural gifts suppressed`);

  return {
    leaks,
    summary: leaks.length ? `Energy leaks detected (${leaks.length}): ${leaks.join(' | ')}` : 'No major energy leaks — chart retains its gains relatively well'
  };
}

// ── Reputation / Fame Engine ──
function getReputationEngine(planets, lagnaIdx, dasha, allYogas, karakas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const indicators = [];
  let score = 0;

  const l10 = RASI_LORD[(lagnaIdx+9)%12];
  const amk = karakas?.Amatyakaraka;
  const ak = karakas?.Atmakaraka;

  // Fame indicators
  if (ST('Sun').includes('Exalted')||ST('Sun').includes('Own')) { score+=15; indicators.push('Sun exalted/own — natural authority, public visibility'); }
  if ([1,4,7,10].includes(H('Rahu'))) { score+=10; indicators.push(`Rahu in H${H('Rahu')} — rises to public prominence, unconventional fame`); }
  if ([1,4,7,10].includes(H(l10))) { score+=15; indicators.push(`10th lord ${l10} in Kendra — career achievements become widely known`); }
  if (allYogas.some(y=>y.name.includes('Pancha Mahapurusha')||y.name.includes('Raja')||y.name.includes('Lakshmi'))) { score+=15; indicators.push('Raja/Lakshmi Yoga — deserved recognition, authority'); }
  if (amk && (ST(amk).includes('Exalted')||ST(amk).includes('Own'))) { score+=10; indicators.push(`Amatyakaraka ${amk} strong — career excellence brings recognition`); }
  if ((planets.Jupiter?.aspects||[]).includes(10)||H('Jupiter')===10) { score+=10; indicators.push('Jupiter influences H10 — respected in profession'); }
  // Scandal risk
  if ([7,8].includes(H('Rahu'))) indicators.push('Caution: Rahu in H7/H8 — reputation risk through relationships or hidden matters');
  if (H('Saturn')===10) { score+=5; indicators.push('Saturn in H10 — slow rise, earned reputation, lasting legacy'); }

  score = Math.min(100, score);
  const level = score >= 60 ? 'High fame potential' : score >= 35 ? 'Moderate public presence' : 'Private person — fame not strongly indicated';

  return {
    score, level, indicators,
    summary: `Reputation/Fame: ${level} (${score}/100) | ${indicators.join(' | ')}`
  };
}

// ── In-law Karma Engine ──
function getInLawKarmaEngine(planets, lagnaIdx, upapadaLagna, navamsa) {
  const H = name => planets[name]?.house || 0;
  const h8FromLagna = (lagnaIdx + 7) % 12; // 8th from Lagna = in-laws (spouse family = 7th house from 7th = 1st, but 8th shows in-law dynamics)
  // Classical: In-laws seen from H8 (2nd from 7th = 8th from Lagna)
  const l8 = RASI_LORD[h8FromLagna];
  const l8H = H(l8);
  const l8St = planets[l8]?.status || '';
  const indicators = [];

  if ([6,8,12].includes(l8H)) indicators.push(`8th lord ${l8} in H${l8H} — in-law relationship involves transformation, conflict possible`);
  if (l8St.includes('Exalted')||l8St.includes('Own')) indicators.push(`8th lord strong — in-laws are powerful family with resources`);
  if ((planets.Saturn?.aspects||[]).includes(8)) indicators.push('Saturn aspects H8 — in-law relationship involves duty, distance, or elder family authority');
  if ((planets.Mars?.aspects||[]).includes(8)) indicators.push('Mars aspects H8 — in-law friction, property disputes possible');
  if (upapadaLagna) {
    const ulLord = RASI_LORD[upapadaLagna.rasiIdx];
    if ([6,8,12].includes(H(ulLord))) indicators.push(`UL lord ${ulLord} in H${H(ulLord)} — marriage quality affected by in-law interference`);
  }

  const quality = indicators.filter(i=>i.includes('conflict')||i.includes('friction')||i.includes('interference')).length >= 2
    ? 'In-law relationship likely challenging' : 'In-law relationship mixed or supportive';

  return {
    l8, l8H, l8St, indicators, quality,
    summary: `In-law karma: ${quality} | ${indicators.join(' | ') || 'No major in-law conflict indicators'}`
  };
}

// ── Sibling Karma Engine ──
function getSiblingKarmaEngine(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const h3Sign = (lagnaIdx + 2) % 12;
  const l3 = RASI_LORD[h3Sign];
  const l3H = H(l3), l3St = ST(l3);
  const indicators = [];

  const h3Occupants = Object.entries(planets).filter(([,p])=>p.house===3).map(([n])=>n);
  if (h3Occupants.length > 0) indicators.push(`H3 contains ${h3Occupants.join(',')} — sibling themes strongly activated`);
  if ([6,8,12].includes(l3H)) indicators.push(`3rd lord ${l3} in H${l3H} — sibling relationship involves struggle or distance`);
  if (l3St.includes('Exalted')||l3St.includes('Own')) indicators.push(`3rd lord strong — supportive sibling dynamic, courage in communication`);
  const marsH = H('Mars');
  if (marsH===3) indicators.push('Mars in H3 — competitive with siblings, strong-willed in communication');
  if ([6,8,12].includes(marsH) && marsH!==3) indicators.push(`Mars in H${marsH} — energy conflicts with siblings or courage blocked`);
  if ((planets.Jupiter?.aspects||[]).includes(3)) indicators.push('Jupiter aspects H3 — sibling relationship eventually becomes supportive');

  return {
    l3, l3H, l3St, h3Occupants, indicators,
    summary: indicators.join(' | ') || 'Sibling relationship — 3rd house needs further analysis from house lord'
  };
}

// ── Debt / Litigation Engine ──
function getDebtLitigationEngine(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const indicators = [];
  let debtRisk = 0, litigationRisk = 0;

  const l6 = RASI_LORD[(lagnaIdx+5)%12], l8 = RASI_LORD[(lagnaIdx+7)%12];
  const l6H = H(l6), l8H = H(l8);

  // Debt indicators
  if ([1,4,7,10].includes(l6H)) { debtRisk+=15; indicators.push(`6th lord ${l6} in Kendra — service debts, loans, financial obligations prominent`); }
  if (H('Saturn')===6||H('Saturn')===12) { debtRisk+=10; indicators.push(`Saturn in H${H('Saturn')} — chronic debt tendency, slow repayment`); }
  if (H('Rahu')===6) { debtRisk+=15; indicators.push('Rahu in H6 — debt through unconventional means, foreign loans possible'); }
  if ((planets.Mars?.aspects||[]).includes(6)) { debtRisk+=10; indicators.push('Mars aspects H6 — aggressive debt collection or financial disputes'); }

  // Litigation indicators
  if (H('Mars')===6||(planets.Mars?.aspects||[]).includes(7)) { litigationRisk+=15; indicators.push('Mars activates H6/H7 — legal disputes with partners or enemies'); }
  if (H('Rahu')===7||(planets.Saturn?.aspects||[]).includes(7)) { litigationRisk+=10; indicators.push('Rahu/Saturn influence on H7 — partnership disputes possible'); }
  if (H(l6)===7||H(l6)===6) { litigationRisk+=10; indicators.push(`6th lord in H${H(l6)} — enemy activity, legal exposure`); }

  // Active periods
  const dangerPeriods = dasha.antardashas?.filter(a => {
    const aLord = a.lord;
    return H(aLord)===6 || H(aLord)===8 || aLord===l6 || aLord==='Rahu' || aLord==='Mars';
  }).map(a => `${dasha.current?.lord}–${a.lord} (${a.startDate.slice(0,7)})`)
    .slice(0,2) || [];

  return {
    debtRisk: Math.min(100, debtRisk),
    litigationRisk: Math.min(100, litigationRisk),
    indicators, dangerPeriods,
    summary: `Debt risk: ${debtRisk}/100 | Litigation risk: ${litigationRisk}/100 | ${indicators.join(' | ')||'No major debt/litigation indicators'} | Active periods: ${dangerPeriods.join(', ')||'none now'}`
  };
}

// ── Repeated Karma Detection (theme across D1/D9/D10/D7) ──
function getRepeatedKarmaDetection(planets, lagnaIdx, navamsa, d10, d7) {
  const H = name => planets[name]?.house || 0;
  const patterns = [];

  // Marriage struggle in D1 + D9
  const l7D1 = RASI_LORD[(lagnaIdx+6)%12];
  const l7D1InDust = [6,8,12].includes(H(l7D1));
  const d9LagnaIdx = navamsa?.lagna?.rasiIdx || 0;
  const l7D9 = RASI_LORD[(d9LagnaIdx+6)%12];
  const l7D9InDust = navamsa ? [6,8,12].includes(navamsa.planets?.[l7D9]?.house) : false;
  if (l7D1InDust && l7D9InDust)
    patterns.push({ theme: 'Marriage challenges', certainty: 'DESTINY PATTERN', count: 2,
      desc: 'Marriage challenges repeat in D1 AND D9 — this is a deep karmic pattern, not just a placement. Marriage requires conscious work.' });

  // Career strength in D1 + D10
  const l10D1 = RASI_LORD[(lagnaIdx+9)%12];
  const l10D1Strong = !([6,8,12].includes(H(l10D1))) && !planets[l10D1]?.combust;
  const l10D10 = d10 ? RASI_LORD[(d10.lagnaRasiIdx+9)%12] : null;
  const l10D10Strong = d10 && l10D10 ? !([6,8,12].includes(d10.planets?.[l10D10]?.house)) : false;
  if (l10D1Strong && l10D10Strong)
    patterns.push({ theme: 'Career strength', certainty: 'DESTINY PATTERN', count: 2,
      desc: 'Career strength repeats in D1 AND D10 — professional success is a destiny-level theme. Confidence in chosen career is warranted.' });

  // Wealth in D1 + D9
  const l2D1 = RASI_LORD[(lagnaIdx+1)%12];
  const l2D1Strong = !([6,8,12].includes(H(l2D1)));
  const d9VenusGood = navamsa?.planets?.Venus && !navamsa.planets.Venus.status.includes('Debilitated');
  if (l2D1Strong && d9VenusGood)
    patterns.push({ theme: 'Wealth accumulation possible', certainty: 'ELEVATED', count: 2,
      desc: 'Wealth promise in D1 confirmed by D9 Venus — financial themes are supported across charts.' });

  return {
    patterns,
    destinyPatterns: patterns.filter(p=>p.certainty==='DESTINY PATTERN'),
    summary: patterns.length
      ? patterns.map(p=>`[${p.certainty}] ${p.theme}: ${p.desc}`).join(' | ')
      : 'No strongly repeating karma patterns detected across divisional charts'
  };
}

module.exports.getParentKarmaEngine = getParentKarmaEngine;
module.exports.getBusinessVsJobEngine = getBusinessVsJobEngine;
module.exports.getLossEngine = getLossEngine;
module.exports.getReputationEngine = getReputationEngine;
module.exports.getInLawKarmaEngine = getInLawKarmaEngine;
module.exports.getSiblingKarmaEngine = getSiblingKarmaEngine;
module.exports.getDebtLitigationEngine = getDebtLitigationEngine;
module.exports.getRepeatedKarmaDetection = getRepeatedKarmaDetection;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 10: DEEP KARMA ENGINES
// ═══════════════════════════════════════════════════

// ── Kula Devata Recovery Engine ──
function getKulaDevataEngine(planets, lagnaIdx, karakas) {
  const ak = karakas?.Atmakaraka;
  const H = name => planets[name]?.house || 0;
  // Map AK to deity
  const AK_DEITY = {
    Sun: { deity: 'Shiva / Surya', temple: 'Chidambaram Natarajar Temple (Tamil Nadu)', mantra: 'Om Namah Shivaya', day: 'Sunday' },
    Moon: { deity: 'Devi / Shakti (Amman)', temple: 'Madurai Meenakshi Amman Temple', mantra: 'Om Aim Hreem Shreem', day: 'Monday' },
    Mars: { deity: 'Murugan / Skanda', temple: 'Palani Murugan Temple (Tamil Nadu)', mantra: 'Om Saravanabhava', day: 'Tuesday' },
    Mercury: { deity: 'Vishnu', temple: 'Srirangam Ranganathaswamy Temple', mantra: 'Om Namo Narayanaya', day: 'Wednesday' },
    Jupiter: { deity: 'Dakshinamurthy / Brihaspati', temple: 'Alangudi Guru Temple (Navagraha)', mantra: 'Om Graam Greem Graum Sah Guruve Namah', day: 'Thursday' },
    Venus: { deity: 'Lakshmi', temple: 'Mahalakshmi Temple Vellore', mantra: 'Om Shreem Mahalakshmiyei Namah', day: 'Friday' },
    Saturn: { deity: 'Ayyanar / Shani / Kala Bhairava', temple: 'Thirunallar Saniswara Temple (Tamil Nadu)', mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah', day: 'Saturday' },
    Rahu: { deity: 'Durga / Chinnamasta', temple: 'Thiruvannur Rahu Temple (Tamil Nadu)', mantra: 'Om Raam Rahave Namah', day: 'Saturday' },
    Ketu: { deity: 'Ganesha / Moksha deity', temple: 'Keezhperumpallam Ketu Temple (Navagraha)', mantra: 'Om Gam Ganapataye Namah', day: 'Tuesday' },
  };

  // 9th house lord deity
  const l9 = RASI_LORD[(lagnaIdx+8)%12];
  const l9Deity = AK_DEITY[l9] || AK_DEITY[ak] || AK_DEITY['Jupiter'];
  const akDeity = ak ? AK_DEITY[ak] : null;

  // Ketu house for spiritual anchor
  const ketuH = H('Ketu');
  let ancestralDeity = akDeity || l9Deity;

  return {
    primaryDeity: ancestralDeity?.deity || 'Ganesha',
    temple: ancestralDeity?.temple || 'Local Ganesha temple',
    mantra: ancestralDeity?.mantra || 'Om Gam Ganapataye Namah',
    day: ancestralDeity?.day || 'Tuesday',
    sourceAK: ak,
    source9thLord: l9,
    summary: `Kula Devata: ${ancestralDeity?.deity} (from AK ${ak} + 9th lord ${l9}) | Temple: ${ancestralDeity?.temple} | Mantra: ${ancestralDeity?.mantra} | Day: ${ancestralDeity?.day}`
  };
}

// ── Final Unfinished Sentence Engine ──
function getFinalUnfinishedSentence(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const sentences = [];

  const moonSatAspect = (planets.Saturn?.aspects||[]).includes(H('Moon'));
  const moonH = H('Moon');
  if (moonSatAspect || [6,8,12].includes(moonH))
    sentences.push({ pattern: 'Moon-Saturn', sentence: '"I was never truly held or seen for who I am."', weight: moonSatAspect ? 80 : 60 });

  const rahuNearVenus = Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0)) < 10;
  const venusH = H('Venus');
  if (rahuNearVenus || [8,12].includes(venusH))
    sentences.push({ pattern: 'Venus-Rahu', sentence: '"I kept chasing love that slipped away."', weight: rahuNearVenus ? 85 : 65 });

  const sunH = H('Sun');
  const ketuH = H('Ketu');
  if (Math.abs((planets.Ketu?.sid||0)-(planets.Sun?.sid||0)) < 10 || [6,8,12].includes(sunH))
    sentences.push({ pattern: 'Sun-Ketu', sentence: '"I was unseen — my light never fully recognized."', weight: 75 });

  const satKetuClose = Math.abs((planets.Saturn?.sid||0)-(planets.Ketu?.sid||0)) < 15;
  if (satKetuClose || (planets.Saturn?.bala >= 70 && [6,8,12].includes(H('Saturn'))))
    sentences.push({ pattern: 'Saturn-Ketu', sentence: '"I carried too much that was never mine to carry."', weight: 80 });

  const marsH = H('Mars');
  if ([1,5,9,10].includes(ketuH) && [1,6,8].includes(marsH))
    sentences.push({ pattern: 'Mars-Ketu', sentence: '"I fought hard but could not complete what I started."', weight: 70 });

  sentences.sort((a,b) => b.weight - a.weight);
  const primary = sentences[0] || { sentence: '"I did not fully live the life I came for."', weight: 50 };

  return {
    primarySentence: primary.sentence,
    pattern: primary.pattern,
    weight: primary.weight,
    allSentences: sentences,
    summary: `Final Unfinished Sentence: ${primary.sentence} (pattern: ${primary.pattern||'general'}, weight: ${primary.weight}/100)`
  };
}

// ── Soul Exhaustion Index ──
function getSoulExhaustionIndex(planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  let score = 0;
  const indicators = [];

  if (planets.Saturn?.bala >= 65) { score += 20; indicators.push('Saturn dominant — carries heavy burden'); }
  if ([6,8,12].includes(H('Ketu'))) { score += 20; indicators.push(`Ketu in H${H('Ketu')} — detached from material world, spiritual fatigue`); }
  const moonH = H('Moon');
  if ([8,12].includes(moonH)) { score += 15; indicators.push(`Moon in H${moonH} — emotional exhaustion, needs withdrawal`); }
  if ((planets.Saturn?.aspects||[]).includes(moonH)) { score += 15; indicators.push('Saturn aspects Moon — emotional heaviness, burden-bearing'); }
  const h12Count = Object.values(planets).filter(p=>p.house===12).length;
  if (h12Count >= 3) { score += 15; indicators.push(`${h12Count} planets in H12 — strong pull toward dissolution and rest`); }
  if (planets.Moon?.status.includes('Debilitated')) { score += 15; indicators.push('Moon debilitated — soul worn thin by emotional suffering'); }

  score = Math.min(100, score);
  const level = score >= 70 ? 'HIGH — old, tired soul; may feel "done" with worldly life early'
    : score >= 40 ? 'MODERATE — soul has been through much; needs regular withdrawal and silence'
    : 'LOW — relatively fresh incarnation energy; engaged with life';

  return {
    score, level, indicators,
    summary: `Soul Exhaustion: ${score}/100 — ${level} | ${indicators.join(' | ')}`
  };
}

// ── Vak Shakti Engine ──
function getVakShaktiEngine(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const ak = karakas?.Atmakaraka;
  let score = 0;
  const gifts = [], risks = [];

  if (H('Mercury')===2||H('Mercury')===1||(planets.Mercury?.aspects||[]).includes(2)) { score+=20; gifts.push('Mercury activates H2 — precise, impactful speech'); }
  if (ST('Mercury').includes('Exalted')||ST('Mercury').includes('Own')) { score+=20; gifts.push('Mercury strong — words carry weight and intelligence'); }
  if (H('Jupiter')===2||(planets.Jupiter?.aspects||[]).includes(2)) { score+=15; gifts.push('Jupiter influences H2 — wisdom in speech, blessing in words'); }
  if (ak === 'Mercury') { score+=15; gifts.push('Mercury as AK — speech is the soul vehicle, teaching/writing destiny'); }
  if (ak === 'Jupiter') { score+=10; gifts.push('Jupiter as AK — speech carries dharmic authority'); }
  // Risks
  if (H('Mars')===2||(planets.Mars?.aspects||[]).includes(2)) { risks.push('Mars influences H2 — speech can wound; anger in words'); }
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Mercury?.sid||0))<10) { risks.push('Rahu-Mercury — speech can mislead or attract deceit'); }
  if (H('Saturn')===2) { risks.push('Saturn in H2 — speech blocked, slow to express, deliberate'); }
  if (planets.Mercury?.combust) { risks.push('Mercury combust — ego suppresses clear expression'); }

  score = Math.min(100, score);
  return {
    score, gifts, risks,
    summary: `Vak Shakti (Speech Power): ${score}/100 | Gifts: ${gifts.join(', ')||'modest'} | Risks: ${risks.join(', ')||'none'}`
  };
}

// ── Sacred Sound Key (Beeja Resonance) ──
function getSacredSoundKey(nakshatra, karakas, lagnaIdx) {
  const ak = karakas?.Atmakaraka;
  // Nakshatra-based beeja
  const NAK_BEEJA = {
    'Ashwini':'Om','Bharani':'Aim','Krittika':'Hreem','Rohini':'Shreem',
    'Mrigashira':'Hreem','Ardra':'Om','Punarvasu':'Shreem','Pushya':'Aim',
    'Ashlesha':'Kleem','Magha':'Hreem','Purva Phalguni':'Shreem','Uttara Phalguni':'Om',
    'Hasta':'Aim','Chitra':'Hreem','Swati':'Shreem','Vishakha':'Om',
    'Anuradha':'Kleem','Jyeshtha':'Hreem','Mula':'Om','Purva Ashadha':'Hreem',
    'Uttara Ashadha':'Om','Shravana':'Aim','Dhanishtha':'Shreem','Shatabhisha':'Om',
    'Purva Bhadrapada':'Hreem','Uttara Bhadrapada':'Om','Revati':'Shreem'
  };
  // AK-based beeja
  const AK_BEEJA = {
    Sun:'Hraam Hreem Hraum','Moon':'Om Shreem','Mars':'Om Kraam Kreem',
    Mercury:'Aim Hreem Shreem','Jupiter':'Om Graam Greem','Venus':'Om Shreem Hreem Kleem',
    Saturn:'Om Praam Preem Praum','Rahu':'Om Raam','Ketu':'Om Gam'
  };
  const nakBeeja = NAK_BEEJA[nakshatra.name] || 'Om';
  const akBeeja = ak ? AK_BEEJA[ak] || 'Om' : 'Om';

  return {
    primaryBeeja: nakBeeja,
    akBeeja,
    fullMantricKey: `${nakBeeja} ${akBeeja}`,
    nakshatra: nakshatra.name,
    ak,
    summary: `Sacred Sound Key: Primary beeja from ${nakshatra.name} nakshatra = ${nakBeeja} | AK (${ak}) beeja = ${akBeeja} | Combined: ${nakBeeja} ${akBeeja}`
  };
}

// ── Drishti Shakti Engine (Susceptibility to external energy) ──
function getDrishtiShaktiEngine(planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  let score = 0;
  const factors = [];

  const moonH = H('Moon');
  if (planets.Moon?.bala < 40) { score+=25; factors.push('Moon weak — absorbs external emotions and energies heavily'); }
  if ((planets.Saturn?.aspects||[]).includes(1)||(planets.Rahu?.house||0)===1) { score+=20; factors.push('Malefic on Lagna — aura vulnerable to external negativity'); }
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10) { score+=15; factors.push('Rahu-Venus — attracts jealousy, particularly around beauty/success'); }
  if (planets.Lagna?.lord && planets[planets.Lagna?.lord]?.combust) { score+=15; factors.push('Lagna lord combust — protective aura reduced'); }
  const moonNearRahu = Math.abs((planets.Rahu?.sid||0)-(planets.Moon?.sid||0))<15;
  if (moonNearRahu) { score+=20; factors.push('Rahu near Moon — highly sensitive to others thoughts/emotions'); }

  score = Math.min(100, score);
  const level = score>=60?'HIGH — take care around negative environments, protect the aura consciously':
    score>=30?'MODERATE — situationally sensitive, especially during stress':
    'LOW — relatively protected aura, less affected by external energy';

  return { score, level, factors,
    summary: `Drishti Shakti susceptibility: ${level} (${score}/100) | ${factors.join(' | ')||'Aura relatively protected'}` };
}

// ── Swapna Engine (Dream Karma) ──
function getSwapnaEngine(planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  const dreamPatterns = [];

  const moonH = H('Moon'), ketuH = H('Ketu');
  if ([12,8].includes(moonH)) dreamPatterns.push('Active dream life — Moon in H'+moonH+' makes dream world vivid and karmic');
  if (Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10) dreamPatterns.push('Ketu conjunct Moon — ancestors and past-life figures visit in dreams');
  if (H('Ketu')===12) dreamPatterns.push('Ketu in H12 — strong connection to astral realm, mystical dreams');
  const h12Planets = Object.values(planets).filter(p=>p.house===12);
  if (h12Planets.length >= 2) dreamPatterns.push(`${h12Planets.length} planets in H12 — sleep and dream states are karmic processing time`);
  if ((planets.Saturn?.aspects||[]).includes(moonH)) dreamPatterns.push('Saturn aspects Moon — recurring heavy or teaching dreams, karmic processing during sleep');
  if (H('Rahu')===12) dreamPatterns.push('Rahu in H12 — unusual dream states, prophetic or confusing dreams, spiritual experiences during sleep');

  const dreamType = dreamPatterns.length >= 3 ? 'ACTIVE dream karma — dreams carry significant karmic messages'
    : dreamPatterns.length >= 1 ? 'MODERATE dream activity — occasional meaningful dreams'
    : 'Standard dream life — no strong karmic dream indicators';

  return { dreamPatterns, dreamType,
    summary: `Swapna (Dream Karma): ${dreamType} | ${dreamPatterns.join(' | ')||'No strong dream karma indicators'}` };
}

// ── Guru Arrival Timing Engine ──
function getGuruArrivalEngine(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const jupH = H('Jupiter');
  const l9 = RASI_LORD[(lagnaIdx+8)%12];
  const indicators = [];
  let guruLikely = false;

  if ([1,4,5,9].includes(jupH)) { guruLikely=true; indicators.push(`Jupiter in H${jupH} — guru appears naturally, through education or dharmic context`); }
  if (planets.Jupiter?.status.includes('Exalted')) { guruLikely=true; indicators.push('Jupiter exalted — blessed by teachers, guru connection is strong'); }
  if ((planets.Jupiter?.aspects||[]).includes(9)||(planets.Jupiter?.aspects||[]).includes(5)) { guruLikely=true; indicators.push('Jupiter aspects H5/H9 — teaching lineage accessible'); }

  // Timing windows
  const guruWindows = dasha.dashaSequence?.filter(ds => ds.lord === 'Jupiter' || ds.lord === l9)
    .map(ds => `${ds.lord} Dasha (${ds.startDate.slice(0,4)}–${ds.endDate.slice(0,4)})`)
    .slice(0,2) || [];

  // Type of guru
  const guruType = planets.Jupiter?.status.includes('Exalted') ? 'Rare master — classical spiritual teacher' :
    [1,5,9].includes(jupH) ? 'Mentor/guide — appears through life naturally' :
    [6,8,12].includes(jupH) ? 'Guru through suffering — teacher arrives during crisis' :
    'Guru arrives in mature phase of life';

  return { guruLikely, guruType, guruWindows, indicators,
    summary: `Guru arrival: ${guruType} | Likely timing: ${guruWindows.join(', ')||'when ready'} | ${indicators.join(' | ')||'Guru connection moderate'}` };
}

// ── Hidden Enemy Engine ──
function getHiddenEnemyEngine(planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  const indicators = [];

  const l12 = RASI_LORD[(lagnaIdx+11)%12];
  const l6 = RASI_LORD[(lagnaIdx+5)%12];
  // 12th lord connection to personal houses = betrayal from close circle
  if ([1,2,4,7].includes(H(l12))) indicators.push(`12th lord ${l12} in H${H(l12)} — enemy operates close to home, possibly disguised as friend or family`);
  // 6th lord in 4th = family enemy
  if (H(l6)===4) indicators.push(`6th lord ${l6} in H4 — hidden opposition from within the home/family`);
  // Rahu in 7th or 4th = hidden betrayal through intimate person
  if (H('Rahu')===7) indicators.push('Rahu in H7 — partner or close associate may harbor hidden agenda');
  if (H('Rahu')===4) indicators.push('Rahu in H4 — family member or home environment source of hidden stress');
  // Ketu in 7th
  if (H('Ketu')===7) indicators.push('Ketu in H7 — karmic connection with partner; old soul recognizes them but may be deceived');
  // Saturn + H4 = family obstruction
  if (H('Saturn')===4||(planets.Saturn?.aspects||[]).includes(4)) indicators.push('Saturn influences H4 — restrictive force in home environment, possible elder family opposition');
  // Mars in 12th
  if (H('Mars')===12) indicators.push('Mars in H12 — hidden anger from close persons, secret opposition');

  return { indicators,
    summary: indicators.length >= 2
      ? `Hidden enemy pattern (${indicators.length} indicators): ${indicators.join(' | ')}`
      : 'No strong hidden enemy indicators — opposition likely from known sources' };
}

// ── Sacred Fear Engine ──
function getSacredFearEngine(planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  const fears = [];

  // Abandonment (Moon-Saturn/Ketu)
  const moonH = H('Moon');
  if ((planets.Saturn?.aspects||[]).includes(moonH)||(planets.Ketu?.aspects||[]).includes(moonH)||[8,12].includes(moonH))
    fears.push({ type: 'Abandonment', weight: 85, desc: 'Fear of being left alone — drives over-attachment or premature detachment to avoid pain' });

  // Poverty (H2/H11 weak)
  const l2 = RASI_LORD[(lagnaIdx+1)%12];
  if ([6,8,12].includes(H(l2)) && planets[l2]?.bala < 45)
    fears.push({ type: 'Poverty/Scarcity', weight: 75, desc: 'Fear of financial loss — may hoard, over-save, or take extreme risks to avoid poverty feeling' });

  // Betrayal (Rahu-Venus or Saturn-H7)
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10 || H('Saturn')===7)
    fears.push({ type: 'Betrayal', weight: 80, desc: 'Fear of being betrayed in love or trust — creates tests, walls, or repeated suspicious patterns' });

  // Humiliation (Sun afflicted)
  const sunH = H('Sun');
  if ([6,8,12].includes(sunH)||(planets.Saturn?.aspects||[]).includes(sunH))
    fears.push({ type: 'Humiliation', weight: 70, desc: 'Fear of public failure or loss of dignity — avoids exposure, perfectionism, or self-sabotage before others see failure' });

  // Powerlessness (Saturn-Lagna or weak Lagna lord)
  const lagnaLord = RASI_LORD[lagnaIdx];
  if ((planets.Saturn?.aspects||[]).includes(1)||[6,8,12].includes(H(lagnaLord)))
    fears.push({ type: 'Powerlessness', weight: 75, desc: 'Fear of losing control — over-controls environment or collapses when control is lost' });

  fears.sort((a,b) => b.weight - a.weight);
  const primary = fears[0];

  return { fears, primaryFear: primary?.type || 'No dominant fear pattern',
    summary: primary
      ? `Primary karmic fear: ${primary.type} (weight ${primary.weight}/100) — ${primary.desc} | Secondary: ${fears[1]?.type||'none'}`
      : 'No dominant sacred fear pattern identified' };
}

// ── Divine Protection Engine ──
function getDivineProtectionEngine(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const protections = [];

  // Jupiter in Kendra = strongest protection
  if ([1,4,7,10].includes(H('Jupiter'))) protections.push(`Jupiter in H${H('Jupiter')} (Kendra) — divine grace operates continuously; invisible protection active throughout life`);
  // Vipareeta Raja = rises from destruction
  if (yogas.some(y=>y.name.includes('Vipareeta'))) protections.push('Vipareeta Raja Yoga — this soul is built to survive what should destroy it; falls become launches');
  // 9th lord strong
  const l9 = RASI_LORD[(lagnaIdx+8)%12];
  if (planets[l9]?.status.includes('Exalted')||planets[l9]?.status.includes('Own')) protections.push(`9th lord ${l9} strong — divine luck and dharmic protection; ancestral merit covers gaps`);
  // Vargottama planets
  const vargottamaList = Object.entries(planets).filter(([,p])=>p.rasiIdx===p.navamsaRasiIdx).map(([n])=>n);
  if (vargottamaList.length > 0) protections.push(`${vargottamaList.join(',')} Vargottama — these planets carry extra protection; D9 strength saves what D1 risks`);
  // Pushkara planets
  // Gajakesari
  if (yogas.some(y=>y.name.includes('Gajakesari'))) protections.push('Gajakesari Yoga — Moon-Jupiter alignment creates ongoing divine grace and public goodwill');
  // Strong Moon
  if (planets.Moon?.status.includes('Exalted')||planets.Moon?.status.includes('Own')) protections.push('Moon exalted/own — emotional protection strong; people and mother figures provide rescue');

  return { protections,
    summary: protections.length
      ? `Divine protection sources (${protections.length}): ${protections.join(' | ')}`
      : 'Divine protection comes through effort and discipline rather than visible grace' };
}

// ── Pre-Birth Choice Engine ──
function getPreBirthChoiceEngine(planets, lagnaIdx, nakshatra, karakas) {
  const H = name => planets[name]?.house || 0;
  const ak = karakas?.Atmakaraka;

  // Why these parents: 4th lord + 9th lord condition
  const l4 = RASI_LORD[(lagnaIdx+3)%12], l9 = RASI_LORD[(lagnaIdx+8)%12];
  const parentChoice = [6,8,12].includes(H(l4)) || [6,8,12].includes(H(l9))
    ? 'Parents chosen for karmic challenge — this birth required specific friction to activate soul lessons'
    : 'Parents chosen for karmic support — this birth required stability as a launchpad';

  // Why this pain type
  const painType = planets[ak]?.status.includes('Debilitated') ? `Soul chose ${ak}-type suffering to master ${ak} significations through lived experience`
    : `Soul chose to strengthen ${ak} significations — current life is the testing ground for ${ak} mastery`;

  // Why this nakshatra
  const nakshatraChoice = `Born in ${nakshatra.name} (lord: ${nakshatra.lord}) — soul chose this frequency to work through ${nakshatra.lord}-type karma`;

  // Why this lagna
  const LAGNA_CHOICE = {
    Mesha:'to develop initiative and courage', Rishabha:'to master material stability and patience',
    Mithuna:'to develop communication and adaptability', Kataka:'to learn emotional boundaries',
    Simha:'to develop authentic authority', Kanya:'to master discernment and service',
    Tula:'to learn balance and right relationships', Vrischika:'to master transformation and depth',
    Dhanu:'to develop wisdom and dharmic alignment', Makara:'to master discipline and long-term success',
    Kumbha:'to develop collective consciousness', Meena:'to dissolve ego and access compassion'
  };

  return {
    parentChoice, painType, nakshatraChoice,
    lagnaChoice: LAGNA_CHOICE[RASI_NAMES[lagnaIdx]] || 'to master this specific combination of life challenges',
    summary: `Pre-birth choices: ${parentChoice} | ${painType} | ${nakshatraChoice}`
  };
}

// ── One Event That Breaks The Self ──
function getBreakingEventEngine(planets, lagnaIdx, dasha) {
  const H = name => planets[name]?.house || 0;
  const candidates = [];

  // 8th lord strong period
  const l8 = RASI_LORD[(lagnaIdx+7)%12];
  const l8H = H(l8);
  dasha.dashaSequence?.forEach(ds => {
    if (ds.lord === l8 || ds.lord === 'Rahu' || ds.lord === 'Ketu') {
      const age = Math.floor((new Date(ds.startDate) - new Date(dasha.dashaSequence[0].startDate)) / (365.25*24*3600*1000));
      if (age > 10 && age < 60) {
        candidates.push({ period: ds.lord+' Dasha ('+ds.startDate.slice(0,7)+')',
          age, type: ds.lord === l8 ? '8th lord — deep transformation' : ds.lord+' — karmic disruption',
          desc: `${ds.lord} Dasha at age ${age} — potential identity-shattering period, old self cannot survive this transit unchanged` });
      }
    }
  });

  // Saturn return periods (strongest breaking events)
  const birthYear = new Date(dasha.dashaSequence?.[0]?.startDate || '2000').getFullYear();
  [29,58].forEach(age => {
    candidates.push({ period: `Age ${age}`, age, type: 'Saturn Return',
      desc: `Saturn Return at age ${age} — structural dismantling of old identity, forced reinvention` });
  });

  candidates.sort((a,b) => {
    const now = Date.now();
    const aTime = Math.abs(a.age - 30); // prefer events around age 25-40
    const bTime = Math.abs(b.age - 30);
    return aTime - bTime;
  });

  const primary = candidates[0];
  return { candidates: candidates.slice(0,3), primary,
    summary: primary ? `Breaking event: ${primary.period} — ${primary.desc}` : 'No single shattering event identified — transformation comes through slow pressure' };
}

// ── Death Purpose Engine ──
function getDeathPurposeEngine(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const ak = karakas?.Atmakaraka;
  const l12 = RASI_LORD[(lagnaIdx+11)%12];

  // What must be complete before exit?
  const completions = [];
  if ([5,9].includes(H(ak ? ak : 'Jupiter'))) completions.push('Teaching or knowledge must be transmitted — wisdom cannot leave with you');
  if (planets.Jupiter?.status.includes('Exalted') && [1,5,9,10].includes(H('Jupiter'))) completions.push('Service must be rendered — this soul owes contribution before exit');
  if ([8,12].includes(H('Ketu')) || planets.Ketu?.status.includes('Exalted')) completions.push('Spiritual attainment — the soul came to reach a specific level of inner clarity');
  if ([1,4,7,10].includes(H(RASI_LORD[(lagnaIdx+4)%12]))) completions.push('A child or creative legacy must be established and stabilized');
  if ((planets.Saturn?.bala||0) >= 65) completions.push('A structural work must be completed and left standing — Saturn demands visible legacy');
  // Forgiveness/release
  if ((planets.Saturn?.aspects||[]).includes(H('Moon')) || H('Ketu')===7) completions.push('A specific forgiveness or release — the soul carries an unresolved bond that must be cleared');

  return { completions,
    summary: completions.length
      ? `Death purpose — what must complete before exit: ${completions.join(' | ')}`
      : 'Purpose is to live fully and consciously — no single uncompleted task identified' };
}

// ── Shakti Awakening Trigger ──
function getShaktiAwakeningEngine(planets, lagnaIdx, yogas) {
  const H = name => planets[name]?.house || 0;
  const triggers = [];

  if ([6,8,12].includes(H('Venus')) || planets.Venus?.combust)
    triggers.push({ trigger: 'Heartbreak', desc: 'Loss in love becomes the doorway — the wound opens what comfort kept closed' });
  if ((planets.Saturn?.aspects||[]).includes(H('Moon')) || H('Saturn')===1)
    triggers.push({ trigger: 'Humiliation or heavy responsibility', desc: 'Being brought low or bearing impossible weight breaks the ego-shell and releases real power' });
  if (H('Ketu')===1 || H('Ketu')===5 || H('Ketu')===9)
    triggers.push({ trigger: 'Exile or isolation', desc: 'Withdrawal from the world — forced or chosen — becomes the incubation of real awakening' });
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Moon?.sid||0))<15)
    triggers.push({ trigger: 'Betrayal', desc: 'When trusted person shatters the illusion — the shock opens the karmic gate' });
  if ([1,4,5,9].includes(H('Jupiter')))
    triggers.push({ trigger: 'Guru meeting', desc: 'A specific teacher activates what could not open alone — this chart has strong guru karma' });
  if (yogas.some(y=>y.name.includes('Vipareeta')))
    triggers.push({ trigger: 'Destruction of what was built', desc: 'Loss of position, wealth, or status becomes the liberation — Vipareeta yoga rises from collapse' });

  const primary = triggers[0];
  return { triggers, primaryTrigger: primary?.trigger || 'Slow inner pressure',
    summary: primary ? `Shakti awakening trigger: ${primary.trigger} — ${primary.desc}` : 'Awakening comes through gradual deepening rather than single trigger' };
}

// ── Shadow Inheritance Engine ──
function getShadowInheritance(planets, lagnaIdx) {
  const H = name => planets[name]?.house || 0;
  const shadows = [];

  const moonH = H('Moon');
  if ((planets.Saturn?.aspects||[]).includes(moonH)) shadows.push({ trait: 'Emotional coldness or suppression', source: 'Maternal line', desc: 'Difficulty expressing warmth — inherited from mother or grandmother' });
  if (H('Rahu')===4||(planets.Saturn?.aspects||[]).includes(4)) shadows.push({ trait: 'Anxiety and hypervigilance', source: 'Home lineage', desc: 'Nervous system tuned to danger — inherited from whoever survived hardship in the family' });
  if (planets.Saturn?.bala >= 65 && [6,8,12].includes(H('Saturn'))) shadows.push({ trait: 'Martyrdom pattern', source: 'Paternal line', desc: 'Tendency to sacrifice self beyond what is needed — family pattern of carrying others burdens' });
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10) shadows.push({ trait: 'Obsessive attachment in love', source: 'Ancestral pattern', desc: 'Someone in the lineage loved compulsively — this pattern echoes forward' });
  if (H('Ketu')===4||H('Ketu')===9) shadows.push({ trait: 'Disconnection from roots', source: 'Family karma', desc: 'A break in the ancestral chain — either migration, death, or abandonment that disconnects from origins' });

  return { shadows,
    summary: shadows.length
      ? `Shadow inheritance (${shadows.length}): ${shadows.map(s=>`${s.trait} (${s.source})`).join(' | ')}`
      : 'No strong shadow inheritance patterns identified' };
}

// ── Person To Forgive Engine ──
function getPersonToForgiveEngine(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const candidates = [];

  const sunH = H('Sun');
  if ([6,8,12].includes(sunH)||(planets.Saturn?.aspects||[]).includes(sunH)) candidates.push({ person: 'Father or authority figure', weight: 85, desc: 'Sun affliction — holding father wound keeps self-authority blocked' });
  const moonH = H('Moon');
  if ([6,8,12].includes(moonH)||(planets.Saturn?.aspects||[]).includes(moonH)) candidates.push({ person: 'Mother or primary caregiver', weight: 80, desc: 'Moon affliction — unresolved mother karma blocks emotional openness' });
  if (H('Saturn')===7 || planets.Venus?.combust || [6,8,12].includes(H('Venus'))) candidates.push({ person: 'Past romantic partner', weight: 75, desc: 'Venus/H7 affliction — old love wound keeps heart guarded against real intimacy' });
  if (H('Saturn')===3 || H('Mars')===3) candidates.push({ person: 'Sibling', weight: 65, desc: 'H3 affliction — sibling competition or betrayal holds unexpressed anger' });
  // Self-forgiveness if Ketu in 1st
  if (H('Ketu')===1) candidates.push({ person: 'Self', weight: 90, desc: 'Ketu in H1 — deepest unforgiven person is the self; self-judgment blocks all outer relationships' });

  candidates.sort((a,b) => b.weight - a.weight);
  const primary = candidates[0];

  return { candidates, primary,
    summary: primary ? `Person to forgive: ${primary.person} (weight ${primary.weight}/100) — ${primary.desc}` : 'Forgiveness work distributed — no single dominant stuck relationship' };
}

// ── Life You Almost Lived ──
function getLifeAlmostLived(planets, lagnaIdx, yogas, dasha) {
  const H = name => planets[name]?.house || 0;
  const diverted = [];

  // Strong yogas that may not manifest
  if (yogas.some(y=>y.name.includes('Pancha Mahapurusha')) && planets.Mars?.status.includes('Exalted'))
    diverted.push('Military/athletic/leadership career that was possible but likely diverted by family or circumstance');
  if (yogas.some(y=>y.name.includes('Hamsa')) && H('Jupiter')===7)
    diverted.push('Spiritual teaching path — Jupiter in H7 exalted creates the teacher but life may have pulled toward marriage/career instead');
  if (yogas.some(y=>y.name.includes('Lakshmi')))
    diverted.push('Exceptional wealth accumulation that was cosmically seeded but required specific dasha alignment to manifest');
  if (planets.Venus?.status.includes('Exalted') && [6,8,12].includes(H('Venus')))
    diverted.push('Creative or artistic life — Venus has the gift but its house placement suggests this was sacrificed or suppressed');
  // Foreign life that almost happened
  if (H('Rahu')===9 || H('Rahu')===12)
    diverted.push('Life in foreign country — Rahu in 9/12 pulled strongly toward abroad but birth circumstances may have kept you here');

  return { diverted,
    summary: diverted.length
      ? `Life you almost lived: ${diverted.join(' | ')}`
      : 'The life being lived aligns with the strongest karma — no major diverted path identified' };
}

// ── Time of Day Karma ──
function getTimeOfDayKarma(tob, lagna) {
  const [hours, mins] = tob.split(':').map(Number);
  const totalMins = hours * 60 + mins;
  const lagnaDegs = lagna.degInRasi;

  const SANDHI_GATES = [
    { name: 'Brahma Muhurta (pre-dawn)', range: [240, 300], karma: 'born with heightened spiritual sensitivity, meditative mind, connected to divine timing' },
    { name: 'Dawn (Sunrise)', range: [300, 360], karma: 'Solar birth — clarity, leadership, visibility; life moves toward light' },
    { name: 'Morning', range: [360, 480], karma: 'Action-oriented birth — life rewards effort, initiative, and direct engagement' },
    { name: 'Noon', range: [660, 780], karma: 'Peak Sun birth — ambitious, visible, authority-seeking; must manage ego carefully' },
    { name: 'Dusk (Sunset)', range: [1020, 1080], karma: 'Twilight birth — dual nature, transitional, bridge between worlds; sensitive to endings' },
    { name: 'Night', range: [1200, 1440], karma: 'Lunar birth — intuitive, hidden depths, inner life richer than outer; thrives in reflection' },
    { name: 'Midnight', range: [1380, 1440], karma: 'Midnight birth — Ketu nature; deep spiritual intensity, detachment, transformation through darkness' },
  ];

  const gate = SANDHI_GATES.find(g => totalMins >= g.range[0] && totalMins < g.range[1]);
  const isSandhi = lagnaDegs < 3 || lagnaDegs > 27;

  return {
    birthTime: tob,
    birthGate: gate?.name || 'Standard daytime',
    karma: gate?.karma || 'Regular life rhythm — birth time not at a special gate',
    isSandhi, lagnaDegs: lagnaDegs.toFixed(2),
    summary: `Time of day karma: ${gate?.name||'Standard'} — ${gate?.karma||'regular life rhythm'}${isSandhi ? ' | SANDHI BIRTH: Lagna at cusp — heightened sensitivity, identity in transition' : ''}`
  };
}

module.exports.getKulaDevataEngine = getKulaDevataEngine;
module.exports.getFinalUnfinishedSentence = getFinalUnfinishedSentence;
module.exports.getSoulExhaustionIndex = getSoulExhaustionIndex;
module.exports.getVakShaktiEngine = getVakShaktiEngine;
module.exports.getSacredSoundKey = getSacredSoundKey;
module.exports.getDrishtiShaktiEngine = getDrishtiShaktiEngine;
module.exports.getSwapnaEngine = getSwapnaEngine;
module.exports.getGuruArrivalEngine = getGuruArrivalEngine;
module.exports.getHiddenEnemyEngine = getHiddenEnemyEngine;
module.exports.getSacredFearEngine = getSacredFearEngine;
module.exports.getDivineProtectionEngine = getDivineProtectionEngine;
module.exports.getPreBirthChoiceEngine = getPreBirthChoiceEngine;
module.exports.getBreakingEventEngine = getBreakingEventEngine;
module.exports.getDeathPurposeEngine = getDeathPurposeEngine;
module.exports.getShaktiAwakeningEngine = getShaktiAwakeningEngine;
module.exports.getShadowInheritance = getShadowInheritance;
module.exports.getPersonToForgiveEngine = getPersonToForgiveEngine;
module.exports.getLifeAlmostLived = getLifeAlmostLived;
module.exports.getTimeOfDayKarma = getTimeOfDayKarma;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 11: DIVINE ARCHITECTURE + COSMIC MEMORY
// ═══════════════════════════════════════════════════

function getDivineArchitectureEngines(planets, lagnaIdx, karakas, allYogas, dasha) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 171. Soul Poison — dominant repeating destroyer
  const SOUL_POISON_MAP = {
    Mars: 'anger and aggression — the destroyer is uncontrolled force',
    Venus: 'attachment and craving — the destroyer is desire for love/pleasure',
    Rahu: 'obsession and delusion — the destroyer is the mind that cannot stop wanting',
    Saturn: 'fear and despair — the destroyer is contraction and hopelessness',
    Moon: 'emotional dependency — the destroyer is need for others to complete you',
    Mercury: 'overthinking — the destroyer is the mind that analyzes instead of acts',
    Sun: 'ego and pride — the destroyer is the need to be seen as superior'
  };
  const h6Planets = Object.entries(planets).filter(([,p])=>p.house===6).map(([n])=>n);
  const malefics = ['Mars','Saturn','Rahu','Ketu'].filter(n=>![6,8,12].includes(H(n)) === false);
  const strongMalefic = ['Rahu','Saturn','Mars','Ketu'].find(n => B(n) >= 55 || [1,4,7,10].includes(H(n)));
  const soulPoison = SOUL_POISON_MAP[strongMalefic||'Saturn'] || 'fear and contraction';

  // 172. Dharma Collapse Trigger
  const h9H = H('Rahu'), satH = H('Saturn');
  const dharmaCollapse = H('Rahu')===9 ? 'temptation collapses dharma — Rahu on 9th house creates repeated ethical failures through desire'
    : planets.Venus?.combust ? 'love collapse — Venus combust creates dharma breaks through relationship choices'
    : H('Mars')===9 ? 'rage collapse — Mars on 9th house breaks dharma through impulsive aggression'
    : [6,8,12].includes(H('Saturn')) ? 'despair collapse — Saturn in dusthana creates periodic hopelessness that breaks alignment'
    : 'dharma is relatively stable — no strong collapse trigger identified';

  // 173. Dharma Return Trigger
  const jupH = H('Jupiter');
  const dharmaReturn = ST('Jupiter').includes('Exalted') ? 'guru — exceptional teacher or wisdom tradition restores alignment'
    : H('Ketu')===9 ? 'loss triggers return — major loss or detachment restores dharmic clarity'
    : ST('Saturn').includes('Exalted')||ST('Saturn').includes('Own') ? 'suffering — hitting bottom restores alignment; Saturn teaches through pressure'
    : [6,8,12].includes(H('Moon')) ? 'emotional collapse — deep feeling states return this soul to its true path'
    : 'Jupiter transit over 9th lord — specific periods restore dharmic clarity';

  // 174. Soul Contract With God
  const AK_CONTRACT = {
    Sun:'direct authority over one specific domain — to be a leader who serves light',
    Moon:'to nourish and hold emotional truth for others — divine mother archetype',
    Mars:'to fight for what is right and protect the weak — divine warrior contract',
    Mercury:'to transmit knowledge and connect souls — divine messenger contract',
    Jupiter:'to teach and expand consciousness — divine wisdom bearer contract',
    Venus:'to create beauty and harmony in a broken world — divine artist/harmonizer contract',
    Saturn:'to build lasting structures and endure — divine architect contract',
    Rahu:'to break old patterns and introduce new consciousness — divine disruptor contract',
    Ketu:'to point toward liberation — divine mystic and moksha guide contract'
  };
  const soulContract = AK_CONTRACT[ak||'Saturn'] || 'to endure and build lasting legacy';

  // 175. Divine Test Pattern
  const divineTest = planets.Saturn?.bala >= 65 ? 'patience — life repeatedly tests whether this soul can wait without losing faith'
    : H('Mars')===7||H('Mars')===1 ? 'control — life repeatedly tests whether this soul can act without rage'
    : Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10 ? 'attachment — life tests whether love can exist without possession'
    : [6,8,12].includes(H('Moon')) ? 'trust — life tests whether this soul can trust despite emotional wounds'
    : 'endurance — the repeated test is whether this soul can persist through difficulty';

  // 176. Grace Activation Key
  const graceKey = ST('Jupiter').includes('Exalted')||[1,4,5,9].includes(jupH) ? 'guru/seva — grace activates through selfless service and teacher connection'
    : !planets.Venus?.combust && (ST('Venus').includes('Exalted')||ST('Venus').includes('Own')) ? 'devotion — grace activates through bhakti and surrender to deity'
    : H('Ketu')===12||H('Ketu')===9 ? 'silence — grace activates through withdrawal and inner quietude'
    : [6,8,12].includes(H('Moon')) ? 'surrender — grace activates through releasing control and trusting the process'
    : 'consistent practice — grace activates through regular spiritual discipline';

  return {
    soulPoison: { planet: strongMalefic, desc: soulPoison, summary: `Soul Poison: ${soulPoison}` },
    dharmaCollapse: { summary: `Dharma Collapse Trigger: ${dharmaCollapse}` },
    dharmaReturn: { summary: `Dharma Return Trigger: ${dharmaReturn}` },
    soulContract: { ak, summary: `Soul Contract With God: ${soulContract}` },
    divineTest: { summary: `Divine Test Pattern: ${divineTest}` },
    graceKey: { summary: `Grace Activation Key: ${graceKey}` },
  };
}

function getCosmicMemoryEngines(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 177. Previous Life Status
  const PL_STATUS = {
    Sun: ST('Sun').includes('Exalted')||ST('Sun').includes('Own') ? 'royalty or priest — high-status soul with authority in previous incarnation' : 'official or authority figure — served in governance or religious role',
    Jupiter: 'teacher or sage — wisdom-holder with spiritual authority in previous life',
    Mars: 'warrior or commander — active combatant or military leader in previous life',
    Saturn: 'laborer or servant — worked in service, agriculture, or craft in previous life',
    Mercury: 'trader or scribe — merchant, accountant, or writer in previous life',
    Moon: 'caregiver or healer — served through nurturing, medicine, or emotional support',
    Venus: 'artist or courtesan — lived through beauty, art, or intimate service',
    Rahu: 'foreigner or outcast — lived outside the mainstream social structure',
    Ketu: 'renunciate or mystic — lived in spiritual practice or hermitage'
  };
  const prevStatus = PL_STATUS[ak||'Saturn'];

  // 178. Previous Death Pattern
  const h8Planets = Object.entries(planets).filter(([,p])=>p.house===8).map(([n])=>n);
  const prevDeath = H('Mars')===8 || (planets.Mars?.aspects||[]).includes(8) ? 'violent or sudden — Mars on 8th suggests previous death through conflict, accident, or force'
    : H('Moon')===8 ? 'emotional or drowning — Moon in 8th suggests death through water, grief, or emotional collapse'
    : H('Saturn')===8 ? 'prolonged illness or old age — Saturn in 8th suggests slow death through chronic condition'
    : H('Rahu')===8 ? 'accident or unexpected event — Rahu in 8th suggests sudden unusual death circumstances'
    : h8Planets.includes('Ketu') ? 'spiritual departure — Ketu in 8th suggests peaceful, conscious exit from previous life'
    : 'natural causes — no strong violent or unusual death pattern in 8th house';

  // 179. Unfinished Previous-Life Bond
  const dk = karakas?.Darakaraka;
  const ul = null; // would need upapadaLagna passed in
  const unfinishedBond = dk && planets[dk]?.retrograde ? `Darakaraka ${dk} retrograde — strong unfinished bond with a soul from previous life; that person returns in this life`
    : Math.abs((planets.Venus?.sid||0)-(planets.Ketu?.sid||0))<10 ? 'Venus-Ketu — unfinished love that ended without closure; the soul comes back to complete or release it'
    : [6,8,12].includes(H(dk||'Venus')) ? `Darakaraka in dusthana — the unresolved partner bond carries karmic weight into this life`
    : 'No strong unfinished bond signature — relationships in this life are relatively new contracts';

  // 180. Past-Life Reputation
  const plRep = ST('Sun').includes('Exalted')||([1,4,7,10].includes(H('Sun')) && B('Sun')>=65) ? 'honored and respected — previous-life reputation was dignified and trustworthy'
    : H('Rahu')===10 ? 'feared or controversial — previous-life public image carried power mixed with fear'
    : H('Saturn')===10 || ST('Saturn').includes('Debilitated') ? 'forgotten or overlooked — previous-life contribution went unrecognized despite real effort'
    : H('Mars')===10 ? 'respected in battle or competition — previous-life reputation was built through strength and courage'
    : 'moderate reputation — previous life was lived in relative anonymity with local respect';

  return {
    prevLifeStatus: { summary: `Previous Life Status: ${prevStatus}` },
    prevDeathPattern: { summary: `Previous Death Pattern: ${prevDeath}` },
    unfinishedBond: { summary: `Unfinished Previous-Life Bond: ${unfinishedBond}` },
    pastLifeReputation: { summary: `Past-Life Reputation: ${plRep}` },
  };
}

function getCosmicDestinyEngines(planets, lagnaIdx, karakas, allYogas, dasha) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 181. Fate Resistance Index
  const rahuStrong = B('Rahu') >= 60 || [1,4,7,10].includes(H('Rahu'));
  const marsStrong = B('Mars') >= 65 || ST('Mars').includes('Exalted');
  const akAfflicted = ak && [6,8,12].includes(H(ak));
  const resistanceScore = (rahuStrong?30:0) + (marsStrong?25:0) + (akAfflicted?25:0) + (planets.Saturn?.bala < 40 ? 20 : 0);
  const fateResistance = resistanceScore >= 60 ? 'HIGH — this soul fights fate; life events feel forced rather than accepted; much energy spent resisting what is meant to be'
    : resistanceScore >= 30 ? 'MODERATE — partial resistance; some life areas feel forced while others flow'
    : 'LOW — this soul accepts fate relatively well; events unfold with less friction';

  // 182. Destiny Acceptance Index
  const satKetu = (B('Saturn')>=60?1:0) + (H('Ketu')===12||H('Ketu')===9?1:0) + ([6,8,12].includes(H('Moon'))?1:0);
  const destinyAcceptance = satKetu >= 2 ? 'HIGH — Saturn/Ketu dominant; this soul has learned acceptance through previous suffering; can surrender to larger will'
    : satKetu === 1 ? 'MODERATE — partial acceptance; fights some things, surrenders others'
    : 'LOW — soul is young to acceptance; still believes personal will can override destiny in all things';

  // 183. Karma Burn Rate
  const h6Count = Object.values(planets).filter(p=>p.house===6).length;
  const h8Count = Object.values(planets).filter(p=>p.house===8).length;
  const burnRate = (h6Count+h8Count >= 3) ? 'FAST — dense malefic placement in 6th/8th; karma burns quickly through intense experiences; life feels compressed'
    : (h6Count+h8Count >= 1) ? 'MODERATE — some karmic intensity; experiences are meaningful but manageable pace'
    : 'SLOW — few malefics in dusthanas; karma burns gradually; a steady life with patient unfolding';

  // 184. Divine Intervention Probability
  const divInterv = ST('Jupiter').includes('Exalted') || [1,4,5,9].includes(H('Jupiter')) ? 'HIGH — Jupiter strongly placed in dharma/kendra; divine rescue has occurred and will occur again; grace is active'
    : allYogas.some(y=>y.name.includes('Vipareeta')) ? 'HIGH — Vipareeta Raja Yoga; this chart is specifically built to receive divine rescue at the last moment'
    : [1,4,7,10].includes(H('Jupiter')) ? 'MODERATE — Jupiter in Kendra protects; divine intervention likely at critical junctures'
    : 'MODERATE-LOW — divine intervention comes through human agents rather than miraculous circumstances';

  // 185. Miracle Windows
  const mirWindows = dasha.antardashas?.filter(a => a.lord === 'Jupiter' || a.lord === 'Venus')
    .map(a => `${dasha.current?.lord}-${a.lord} (${a.startDate.slice(0,7)} to ${a.endDate.slice(0,7)})`)
    .slice(0,2).join(', ') || 'next Jupiter Antardasha or transit over 9th lord';

  // 186. Collapse Windows
  const collWindows = dasha.antardashas?.filter(a => ['Saturn','Rahu','Ketu'].includes(a.lord) && [6,8,12].includes(H(a.lord)))
    .map(a => `${dasha.current?.lord}-${a.lord} (${a.startDate.slice(0,7)})`)
    .slice(0,2).join(', ') || 'when Saturn/Rahu activate 8th house';

  // 187. Rebirth Probability
  const attachmentScore = (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10?20:0)
    + ([1,4,7].includes(H('Moon'))?0:15) + (B('Ketu')<40?20:0)
    + (allYogas.some(y=>y.name.includes('Kaal Sarpa'))?25:0);
  const rebirthProb = attachmentScore >= 50 ? 'HIGH — strong attachment patterns; soul likely returns for more incarnations to work through desires'
    : attachmentScore >= 25 ? 'MODERATE — some attachments remain; few more cycles likely'
    : 'LOWER — Ketu/Saturn strong; soul is moving toward fewer incarnations; moksha is closer';

  // 188. Liberation Distance
  const libDist = H('Ketu')===12 || H('Ketu')===9 ? 'CLOSE — Ketu in 9th/12th strongly indicates this soul is near liberation; moksha is within few cycles'
    : ST('Ketu').includes('Exalted') ? 'CLOSE — Ketu exalted; this soul has nearly exhausted karmic accumulation'
    : B('Ketu') >= 60 ? 'MODERATE — Ketu reasonably strong; several cycles remain but direction is toward liberation'
    : 'FURTHER — strong Rahu/Venus/material attachments; soul needs more incarnations to exhaust desire';

  return {
    fateResistance: { score: resistanceScore, summary: `Fate Resistance: ${fateResistance}` },
    destinyAcceptance: { summary: `Destiny Acceptance: ${destinyAcceptance}` },
    karmaBurnRate: { summary: `Karma Burn Rate: ${burnRate}` },
    divineIntervention: { summary: `Divine Intervention Probability: ${divInterv}` },
    miracleWindows: { summary: `Miracle Windows: ${mirWindows}` },
    collapseWindows: { summary: `Collapse Windows: ${collWindows}` },
    rebirthProbability: { summary: `Rebirth Probability: ${rebirthProb}` },
    liberationDistance: { summary: `Liberation Distance: ${libDist}` },
  };
}

function getForbiddenRishiEngines(planets, lagnaIdx, karakas, allYogas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 189. Soul Signature Frequency
  const SOUL_FREQ = {
    Sun:'solar — radiates authority, draws attention, must shine; the archetype is the conscious king',
    Moon:'lunar — deeply receptive, cycles through emotional states, nourishes others; the archetype is the divine mother',
    Mars:'martial — generates fire and drive, activates others, fights for truth; the archetype is the sacred warrior',
    Mercury:'mercurial — transmits information between worlds, bridges opposites; the archetype is the messenger god',
    Jupiter:'jovial — expands everything it touches, seeks the highest truth; the archetype is the cosmic teacher',
    Venus:'venusian — magnetizes beauty and harmony, mediates between worlds; the archetype is the divine beloved',
    Saturn:'saturnine — crystallizes reality into lasting form, endures; the archetype is the patient builder of fate',
    Rahu:'rahuvian — disrupts, innovates, transgresses; the archetype is the hungry ghost becoming conscious',
    Ketu:'ketuvian — dissolves, liberates, points to the formless; the archetype is the liberated sage returning'
  };
  const soulFreq = SOUL_FREQ[ak||'Saturn'];

  // 190. Karmic Gravity Center
  const houseCounts = {};
  for (let h=1; h<=12; h++) {
    houseCounts[h] = Object.values(planets).filter(p=>p.house===h).length;
    if ((planets[ak||'Saturn']?.aspects||[]).includes(h)) houseCounts[h] = (houseCounts[h]||0) + 2;
  }
  const HOUSE_THEMES = {1:'identity and physical existence',2:'wealth and family values',3:'communication and courage',
    4:'home and emotional security',5:'children and creative intelligence',6:'service and overcoming obstacles',
    7:'relationships and marriage',8:'transformation and hidden depths',9:'dharma and spiritual seeking',
    10:'career and public legacy',11:'gains and social purpose',12:'liberation and spiritual surrender'};
  const gravityHouse = Object.entries(houseCounts).sort((a,b)=>b[1]-a[1])[0];
  const gravityCenter = `H${gravityHouse[0]} (${HOUSE_THEMES[gravityHouse[0]]||''}) — this house is the center of gravity for this life`;

  // 191. Cosmic Witness Pattern
  const h9Occ = Object.entries(planets).filter(([,p])=>p.house===9).map(([n])=>n);
  const cosmicWitness = ST('Jupiter').includes('Exalted') ? 'ancestor and deity protection active — Jupiter exalted ensures cosmic observation with grace'
    : [1,4,5,9].includes(H('Jupiter')) ? `Jupiter in H${H('Jupiter')} — cosmic witnesses are present; actions are noticed at a higher level`
    : h9Occ.length > 0 ? `${h9Occ.join('+')} in H9 — dharma house occupied; cosmic attention on this soul's choices`
    : 'modest cosmic witness — actions in this life carry forward but without intense cosmic scrutiny';

  // 192. Shadow Possession Pattern
  const moonH = H('Moon');
  const shadowPossession = Math.abs((planets.Rahu?.sid||0)-(planets.Moon?.sid||0))<15 ? 'Rahu-Moon shadow hijack — at emotional low points, Rahu takes over and creates compulsive behavior or irrational desires; most visible during stress'
    : H('Rahu')===8 ? 'Rahu in H8 shadow possession — in moments of fear or crisis, obsessive thoughts or dark fantasies can temporarily override conscious will'
    : [8,12].includes(moonH) ? `Moon in H${moonH} shadow pattern — in isolation or depression, shadow self emerges through emotional withdrawal and self-undoing`
    : 'mild shadow possession risk — Rahu and Moon relatively separated; shadow hijacks are uncommon and recognizable';

  // 193. Sacred Sacrifice Point
  const h12Lord = planets[RASI_LORD[(lagnaIdx+11)%12]];
  const sacredSacrifice = H('Ketu')===12 ? 'ego dissolution — what must be surrendered is the need to be seen, recognized, or validated'
    : H('Ketu')===7 ? 'partnership dependence — what must be surrendered is the need for a specific person to complete you'
    : H('Ketu')===10 ? 'career identity — what must be surrendered is attachment to status and public position'
    : H('Ketu')===5 ? 'creative ego — what must be surrendered is attachment to personal children or creative works'
    : H('Saturn')===12 ? 'material security — what must be surrendered is the illusion that structure provides safety'
    : 'control of outcomes — what must be surrendered is the need to know how things will unfold';

  // 194. Cosmic Price of Destiny
  const cosmicPrice = ST('Saturn').includes('Exalted')||[1,4,7,10].includes(H('Saturn')) ? 'solitude — the price of highest achievement is periods of deep aloneness; success comes at the cost of isolation'
    : H('Saturn')===10 ? 'delayed recognition — the price is working for years without acknowledgment before the full achievement arrives'
    : ak && [6,8,12].includes(H(ak)) ? `${ak} sacrifice — achieving full destiny requires surrendering what ${ak} represents`
    : 'persistent effort — the price is sustained disciplined labor without shortcuts';

  // 195. Hidden Name of Soul (Archetype)
  const SOUL_ARCHETYPE = {
    Sun:'The Sovereign — a soul that carries light and authority, meant to lead with integrity',
    Moon:'The Guardian — a soul that holds and protects emotional truth for others',
    Mars:'The Warrior-Saint — a soul that fights for justice and protects the vulnerable',
    Mercury:'The Scribe of Fate — a soul that records and transmits essential knowledge',
    Jupiter:'The Great Teacher — a soul that carries wisdom across incarnations to distribute',
    Venus:'The Divine Artist — a soul that manifests love and beauty as a spiritual act',
    Saturn:'The Karmic Architect — a soul that builds the structures through which others grow',
    Rahu:'The Sacred Disruptor — a soul that breaks what must be broken for new light to enter',
    Ketu:'The Mystic of the Threshold — a soul standing between worlds, pointing toward the formless'
  };
  const hiddenName = SOUL_ARCHETYPE[ak||'Saturn'];

  // 196. End-of-Life Realization
  const h12Planets = Object.entries(planets).filter(([,p])=>p.house===12).map(([n])=>n);
  const eolRealization = H('Ketu')===12 ? 'the formless was always home — at life end, this soul realizes material world was the dream, silence is truth'
    : h12Planets.includes('Jupiter') ? 'grace was present all along — the final realization is that divine protection was there even when unfelt'
    : B(ak||'Saturn') >= 65 ? 'the work was the worship — the end realization is that dedicated daily action was itself the spiritual path'
    : [6,8,12].includes(H(ak||'Sun')) ? 'suffering was the teacher — at life end, even the hardest experiences are recognized as essential curriculum'
    : 'love was the only real thing — the final clarity is that relationships and connection were the true purpose';

  // 197. Final Liberation Obstacle
  const mostAttached = ['Venus','Moon','Rahu','Mars','Mercury'].reduce((max, n) =>
    (B(n) > B(max||n)) ? n : max, null);
  const LIBERATION_OBSTACLE = {
    Venus:'love and beauty — cannot leave while attached to a specific person, aesthetic pleasure, or the need to be loved',
    Moon:'emotional belonging — cannot leave while needing to feel held, needed, or emotionally safe',
    Rahu:'future desires — cannot leave while carrying unfulfilled ambitions or obsessive cravings',
    Mars:'unresolved conflict — cannot leave while holding anger or an unresolved fight',
    Mercury:'intellectual curiosity — cannot leave while still wanting to know more, understand more, figure it out',
    Jupiter:'teaching debt — cannot leave while there is wisdom to transmit that has not yet been shared',
    Saturn:'unfinished structure — cannot leave while a building, system, or institution is incomplete'
  };
  const finalObstacle = LIBERATION_OBSTACLE[mostAttached||'Venus'];

  // 198. What Universe Wants From You
  const AK_MISSION = {
    Sun:'to embody and distribute light — not to shine for yourself but to illuminate others',
    Moon:'to be the emotional anchor — to hold space for others feeling and never abandon them',
    Mars:'to protect and fight for truth — to use courage in service of justice, not personal gain',
    Mercury:'to transmit wisdom — to be the bridge between what is known and those who need to know',
    Jupiter:'to teach — every encounter is a classroom; the universe wants wisdom distributed through you',
    Venus:'to create harmony — to make beauty and peace where there was chaos and ugliness',
    Saturn:'to build what lasts — to create structures, systems, and legacies that outlive the body',
    Rahu:'to disrupt what is frozen — to introduce new consciousness into stagnant systems',
    Ketu:'to point toward liberation — to help others see through illusion by embodying detachment'
  };
  const universeWants = AK_MISSION[ak||'Saturn'];

  return {
    soulSignatureFreq: { summary: `Soul Signature Frequency: ${soulFreq}` },
    karmicGravityCenter: { summary: `Karmic Gravity Center: ${gravityCenter}` },
    cosmicWitness: { summary: `Cosmic Witness Pattern: ${cosmicWitness}` },
    shadowPossession: { summary: `Shadow Possession Pattern: ${shadowPossession}` },
    sacredSacrifice: { summary: `Sacred Sacrifice Point: ${sacredSacrifice}` },
    cosmicPrice: { summary: `Cosmic Price of Destiny: ${cosmicPrice}` },
    hiddenSoulName: { summary: `Hidden Name of Soul: ${hiddenName}` },
    endOfLifeRealization: { summary: `End-of-Life Realization: ${eolRealization}` },
    finalLibObstacle: { summary: `Final Liberation Obstacle: ${finalObstacle}` },
    universeWants: { summary: `What Universe Wants From You: ${universeWants}` },
  };
}

function getPastLifeOriginEngines(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 199. Past-Life Geography
  const PL_GEO = {
    Moon:'water region — coast, river, lake environment; soul memory carries water',
    Venus:'fertile land or pleasure-rich region — gardens, valleys, trading cities',
    Sun:'desert or sunlit plateau — arid, bright, open landscape',
    Mars:'battlefield or mountain — rugged, harsh, demanding terrain',
    Saturn:'cold mountain or agricultural land — disciplined, sparse environment',
    Ketu:'forest or jungle — isolated, dense, away from civilization',
    Rahu:'foreign land or urban center — outside native culture, immigrant soul'
  };
  const moonSign = planets.Moon?.rasi;
  const plGeoKey = H('Moon')===12||H('Rahu')===12 ? 'Rahu' : H('Moon')===4 ? 'Moon' : H('Saturn')===12 ? 'Saturn' : H('Ketu')===12 ? 'Ketu' : 'Moon';
  const plGeo = PL_GEO[plGeoKey] || 'mixed geography — multiple incarnations in different regions';

  // 200. Civilization Memory
  const CIV_MEM = {
    Sun:'solar civilization — Egypt, ancient Rome, or Vedic royal court; priest-king societies',
    Moon:'matriarchal or coastal civilization — Indus Valley, maritime culture, moon-goddess worship',
    Mars:'warrior civilization — Sparta, Rajput kingdoms, or martial tribal cultures',
    Mercury:'merchant civilization — ancient trade routes, Silk Road, mercantile city-states',
    Jupiter:'priestly or philosophical civilization — ancient Greece, Brahmin ashram, or Buddhist monastery',
    Venus:'artistic civilization — Mughal court, Renaissance culture, or temple-dancer tradition',
    Saturn:'agricultural or mining civilization — laboring class, feudal village, or monastic order',
    Rahu:'multicultural or foreign civilization — lived as an outsider or immigrant in a dominant culture',
    Ketu:'hermit or forest civilization — rishi tradition, cave-dwelling mystic, jungle ashram'
  };
  const civMem = CIV_MEM[ak||'Saturn'];

  // 201. Past-Life Social Rank
  const plRank = (ST('Sun').includes('Exalted')||([1,4,7,10].includes(H('Sun'))&&B('Sun')>=65)) ? 'aristocracy or priesthood — held elevated social position with ceremonial authority'
    : ST('Jupiter').includes('Exalted')||H('Jupiter')===9 ? 'scholar or sage — respected teacher with social influence through knowledge'
    : ST('Mars').includes('Exalted')||[1,10].includes(H('Mars')) ? 'military officer or landowner — rank through martial courage or territorial holding'
    : ST('Saturn').includes('Debilitated')||[6,8,12].includes(H('Saturn')) ? 'laboring class or servant — worked in subordinate roles with limited social mobility'
    : H('Rahu')===10 ? 'self-made or outsider — achieved status through unusual or transgressive means'
    : 'middle rank — lived as skilled craftsperson, merchant, or mid-level official';

  // 202. Homeland Attachment
  const hlAttachment = H('Moon')===4&&!([6,8,12].includes(H('Moon'))) ? 'strong homeland attachment — Moon in 4th creates deep emotional tie to birthplace; feels most alive in native soil'
    : Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10 ? 'severed homeland attachment — Ketu-Moon indicates past-life displacement or voluntary exile from homeland; emotional homelessness'
    : H('Ketu')===4 ? 'past-life homeland loss — something ended or was taken from the original home; searching for home in this life'
    : H('Rahu')===4 ? 'foreign home resonance — more comfortable in adopted cultures than birthplace; the foreign feels like home'
    : 'moderate homeland attachment — neither deeply rooted nor deeply displaced; adapts to location';

  // 203. Past-Life Language Memory
  const plLang = ST('Mercury').includes('Exalted') ? 'strong language memory — Mercury exalted suggests fluency in a classical or sacred language from previous life; certain languages feel innately familiar'
    : H('Mercury')===2 ? 'speech-based tradition — past life involved oral transmission; storytelling, chanting, or formal recitation'
    : planets.Moon?.nakshatra === 'Shravana' ? 'Shravana nakshatra — the listener and transmitter; past life involved preserving oral tradition'
    : H('Mercury')===9 ? 'philosophical language — past life spoke in concepts, debate, or sacred text interpretation'
    : 'standard language karma — no strong past-life language signature; learning comes through normal means in this life';

  return {
    plGeography: { summary: `Past-Life Geography: ${plGeo}` },
    civilizationMemory: { summary: `Civilization Memory: ${civMem}` },
    plSocialRank: { summary: `Past-Life Social Rank: ${plRank}` },
    homelandAttachment: { summary: `Homeland Attachment: ${hlAttachment}` },
    plLanguageMemory: { summary: `Past-Life Language Memory: ${plLang}` },
  };
}

function getSoulAgeExpansionEngines(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 204. Incarnation Count Estimate
  const satKetu12 = (B('Saturn')>=60?1:0) + ([9,12].includes(H('Ketu'))?1:0) + (Object.values(planets).filter(p=>p.house===12).length>=2?1:0);
  const incarnationCount = satKetu12 >= 3 ? 'many incarnations — Saturn/Ketu/12th house heavily loaded; karmic density suggests extensive previous-life experience'
    : satKetu12 >= 2 ? 'moderate incarnation count — this soul has lived through several cycles; wisdom is available but desire remains'
    : 'fewer incarnations — relatively fresh soul; high enthusiasm, direct engagement with life, less detachment';

  // 205. Soul Weariness Signature
  const weariness = B('Moon')<40 && B('Saturn')>=55 ? 'HIGH weariness — Moon weak + Saturn strong creates profound fatigue; this soul has seen too much and carries it in the body'
    : [8,12].includes(H('Moon')) && H('Ketu')===12 ? 'HIGH weariness — Moon in 8th/12th with Ketu in 12th; soul longs for the between-lives rest'
    : [8,12].includes(H('Moon')) ? 'MODERATE weariness — Moon in dusthana suggests emotional fatigue that makes the world feel heavy'
    : 'LOW weariness — soul is engaged and energized; still finds life interesting and worth participating in';

  // 206. First Human Life Marker
  const firstLife = B('Saturn')<35 && B('Ketu')<35 && Object.values(planets).filter(p=>p.house===12).length===0
    ? 'possible first or early human life — very low karmic complexity; high directness, low philosophical depth, strong material engagement'
    : 'not a first life — sufficient karmic complexity suggests multiple human incarnations already completed';

  // 207. Repetition Cycle Count
  const repCount = (B('Saturn')>=65?1:0) + ([6,8,12].includes(H('Ketu'))?1:0) + (B('Moon')<45?1:0) + (Object.values(planets).filter(p=>[6,8,12].includes(p.house)).length>=3?1:0);
  const repetitionCycles = repCount >= 3 ? 'many repetition loops — this pattern has cycled through 3+ incarnations; the same wound appears in different clothing each life'
    : repCount >= 2 ? 'moderate repetition — this karmic theme has repeated 2-3 times; strong but breakable with awareness'
    : 'early in the loop — this karmic pattern may be appearing for the first or second time; more flexible to shift';

  // 208. Oldest Unresolved Karma
  const oldestKarma = H('Ketu')===7 ? 'partnership abandonment — the oldest unresolved wound is a relationship that ended without closure; the soul keeps returning to finish it'
    : H('Ketu')===5 ? 'child karma — the oldest unresolved wound involves a child or creative act that was lost or abandoned'
    : H('Ketu')===10 ? 'authority karma — the oldest wound involves being stripped of power or recognition; returning to reclaim legitimate standing'
    : H('Ketu')===4 ? 'home/mother karma — the oldest wound is displacement from a homeland or mother separation that never healed'
    : H('Ketu')===9 ? 'teacher betrayal karma — the oldest wound is a dharmic collapse or guru relationship that broke trust'
    : H('Ketu')===1 ? 'identity erasure — the oldest wound is having been forced to be someone other than the true self; this life reclaims authentic identity'
    : 'distributed karma — oldest unresolved theme is spread across multiple houses; no single dominant loop';

  return {
    incarnationCount: { summary: `Incarnation Count Estimate: ${incarnationCount}` },
    soulWeariness: { summary: `Soul Weariness Signature: ${weariness}` },
    firstLifeMarker: { summary: `First Human Life Marker: ${firstLife}` },
    repetitionCycles: { summary: `Repetition Cycle Count: ${repetitionCycles}` },
    oldestKarma: { summary: `Oldest Unresolved Karma: ${oldestKarma}` },
  };
}

function getPastLifeEventEngines(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const dk = karakas?.Darakaraka;

  // 209-214. Past life events
  const h8Planets = Object.entries(planets).filter(([,p])=>p.house===8).map(([n])=>n);

  // Death scene (209)
  const deathScene = H('Mars')===8 ? 'violent or combat death — Mars in 8th suggests previous death through conflict, physical force, or battle'
    : Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10 ? 'sudden departure — Ketu-Moon close conjunction suggests unexpected or accidental death that the soul did not anticipate'
    : H('Saturn')===8 ? 'slow illness death — Saturn in 8th suggests prolonged suffering before previous-life exit'
    : H('Moon')===8 ? 'drowning or emotional death — Moon in 8th suggests death through water or severe emotional collapse'
    : 'natural exit — no strong violent death signature; previous departure was likely age-related';

  // Betrayal (210)
  const betrayal = dk && planets[dk]?.retrograde ? `Darakaraka ${dk} retrograde — a significant betrayal by a trusted person marked the previous life; soul carries forward a wound of broken trust`
    : H('Rahu')===7 ? 'intimate betrayal — Rahu in 7th suggests a previous-life partner who deceived or abandoned'
    : Math.abs((planets.Rahu?.sid||0)-(planets.Saturn?.sid||0))<15 ? 'institutional betrayal — Rahu-Saturn connection suggests betrayal by a system, king, or authority figure'
    : 'no strong betrayal signature — previous-life relationships were relatively honest, though incomplete';

  // Unfinished love (211)
  const unfinLove = Math.abs((planets.Venus?.sid||0)-(planets.Ketu?.sid||0))<10 ? 'strong unfinished love — Venus-Ketu close conjunction; a love that ended before its time keeps returning in new form'
    : planets.Venus?.retrograde ? 'Venus retrograde — love was interrupted, reversed, or left without resolution; this person searches for that connection again'
    : [8,12].includes(H('Venus')) ? `Venus in H${H('Venus')} — love was hidden or sacrificed in previous life; this life seeks to experience love openly`
    : 'moderate unfinished love — Venus shows some past-life romantic incompletion but not overwhelming';

  // Vow made (212)
  const vowMade = H('Saturn')===7 && planets[dk||'Venus']?.retrograde ? 'marriage vow broken — Saturn in 7th with DK retrograde suggests a vow of fidelity or loyalty that was abandoned'
    : H('Saturn')===9 ? 'dharmic vow broken — Saturn in 9th suggests a spiritual or religious vow that was not fulfilled'
    : H('Ketu')===12 ? 'monastic vow — Ketu in 12th suggests a previous-life vow of renunciation that the soul partially abandoned; returning to complete it'
    : 'no strong vow signature — previous life commitments were kept or naturally completed';

  // Lost child (213)
  const lostChild = H('Ketu')===5 ? 'lost child karma — Ketu in 5th strongly suggests a previous life where a child was lost, abandoned, or separated from; strong emotional charge around children'
    : [6,8,12].includes(H(RASI_LORD[(lagnaIdx+4)%12])) ? `5th lord in dusthana — a child was lost or separated in previous life; this creates complex feelings about having children in this life`
    : 'no strong lost child karma — 5th house and Ketu not strongly connected in this configuration';

  // Enemy return (214)
  const enemyReturn = H('Rahu')===6 ? 'enemy returns — Rahu in 6th suggests a previous-life enemy has incarnated again in close proximity; may appear as colleague, rival, or difficult authority figure'
    : H('Mars')===6 ? 'past battlefield rival — Mars in 6th indicates someone who opposed this soul in a previous life appears again; competition feels strangely familiar'
    : H('Saturn')===6 ? 'karmic obstacle from previous life returns — Saturn in 6th brings back an old adversary who tests this soul through service or conflict'
    : 'no strong enemy return signature — opposition in this life is likely new karma rather than recurring pattern';

  return {
    deathScene: { summary: `Past-Life Death Scene: ${deathScene}` },
    pastLifeBetrayalEvent: { summary: `Past-Life Betrayal Event: ${betrayal}` },
    unfinishedLoveEvent: { summary: `Unfinished Previous-Life Love: ${unfinLove}` },
    vowMadeEvent: { summary: `Past-Life Vow: ${vowMade}` },
    lostChildEvent: { summary: `Lost Child Karma: ${lostChild}` },
    enemyReturnEvent: { summary: `Enemy Return Karma: ${enemyReturn}` },
  };
}

function getSoulTravelEngines(planets, lagnaIdx, karakas, nakshatra) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 215. Interlife State
  const interlife = H('Ketu')===12 ? 'peaceful interlife — Ketu in 12th indicates the soul rested between births in a state of clarity; arrived in this life relatively fresh'
    : [8,12].includes(H('Moon')) ? 'troubled interlife — Moon in 8th/12th suggests confusion or unresolved emotion in the interlife state; arrived carrying unprocessed experience'
    : H('Jupiter')===12 ? 'blessed interlife — Jupiter in 12th indicates divine protection during the between-lives state; guidance was available'
    : Object.values(planets).filter(p=>p.house===12).length >= 3 ? 'dense interlife processing — multiple planets in 12th suggests heavy karma was reviewed and compressed during interlife'
    : 'neutral interlife — standard transition between incarnations; neither particularly peaceful nor troubled';

  // 216. Why This Family
  const whyFamily = H('Saturn')===4 ? 'karmic repayment — chosen this family to repay a debt of care or service owed from previous life; they provided shelter before, you provide something now'
    : ST('Moon').includes('Exalted') ? 'soul support — chose this family because the mother or lineage carries positive energy needed to launch this soul forward'
    : [6,8,12].includes(H('Moon')) ? 'karmic classroom — chose this family for the specific lessons their difficulty provides; not punishment, but curriculum'
    : H('Jupiter')===4 ? 'dharmic anchor — chose this family for their wisdom tradition or spiritual environment that gives early access to higher understanding'
    : 'unfinished lineage karma — this family line carries a specific pattern this soul volunteered to either continue or resolve';

  // 217. Why This Country
  const whyCountry = H('Rahu')===9||H('Rahu')===12 ? 'karmic contrast country — chosen to experience a culture very different from previous-life norm; learning through cultural friction'
    : H('Moon')===4 ? 'homeland resonance — chose a country that carries memory of a previous home; emotional comfort through geographic recognition'
    : H('Ketu')===9 ? 'spiritual geography — chosen for proximity to specific sacred sites, wisdom traditions, or liberation-supporting environment'
    : H('Saturn')===4 ? 'karmic endurance country — chosen for its challenges; the difficulty of this geography is itself the teaching'
    : 'dharmic alignment — this geography carries the specific social conditions needed for this soul unique mission to unfold';

  // 218. Why This Body
  const whyBody = ST(RASI_LORD[lagnaIdx]).includes('Exalted') ? 'this body is a gift — strong Lagna lord indicates a body specifically chosen for capability; it is adequate for the mission'
    : [6,8,12].includes(H(RASI_LORD[lagnaIdx])) ? 'this body is the lesson — Lagna lord in dusthana means the body itself is a karmic teaching; its limitations are deliberate'
    : B('Mars')>=65 ? 'warrior body — Mars strength indicates a body with above-average physical capacity, chosen for active engagement with the material world'
    : B('Saturn')>=65 ? 'endurance body — Saturn strength indicates a body built for long life and sustained effort rather than speed or intensity'
    : 'appropriate body — this body has the specific combination of strength and limitation needed for the karmic work of this incarnation';

  // 219. Why This Gender
  const venus = B('Venus'), mars = B('Mars'), moon = B('Moon'), sun = B('Sun');
  const whyGender = venus > mars && moon > sun ? 'feminine polarity chosen — Venus/Moon dominant; this soul chose feminine frequency to develop receptivity, intuition, and relational wisdom'
    : mars > venus && sun > moon ? 'masculine polarity chosen — Mars/Sun dominant; soul chose masculine frequency to develop initiative, authority, and direct action'
    : 'balanced polarity — neither strongly masculine nor feminine planet dominates; this incarnation balances both frequencies';

  return {
    interlifeState: { summary: `Interlife State: ${interlife}` },
    whyThisFamily: { summary: `Why This Family: ${whyFamily}` },
    whyThisCountry: { summary: `Why This Country: ${whyCountry}` },
    whyThisBody: { summary: `Why This Body: ${whyBody}` },
    whyThisGender: { summary: `Why This Gender: ${whyGender}` },
  };
}

function getDeepMemoryEngines(planets, lagnaIdx, karakas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;
  const dk = karakas?.Darakaraka;

  // 220. Forgotten Skill Retrieval
  const forgottenSkill = ST('Mercury').includes('Exalted') ? 'advanced communication or writing skill — Mercury exalted preserves eloquence from previous life; under pressure or passion, this talent re-emerges naturally'
    : B('Jupiter')>=65 && [5,9].includes(H('Jupiter')) ? 'teaching or philosophical skill — Jupiter in 5th/9th carries preserved wisdom; can access depth in these subjects beyond what this life has taught'
    : B('Venus')>=65 ? 'artistic or healing skill — Venus strong carries preserved aesthetic or therapeutic ability; certain art forms or healing practices feel inexplicably familiar'
    : H('Mars')===3 ? 'martial art or craft skill — Mars in 3rd carries preserved physical skill; certain physical disciplines feel remembered rather than learned'
    : 'latent skill in 5th house significations — what the 5th house lord represents holds preserved talent from previous life';

  // 221. Soul Familiarity Triggers
  const famTriggers = Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10 ? 'Ketu-Moon — certain smells, sounds, or places trigger inexplicable recognition; particular landscapes feel like home without reason'
    : H('Ketu')===4 ? 'places trigger memory — entering certain types of buildings or landscapes (particularly old structures) activates past-life recognition'
    : H('Ketu')===7 ? 'people trigger memory — meeting certain types of individuals activates instant recognition beyond this life knowing them'
    : H('Ketu')===5 ? 'children and creative acts trigger memory — watching children play or engaging in certain creative acts brings flashes of another time'
    : 'periodic deja vu through Moon nakshatra resonance — specific situations matching nakshatra themes activate recognition';

  // 222. Past-Life Fear Carryover
  const plFear = H('Mars')===8 || H('Mars')===12 ? 'carried fear of violence or sudden loss — Mars in 8th/12th brings forward a fear of physical danger or sudden harm that exceeds this life experience'
    : Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10 ? 'carried fear of abandonment — Ketu-Moon close conjunction brings forward deep existential fear of being left alone that began in a previous life'
    : H('Saturn')===1 ? 'carried fear of failure or punishment — Saturn on Lagna brings forward anxiety about being judged, failed, or punished that began in a previous authority context'
    : H('Ketu')===7 ? 'carried fear of intimacy — Ketu in 7th brings forward a wound from a previous relationship that makes closeness feel dangerous'
    : 'past-life fear is mild — no strongly carried forward phobia; current life fears are largely new karma';

  // 223. Past-Life Guilt Carryover
  const plGuilt = [6,8,12].includes(H('Saturn')) ? `Saturn in H${H('Saturn')} — carried guilt from previous life action; a specific decision or inaction haunts this soul unconsciously; manifests as over-responsibility or excessive self-punishment`
    : [6,8,12].includes(H('Moon')) ? `Moon in H${H('Moon')} — emotional guilt carryover; this person was perhaps cold or unavailable to someone in a previous life and carries the weight`
    : H('Ketu')===9 ? 'dharmic guilt — broke a spiritual vow or betrayed a teacher in previous life; this life carries an unconscious need to restore spiritual integrity'
    : 'no strong guilt carryover — Saturn and Moon relatively free from dusthana burden in this configuration';

  // 224. Past-Life Promise Active
  const plPromise = H('Saturn')===7 && (dk && planets[dk]?.retrograde) ? `active marriage vow — Saturn in 7th with DK ${dk} retrograde suggests a promise made to a specific soul about partnership; that soul may appear in this life expecting fulfillment`
    : H('Ketu')===9 ? 'active spiritual vow — Ketu in 9th suggests a past-life promise to pursue liberation or serve a specific tradition; still binding on some level'
    : H('Saturn')===5 ? 'active promise to a child — Saturn in 5th suggests a past-life commitment to a specific soul to protect or raise them; that soul may return as your child'
    : 'no dominant past-life promise active — karmic contracts are being freshly negotiated in this incarnation';

  return {
    forgottenSkill: { summary: `Forgotten Skill Retrieval: ${forgottenSkill}` },
    soulFamiliarityTriggers: { summary: `Soul Familiarity Triggers: ${famTriggers}` },
    plFearCarryover: { summary: `Past-Life Fear Carryover: ${plFear}` },
    plGuiltCarryover: { summary: `Past-Life Guilt Carryover: ${plGuilt}` },
    plPromiseActive: { summary: `Past-Life Promise Active: ${plPromise}` },
  };
}

function getFinalSynthesisEngines225to230(planets, lagnaIdx, karakas, allYogas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;

  // 225. Who Were You Before?
  const PL_ARCHETYPE = {
    Sun:'a sovereign, high priest, or commander — you carried authority and were responsible for many',
    Moon:'a healer, mother, or keeper of community — you held emotional space for an entire group',
    Mars:'a warrior, protector, or revolutionary — you fought for what you believed and died for it',
    Mercury:'a scribe, teacher, or merchant — you transmitted knowledge or goods between people and places',
    Jupiter:'a guru, philosopher, or judge — you carried wisdom and arbitrated truth',
    Venus:'an artist, courtesan, or devotee — you embodied beauty and brought grace to a specific domain',
    Saturn:'a builder, farmer, or servant — you worked quietly to sustain structures others took for granted',
    Rahu:'an outsider, foreigner, or transgressor — you broke rules or crossed boundaries between worlds',
    Ketu:'a mystic, renunciate, or sage — you had already turned away from the world toward the formless'
  };
  const whoWerYou = PL_ARCHETYPE[ak||'Saturn'];

  // 226. What Did You Lose?
  const whatLost = H('Moon')===8||H('Moon')===12 ? 'emotional belonging — the core previous-life loss was a place or person where you felt completely held and seen; that is what you search for now'
    : Math.abs((planets.Venus?.sid||0)-(planets.Ketu?.sid||0))<10 ? 'a great love — Venus-Ketu indicates a love that was real, complete, and then taken or surrendered; the ache of that loss persists across incarnations'
    : [6,8,12].includes(H('Venus')) ? 'love and pleasure — Venus in dusthana suggests the previous life involved sacrifice of intimate happiness for duty or circumstance'
    : H('Ketu')===10 ? 'status and recognition — what was lost was a position of respect and authority that was stripped away or abandoned'
    : H('Ketu')===5 ? 'creative children or a creative masterwork — something built with great love was lost before its time'
    : 'belonging — the core previous-life loss was membership in a tribe, family, or homeland that could not be sustained';

  // 227. What Did You Bring?
  const whatBrought = ak ? `${ak} essence — you carried forward the gifts and wounds of ${ak}: ${RASI_LORD[planets[ak]?.rasiIdx||0]} energy in ${planets[ak]?.rasi||'its sign'}`
    : 'accumulated wisdom from the dominant nakshatra tradition';
  const giftWound = B('Ketu')>=55 ? 'gift of spiritual depth; wound of detachment from material life'
    : Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10 ? 'gift of psychic sensitivity; wound of emotional fragmentation'
    : H('Mars')===1&&ST('Mars').includes('Exalted') ? 'gift of extraordinary courage; wound of difficulty accepting limitation'
    : ST('Jupiter').includes('Exalted') ? 'gift of profound wisdom; wound of expecting wisdom from others who cannot access it'
    : 'gift of endurance; wound of carrying what should be set down';

  // 228. What Must End?
  const whatMustEnd = H('Ketu')===7 ? 'the search for the specific previous-life partner — they came, the lesson is complete, the attachment must now be released'
    : H('Ketu')===1 ? 'false identity — the pattern of being who others need rather than who you are must end in this life'
    : H('Ketu')===10 ? 'career as identity — the loop of defining yourself entirely through status and achievement must complete and release'
    : H('Ketu')===4 ? 'holding onto a home or mother energy that is already gone — the grief of that loss must resolve and release'
    : H('Ketu')===5 ? 'attachment to a specific creative vision or child that did not manifest as expected — that mourning must complete'
    : `the ${RASI_LORD[(lagnaIdx + H('Ketu') - 1 + 12) % 12]}-type pattern that keeps repeating — it has served its purpose and must now close`;

  // 229. What Happens If It Ends?
  const h9Occ = Object.entries(planets).filter(([,p])=>p.house===9).map(([n])=>n);
  const ifItEnds = ST('Jupiter').includes('Exalted')||[1,5,9].includes(H('Jupiter'))
    ? 'significant grace activates — when the core karmic loop closes, Jupiter opens a new chapter of genuine expansion, teaching, and dharmic fulfillment'
    : H('Ketu')===12 ? 'liberation draws closer — completing this pattern accelerates the soul toward moksha; the weight lifts permanently'
    : allYogas.some(y=>y.name.includes('Vipareeta')) ? 'the chart rises completely — Vipareeta Raja Yoga fully activates when the old pattern releases; what was suffering becomes the source of power'
    : 'sustained peace — not dramatic, but real: a quietness replaces the chronic low-level urgency; life flows rather than fights';

  // 230. What Happens If It Repeats?
  const h6Count = Object.values(planets).filter(p=>p.house===6).length;
  const h8Count = Object.values(planets).filter(p=>p.house===8).length;
  const ifRepeats = h6Count+h8Count >= 3 ? 'dense karmic re-accumulation — if this pattern repeats, the next incarnation carries even heavier version of the same wound; the lesson becomes more severe'
    : [6,8,12].includes(H('Saturn')) ? 'Saturn deepens the karma — Saturn in dusthana means each repetition adds more crystallization; the pattern becomes harder to exit the longer it runs'
    : allYogas.some(y=>y.name.includes('Kaal Sarpa')) ? 'the Kaal Sarpa repeats its cycle — another full revolution around the karmic wheel before the next opportunity to exit'
    : 'another incarnation with similar themes — the soul returns again in a similar life structure until the core pattern is recognized and resolved';

  return {
    whoWereYouBefore: { summary: `Who Were You Before: ${whoWerYou}` },
    whatDidYouLose: { summary: `What Did You Lose: ${whatLost}` },
    whatDidYouBring: { summary: `What Did You Bring: ${whatBrought} | ${giftWound}` },
    whatMustEnd: { summary: `What Must End: ${whatMustEnd}` },
    whatHappensIfEnds: { summary: `What Happens If It Ends: ${ifItEnds}` },
    whatHappensIfRepeats: { summary: `What Happens If It Repeats: ${ifRepeats}` },
  };
}

module.exports.getDivineArchitectureEngines = getDivineArchitectureEngines;
module.exports.getCosmicMemoryEngines = getCosmicMemoryEngines;
module.exports.getCosmicDestinyEngines = getCosmicDestinyEngines;
module.exports.getForbiddenRishiEngines = getForbiddenRishiEngines;
module.exports.getPastLifeOriginEngines = getPastLifeOriginEngines;
module.exports.getSoulAgeExpansionEngines = getSoulAgeExpansionEngines;
module.exports.getPastLifeEventEngines = getPastLifeEventEngines;
module.exports.getSoulTravelEngines = getSoulTravelEngines;
module.exports.getDeepMemoryEngines = getDeepMemoryEngines;
module.exports.getFinalSynthesisEngines225to230 = getFinalSynthesisEngines225to230;

// ═══════════════════════════════════════════════════
// ADVANCED ENGINE — BATCH 12: ESOTERIC & D60 FORENSIC
// ═══════════════════════════════════════════════════

function getEsotericEngines(planets, lagnaIdx, karakas, allYogas, dasha, nakshatra) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;
  const dk = karakas?.Darakaraka;

  // 1. Preta Attachment (unsettled dead influence)
  const moonH = H('Moon');
  const pretaFactors = [];
  if (Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10) pretaFactors.push('Ketu-Moon conjunction — strong ancestral residue, recurring ancestor figures in dreams');
  if ((planets.Saturn?.aspects||[]).includes(moonH) && [8,12].includes(moonH)) pretaFactors.push(`Saturn aspects Moon in H${moonH} — heavy ancestral imprint, inherited emotional patterns from unresolved dead`);
  if (Object.values(planets).filter(p=>p.house===12&&['Saturn','Rahu','Mars','Ketu'].includes(Object.keys(planets).find(k=>planets[k]===p))).length >= 2) pretaFactors.push('Multiple malefics in H12 — psychic field open to ancestral attachment');
  if (H('Rahu')===8||H('Ketu')===8) pretaFactors.push(`Rahu/Ketu in H8 — strong karmic link to ancestral death cycles, may feel presence of departed`);
  const pretaLevel = pretaFactors.length >= 3 ? 'HIGH' : pretaFactors.length >= 2 ? 'MODERATE' : 'LOW';

  // 2. Soul Predator Pattern
  const predatorFactors = [];
  if (H('Rahu')===7) predatorFactors.push('Rahu in H7 — repeatedly attracts charismatic but manipulative partners; magnetism masks control');
  if ((planets.Saturn?.aspects||[]).includes(H('Venus'))) predatorFactors.push('Saturn aspects Venus — draws emotionally unavailable or cold partners as karmic mirrors');
  if ((planets.Mars?.aspects||[]).includes(H('Moon'))) predatorFactors.push('Mars aspects Moon — attracts those who trigger anger and emotional reactivity');
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10) predatorFactors.push('Rahu-Venus — obsessively drawn to people who destabilize emotional center; narcissist pattern');
  const predatorType = predatorFactors.length >= 2 ? predatorFactors[0] : 'No strong predator pattern — relationship challenges are circumstantial not karmic';

  // 3. Soul Imprisonment Pattern
  const h12Planets = Object.entries(planets).filter(([,p])=>p.house===12);
  const imprisonmentType = H('Saturn')===12 ? 'duty trap — Saturn in H12 creates imprisonment through obligation, guilt, and endless responsibility'
    : Math.abs((planets.Rahu?.sid||0)-(planets.Moon?.sid||0))<10 ? 'fear trap — Rahu-Moon creates imprisonment through anxiety, obsessive worry, inability to rest'
    : H('Rahu')===12 ? 'escape trap — Rahu in H12 creates imprisonment through addiction, avoidance, or fantasies of escape that never materialize'
    : H('Ketu')===7 ? 'marriage trap — Ketu in H7 creates sense of being imprisoned by relationship karma, stuck in bonds that neither satisfy nor release'
    : [6,8,12].includes(H(ak||'Saturn')) ? 'guilt trap — AK in dusthana creates imprisonment through chronic guilt and self-punishment for past actions'
    : 'mild imprisonment — no dominant soul-trap pattern identified';

  // 4. Forbidden Desire Engine
  const forbidDesireKey = Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10 ? 'obsessive love or lust — Rahu-Venus creates desire that returns compulsively regardless of consequences'
    : H('Rahu')===10 ? 'power and dominance — Rahu in H10 creates recurring desire for control, authority, and being above others'
    : H('Rahu')===5 ? 'creative or romantic obsession — Rahu in H5 creates forbidden attraction to younger, creative, or unconventional partners'
    : (planets.Mars?.aspects||[]).includes(H('Venus')) ? 'passion destruction — Mars-Venus creates recurring desire that burns intensely then destroys the relationship'
    : 'revenge — underlying desire to balance an ancient injustice that has not been consciously acknowledged';

  // 5. Soul Fragmentation Index
  const fragFactors = [];
  if (Math.abs((planets.Rahu?.sid||0)-(planets.Moon?.sid||0))<10) fragFactors.push('Rahu-Moon — psyche fragments under pressure, creating identity shifts and inconsistent sense of self');
  if (Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10) fragFactors.push('Ketu-Moon — dissociation from emotional reality, chronic feeling of watching oneself from outside');
  if ([8,12].includes(moonH)) fragFactors.push(`Moon in H${moonH} — emotional core is fragmented, different personas for different contexts`);
  if (planets.Mercury?.combust) fragFactors.push('Mercury combust — rational mind suppressed, creates internal incoherence and communication fragmentation');
  const fragScore = fragFactors.length * 25;
  const fragLevel = fragScore >= 75 ? 'HIGH' : fragScore >= 50 ? 'MODERATE' : fragScore >= 25 ? 'MILD' : 'LOW';

  // 6. Rebirth Delay Engine (soul resisted entry)
  const rebirthDelay = moonH === 8 ? 'Moon in H8 suggests difficult birth process — the soul may have resisted full incarnation, creating lifelong sense of partial arrival'
    : Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10 ? 'Ketu-Moon conjunction — soul carried strong detachment from previous life, resisting entry into new body; creates lifelong alienation feeling'
    : H(RASI_LORD[lagnaIdx])===8||H(RASI_LORD[lagnaIdx])===12 ? 'Lagna lord in H8/H12 — the embodiment process was challenging; soul did not arrive fully present until some years into life'
    : 'No strong rebirth delay signature — incarnation appears to have been relatively smooth';

  // 7. Ancestor Hunger Engine
  const ancestorHunger = (planets.Sun?.status.includes('Debilitated') || [6,8,12].includes(H('Sun'))) && H('Ketu')===9
    ? 'HIGH — Sun debilitated + Ketu in H9 strongly indicates unfed ancestral karma; ancestors received no tarpan, their unfinished business echoes as family stagnation'
    : planets.Sun?.combust ? 'MODERATE — Sun combust indicates ancestors overshadowed by ego energy; family karmas unacknowledged create periodic stagnation'
    : H('Saturn')===9 ? 'MODERATE — Saturn in H9 creates heavy ancestral obligation; family patterns repeat until formally acknowledged and released'
    : 'LOW — Sun and H9 relatively clear; ancestral karma is manageable and not causing active blockage';

  // 8. Hidden Desire Engine  
  const hiddenDesire = H('Rahu')===8 ? 'desire for transformation and power over death — Rahu in H8 creates hidden fascination with the forbidden, occult, and experiences that transgress normal limits'
    : H('Rahu')===12 ? 'desire for dissolution and escape — Rahu in H12 creates hidden longing to disappear, to lose self in something larger, to escape the burden of being an individual'
    : Math.abs((planets.Rahu?.sid||0)-(planets.Venus?.sid||0))<10 ? 'desire for the forbidden lover — Rahu-Venus creates recurring attraction to what is unavailable, inappropriate, or socially transgressive'
    : H('Rahu')===5 ? 'desire for creative immortality — Rahu in H5 creates hidden drive to be remembered, to create something that outlasts the body'
    : 'hidden desire for recognition — Rahu placement creates underlying hunger to be seen and validated beyond what is consciously admitted';

  // 9. Who Waits After Death
  const AK_AFTER = {
    Sun:'solar ancestors and luminous authority figures — the grandfather lineage and light-bearing ancestors receive this soul',
    Moon:'maternal line and nourishing deity stream — the grandmother lineage and Devi presence receives this soul',
    Mars:'warrior ancestors and Skanda/Murugan current — those who died in service and courage',
    Mercury:'Vishnu stream and teaching lineage — the souls of transmitters and knowledge-keepers',
    Jupiter:'guru parampara — the teaching lineage, dharmic masters, and expanded consciousness current',
    Venus:'Lakshmi stream and beloved spirits — the souls of artists, healers, and lovers',
    Saturn:'Kala Bhairava and burden-bearing ancestors — those who worked without recognition',
    Rahu:'cosmic crossroads — the soul meets chaotic forces and must navigate without a clear guide; transformation through confusion',
    Ketu:'moksha stream and liberated masters — advanced souls and Ganesha current guide this soul toward next level'
  };
  const whoWaits = AK_AFTER[ak||'Saturn'];

  // 10. What Was Promised Before Birth
  const AK_PROMISE = {
    Sun:'to restore dignity and light to a lineage that lost it — to reclaim authority with integrity',
    Moon:'to bring emotional healing to a family line that has been cold or broken',
    Mars:'to fight for justice in a specific domain — to not flee when courage is required',
    Mercury:'to transmit a specific body of knowledge that would otherwise be lost',
    Jupiter:'to teach — to pass on wisdom to at least one generation that can carry it forward',
    Venus:'to create — to bring beauty or healing into a world that needed it',
    Saturn:'to endure — to demonstrate that patience and sustained effort can build what generations failed to build',
    Rahu:'to break a specific pattern that has imprisoned the family or lineage for generations',
    Ketu:'to complete the karmic cycle — to live this final or near-final life with sufficient detachment that the cycle can close'
  };
  const promiseMade = AK_PROMISE[ak||'Saturn'];

  // 11. Possession Susceptibility
  const possessScore = (B('Moon')<45?25:0) + (B(RASI_LORD[lagnaIdx])<45?20:0)
    + ([1,8,12].includes(H('Rahu'))?25:0) + (Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10?25:0);
  const possessLevel = possessScore >= 60 ? 'HIGH — weak Moon + Rahu placement makes psychic field porous; external energies easily enter'
    : possessScore >= 35 ? 'MODERATE — situational susceptibility; most vulnerable during exhaustion, grief, or alcohol/substance states'
    : 'LOW — strong Lagna and Moon provide protective boundary; external energy does not easily penetrate';

  // 12. Lineage Collapse Point (you as breaker)
  const isBreaker = allYogas.some(y=>y.name.includes('Vipareeta')) && (H('Ketu')===9||H('Ketu')===12)
    ? 'STRONG — Vipareeta Raja Yoga + Ketu in dharma/moksha house: you are the designated lineage breaker; the family karma ends with your conscious choice'
    : (B('Jupiter')>=70&&planets.Jupiter?.rasiIdx===planets.Jupiter?.navamsaRasiIdx) ? 'PROBABLE — Jupiter Vargottama indicates you carry the seed of karmic completion for this lineage'
    : allYogas.some(y=>y.name.includes('Kaal Sarpa')&&y.nullified) ? 'POSSIBLE — Kaal Sarpa present but nullified: you have the capacity to break the cycle but it requires conscious effort'
    : 'PARTIAL — you are cleaning specific threads of lineage karma but not the full cycle breaker';

  // 13. Shadow Deity
  const strongestMalefic = ['Rahu','Saturn','Mars','Ketu'].reduce((max,n) => B(n) > B(max) ? n : max, 'Saturn');
  const SHADOW_DEITY = {
    Rahu:'Chinnamasta or Kali — fierce transformative force governs the unresolved shadow; worship through fierce honesty',
    Saturn:'Kala Bhairava — lord of time and death governs the karma of delayed justice; worship through discipline',
    Mars:'Narasimha — fierce protector form governs unresolved anger and protection karma; worship through courage in truth',
    Ketu:'Dhumavati — the widow goddess governs loss, grief, and detachment karma; worship through acceptance of endings'
  };
  const shadowDeity = SHADOW_DEITY[strongestMalefic] || SHADOW_DEITY['Saturn'];

  // 14. Cosmic Punishment Loop
  const punishLoop = (B('Saturn')>=65&&[6,8,12].includes(H('Saturn'))) ? 'Saturn in dusthana with high bala — the same lesson of endurance and responsibility repeats in different forms; recognition breaks the loop'
    : Math.abs((planets.Saturn?.sid||0)-(planets.Ketu?.sid||0))<15 ? 'Saturn-Ketu conjunction — heavy repeating karma of burden and detachment; each time this pattern activates, the lesson is to carry without attaching'
    : (allYogas.some(y=>y.name.includes('Kaal Sarpa')&&!y.nullified)) ? 'Kaal Sarpa active — the soul is in a cosmic repetition loop; same themes return until fully recognized from within'
    : 'mild repetition — patterns repeat but are not locked; current dasha determines how visible the loop is';

  return {
    pretaAttachment: { level: pretaLevel, factors: pretaFactors, summary: `Preta Attachment: ${pretaLevel} — ${pretaFactors[0]||'Low ancestral interference — Moon and 12th house relatively clean'}` },
    soulPredator: { summary: `Soul Predator Pattern: ${predatorType}` },
    soulImprisonment: { summary: `Soul Imprisonment Pattern: ${imprisonmentType}` },
    forbiddenDesire: { summary: `Forbidden Desire Engine: ${forbidDesireKey}` },
    soulFragmentation: { score: fragScore, level: fragLevel, factors: fragFactors, summary: `Soul Fragmentation Index: ${fragLevel} (${fragScore}/100) — ${fragFactors[0]||'psyche is relatively integrated'}` },
    rebirthDelay: { summary: `Rebirth Delay Engine: ${rebirthDelay}` },
    ancestorHunger: { summary: `Ancestor Hunger Engine: ${ancestorHunger}` },
    hiddenDesire: { summary: `Hidden Desire Engine: ${hiddenDesire}` },
    whoWaitsAfterDeath: { ak, summary: `Who Waits After Death: ${whoWaits}` },
    promiseBeforeBirth: { ak, summary: `Promise Before Birth: ${promiseMade}` },
    possessionSusceptibility: { score: possessScore, level: possessLevel, summary: `Possession Susceptibility: ${possessLevel}` },
    lineageCollapsePoint: { summary: `Lineage Collapse Point: ${isBreaker}` },
    shadowDeity: { planet: strongestMalefic, summary: `Shadow Deity: ${shadowDeity}` },
    cosmicPunishmentLoop: { summary: `Cosmic Punishment Loop: ${punishLoop}` },
  };
}

function getD60ForensicEngines(planets, lagnaIdx, karakas, nakshatra, allYogas) {
  const H = name => planets[name]?.house || 0;
  const ST = name => planets[name]?.status || '';
  const B = name => planets[name]?.bala || 50;
  const ak = karakas?.Atmakaraka;
  const dk = karakas?.Darakaraka;

  // D60 is computed from exact degrees — approximate it from D1 + D9 cross-reference
  // Layer 1: Root Cause (why karma formed)
  const h6 = Object.entries(planets).filter(([,p])=>p.house===6).map(([n])=>n);
  const h8 = Object.entries(planets).filter(([,p])=>p.house===8).map(([n])=>n);
  const h12 = Object.entries(planets).filter(([,p])=>p.house===12).map(([n])=>n);

  const rootCause = h6.length >= 2 ? `6H cluster (${h6.join('+')}) — root karma formed through causing karmic imbalance; actions that harmed others created the primary debt`
    : h8.length >= 2 ? `8H cluster (${h8.join('+')}) — root karma formed through power contracts, hidden dealings, or transformation resistance`
    : h12.length >= 2 ? `12H cluster (${h12.join('+')}) — root karma formed through incomplete surrender, abandoned spiritual practice, or unfinished renunciation`
    : ak && [6,8,12].includes(H(ak)) ? `Atmakaraka ${ak} in H${H(ak)} (dusthana) — root karma formed through misuse of the soul's primary gift: ${ak}-type energy was used without dharmic alignment`
    : 'distributed root karma — no single dominant 6H/8H/12H cluster; karma formed through accumulated small choices across many domains';

  // Layer 2: Previous life identity (approximate from AK + Sun + 10H)
  const PL_IDENTITY = {
    Sun: ST('Sun').includes('Exalted') ? 'stable royal or priestly identity — soul knew its purpose and held power with dignity' : 'authority-bearing identity that carried too much ego — identity was tied to position, which was then stripped',
    Moon: 'identity tied to caring and holding others — the soul defined itself through nurturing, which created codependency patterns',
    Mars: 'warrior or enforcer identity — the soul defined itself through battle and conquest; identity was strong but created violent karma',
    Mercury: 'merchant, scribe, or intellectual identity — knowledge and communication defined the self; karma formed through how words were used',
    Jupiter: 'teacher, priest, or judge identity — wisdom was the identity; karma formed through whether wisdom was shared honestly or hoarded',
    Venus: 'artist, diplomat, or beloved identity — beauty and relationships defined the self; karma formed through how love was given or withheld',
    Saturn: 'laborer, builder, or servant identity — endurance defined the self; karma formed through resentment or lack of recognition for work done',
    Rahu: 'outsider or innovator identity — transgression of norms defined the self; karma formed through ambition without wisdom',
    Ketu: 'mystic, exile, or renunciate identity — detachment defined the self; karma formed through incomplete surrender or abandonment of others'
  };
  const plIdentity = PL_IDENTITY[ak||'Saturn'];

  // Layer 3: Collapse event
  const collapseEvent = H('Saturn')===8&&B('Saturn')>=60 ? 'karmic collapse through loss of institutional support — a system, kingdom, or authority structure that defined the previous life collapsed, taking the soul with it'
    : H('Rahu')===8 ? 'betrayal-induced collapse — someone trusted revealed themselves as the source of the greatest harm; the betrayal ended the life or its meaning'
    : h8.includes('Mars')&&h8.includes('Ketu') ? 'violent and sudden ending — Mars-Ketu in H8 indicates the previous life ended through conflict, accident, or forced departure'
    : h8.includes('Moon') ? 'emotional collapse that ended the life — grief, loss of a beloved, or psychological breakdown that the soul could not survive'
    : B('Jupiter')<40 && [6,8,12].includes(H('Jupiter')) ? 'faith collapse — Jupiter weak/afflicted indicates the collapse of belief that made life meaningful; the soul lost all purpose'
    : 'gradual dissolution — no single catastrophic collapse; the previous life wound down through accumulated losses and eventual release';

  // Layer 4: Final emotion at death (critical — becomes subconscious baseline)
  const d60MoonH = H('Moon');
  const finalEmotion = (planets.Saturn?.aspects||[]).includes(d60MoonH) ? '"Regret" — Saturn-Moon creates a final emotional freeze of regret; this becomes the subconscious baseline of this birth, creating a persistent feeling that things should have been different'
    : Math.abs((planets.Rahu?.sid||0)-(planets.Moon?.sid||0))<10 ? '"Terror" — Rahu-Moon creates a final emotional freeze of fear; this creates an underlying anxiety in this life that exceeds what current circumstances explain'
    : (planets.Mars?.aspects||[]).includes(H('Moon')) ? '"Rage" — Mars-Moon creates a final emotional freeze of unresolved anger; this creates a hair-trigger emotional response that seems disproportionate to events'
    : Math.abs((planets.Venus?.sid||0)-(planets.Moon?.sid||0))<10 ? '"Grief for lost love" — Venus-Moon creates a final emotional freeze of heartbreak; this creates a melancholy undertone and idealized searching for lost love'
    : Math.abs((planets.Ketu?.sid||0)-(planets.Moon?.sid||0))<10 ? '"Emptiness" — Ketu-Moon creates a final emotional freeze of void; this creates a disconnection from life-force that can feel like depression without cause'
    : '"Acceptance" — Moon relatively unafflicted suggests the soul exited with some degree of peace; this creates greater emotional flexibility in this birth';
  const moonH = H('Moon');

  // Layer 5: Which ancestor continues through you
  const ancestorContinue = ST('Sun').includes('Debilitated') || [6,8,12].includes(H('Sun'))
    ? 'paternal grandfather karma — Sun affliction indicates you are continuing unfinished work from the male paternal line, likely a grandfather who left something incomplete'
    : [6,8,12].includes(H('Moon')) ? 'maternal grandmother karma — Moon in dusthana indicates you carry the emotional pattern of a grandmother who suffered without completion'
    : ST('Saturn').includes('Exalted') || B('Saturn') >= 70 ? 'burden-bearing ancestral line — strong Saturn indicates you continue the work of whoever in the lineage carried the most responsibility without recognition'
    : H('Jupiter') === 9 ? 'teacher/priest ancestor — Jupiter in H9 indicates you continue the dharmic mission of a teacher, priest, or wise elder in the lineage'
    : 'distributed ancestral continuation — no single dominant ancestor line; you carry threads from multiple family members';

  // Layer 6: Previous life power use
  const powerUse = (planets.Sun?.combust || [6,8,12].includes(H('Sun'))) && B('Rahu')>=55 ? 'power was misused through ego — Sun-Rahu pattern indicates authority was used for personal gain or harm; this creates current life authority conflicts'
    : H('Mars')===8 && !ST('Mars').includes('Exalted') ? 'power was used through violence — Mars in H8 indicates force was applied without sufficient justification; carries forward as guilt and anger loops'
    : ST('Saturn').includes('Own') || ST('Saturn').includes('Exalted') ? 'power was used through system control — Saturn strong indicates previous life held power through institutions; if misused, creates current life restriction karma'
    : [6,8,12].includes(H('Jupiter')) ? 'wisdom was withheld or corrupted — Jupiter in dusthana indicates knowledge or guidance was not fully shared or was used manipulatively'
    : 'power appears to have been used relatively responsibly — no strong power-abuse signature in this chart configuration';

  // Layer 7: Mode of death
  const modeOfDeath = h8.includes('Mars') && h8.includes('Ketu') ? 'weapon or violent force — Mars+Ketu in H8 strongly indicates previous death through combat, accident, or physical force'
    : H('Saturn')===8 ? 'prolonged illness or imprisonment — Saturn in H8 indicates slow death through chronic disease, starvation, or enforced containment'
    : H('Rahu')===8 ? 'poisoning, betrayal, or unnatural death — Rahu in H8 indicates previous death through deception or an unusual/unexpected cause'
    : h8.includes('Moon') ? 'drowning or emotional collapse — Moon in H8 indicates death through water or psychological breakdown'
    : h8.includes('Sun') ? 'political fall or heat — Sun in H8 indicates death through authority conflict, execution, or exposure'
    : 'natural progression — no strongly violent death signature; previous exit was likely from age or illness';

  // D60 Liberation Key
  const libKey = H('Ketu')===12 ? 'Ketu in H12 — liberation comes through complete surrender of personal identity; the last obstacle is the belief that there is a "you" to protect'
    : B('Jupiter')>=70 && planets.Jupiter?.rasiIdx===planets.Jupiter?.navamsaRasiIdx ? 'Jupiter Vargottama — liberation comes through teaching; the last debt is wisdom that must be transmitted before the cycle closes'
    : allYogas.some(y=>y.name.includes('Vipareeta')) ? 'Vipareeta Raja Yoga — liberation comes through allowing destruction; the soul must stop preventing the collapse of what needs to fall'
    : ST('Ketu').includes('Exalted') ? 'Ketu exalted — liberation is unusually close; the soul has earned the right to exit the cycle; this life completes the arc'
    : 'forgiveness — the liberation key is releasing a specific person or event from judgment; the last bondage is the grip of old grievance';

  return {
    d60RootCause: { summary: `D60 Root Cause: ${rootCause}` },
    d60PrevIdentity: { summary: `D60 Previous Life Identity: ${plIdentity}` },
    d60CollapseEvent: { summary: `D60 Collapse Event: ${collapseEvent}` },
    d60FinalEmotion: { summary: `D60 Final Emotion at Death: ${finalEmotion}` },
    d60AncestorContinue: { summary: `D60 Ancestor Continuation: ${ancestorContinue}` },
    d60PowerUse: { summary: `D60 Power Use Pattern: ${powerUse}` },
    d60ModeOfDeath: { summary: `D60 Mode of Death: ${modeOfDeath}` },
    d60LibKey: { summary: `D60 Liberation Key: ${libKey}` },
  };
}

module.exports.getEsotericEngines = getEsotericEngines;
module.exports.getD60ForensicEngines = getD60ForensicEngines;
