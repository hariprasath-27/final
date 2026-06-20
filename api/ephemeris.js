'use strict';
const { julian, solar, moonposition } = require('astronomia');

// Lahiri Ayanamsha - precise values by year
function getLahiriAyanamsha(jd) {
  const T = (jd - 2451545.0) / 36525;
  // IAU formula refined
  return 23.85 + 0.013604167 * T - 0.000000139 * T * T;
}

function norm(x) { return ((x % 360) + 360) % 360; }
function sid(trop, ayan) { return norm(trop - ayan); }
function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

const RASI_NAMES = ['Mesha','Rishabha','Mithuna','Kataka','Simha','Kanya','Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];
const RASI_EN   = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const RASI_TAMIL= ['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const RASI_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const RASI_EXALT= {Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6}; // index
const RASI_DEBIL= {Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
const RASI_OWN  = {Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};

const NAK_NAMES = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha',
  'Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha',
  'Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_TAMIL = ['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்',
  'மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை',
  'மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்',
  'பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
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

const DASHA_ORDER = ['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];

// Planet positions using simplified VSOP87 + mean elements
function getPlanetPositions(jdUT) {
  const T = (jdUT - 2451545.0) / 36525;
  const ayan = getLahiriAyanamsha(jdUT);

  // Moon (high accuracy from astronomia)
  const moonPos = moonposition.position(jdUT);
  const moonTrop = norm(toDeg(moonPos.lon));
  const moonSid = sid(moonTrop, ayan);

  // Sun (high accuracy from astronomia)
  const sunTrop = norm(solar.apparentLongitude(jdUT) * 180 / Math.PI);
  const sunSid = sid(sunTrop, ayan);

  // Other planets - simplified VSOP87 mean elements with major perturbations
  function norm360(x){ return ((x%360)+360)%360; }

  // Mercury
  const Mmer = norm360(174.7948 + 4.09233445*T*36525);
  const merTrop = norm360(252.2509 + 149472.6746*T
    + (23.44*Math.sin(toRad(Mmer)) + 2.98*Math.sin(toRad(2*Mmer))
    - 0.14*Math.sin(toRad(3*Mmer))) - 77.4561);

  // Venus
  const Mven = norm360(212.2606 + 58517.8041*T*36525/36525);
  const venTrop = norm360(181.9798 + 58517.8157*T
    + (0.7758*Math.sin(toRad(Mven)) + 0.0033*Math.sin(toRad(2*Mven))) - 131.5637);

  // Mars
  const Mmar = norm360(19.3730 + 19140.2993*T);
  const marTrop = norm360(355.4332 + 19140.2993*T
    + (10.6912*Math.sin(toRad(Mmar)) + 0.6228*Math.sin(toRad(2*Mmar))
    + 0.0503*Math.sin(toRad(3*Mmar))) - 286.5016);

  // Jupiter
  const Mjup = norm360(20.9 + 3034.906*T);
  const jupTrop = norm360(34.3515 + 3034.9057*T
    + (5.5549*Math.sin(toRad(Mjup)) + 0.1683*Math.sin(toRad(2*Mjup))
    - 0.0072*Math.sin(toRad(3*Mjup))) - 14.3312);

  // Saturn
  const Msat = norm360(317.0207 + 1222.1138*T);
  const satTrop = norm360(50.0775 + 1222.1138*T
    + (6.3585*Math.sin(toRad(Msat)) + 0.2204*Math.sin(toRad(2*Msat))
    - 0.0108*Math.sin(toRad(3*Msat))) - 92.8553);

  // Rahu (mean ascending node - accurate)
  const rahuTrop = norm360(125.044555 - 1934.136261*T + 0.0020708*T*T);
  const ketuTrop = norm360(rahuTrop + 180);

  const planets = {
    Sun:     { trop: sunTrop,  sid: sid(sunTrop, ayan)  },
    Moon:    { trop: moonTrop, sid: moonSid              },
    Mars:    { trop: marTrop,  sid: sid(marTrop, ayan)   },
    Mercury: { trop: merTrop,  sid: sid(merTrop, ayan)   },
    Jupiter: { trop: jupTrop,  sid: sid(jupTrop, ayan)   },
    Venus:   { trop: venTrop,  sid: sid(venTrop, ayan)   },
    Saturn:  { trop: satTrop,  sid: sid(satTrop, ayan)   },
    Rahu:    { trop: rahuTrop, sid: sid(rahuTrop, ayan)  },
    Ketu:    { trop: ketuTrop, sid: sid(ketuTrop, ayan)  },
  };

  // Add rasi, house-rasi-index, nakshatra
  for (const [name, p] of Object.entries(planets)) {
    p.rasiIdx  = Math.floor(p.sid / 30);
    p.rasi     = RASI_NAMES[p.rasiIdx];
    p.rasiEn   = RASI_EN[p.rasiIdx];
    p.rasiTamil= RASI_TAMIL[p.rasiIdx];
    p.degInRasi= p.sid % 30;
    p.nakIdx   = Math.floor(p.sid / (360/27));
    p.nakshatra= NAK_NAMES[p.nakIdx];
    p.nakshatraTamil = NAK_TAMIL[p.nakIdx];
    p.pada     = Math.floor((p.sid % (360/27)) / ((360/27)/4)) + 1;
    p.nakLord  = NAK_LORD[p.nakIdx];
  }

  return { planets, ayanamsha: ayan };
}

function calcLagna(jdUT, lat, lon) {
  const T = (jdUT - 2451545.0) / 36525;
  const ayan = getLahiriAyanamsha(jdUT);

  // GMST in degrees
  let gmst = 280.46061837 + 360.98564736629*(jdUT-2451545) + 0.000387933*T*T - T*T*T/38710000;
  gmst = norm(gmst);
  const lst = norm(gmst + lon);

  // Obliquity
  const eps = toRad(23.439291111 - 0.013004167*T);
  const latR = toRad(lat);
  const ramcR = toRad(lst);

  // Ascendant formula
  const y = Math.cos(ramcR);
  const x = -(Math.sin(eps)*Math.tan(latR) + Math.cos(eps)*Math.sin(ramcR));
  let ascTrop = norm(toDeg(Math.atan2(y, x)));
  const ascSid = sid(ascTrop, ayan);
  const lagnaIdx = Math.floor(ascSid / 30);

  return {
    tropLon: ascTrop,
    sidLon:  ascSid,
    degInRasi: ascSid % 30,
    rasiIdx: lagnaIdx,
    rasi: RASI_NAMES[lagnaIdx],
    rasiEn: RASI_EN[lagnaIdx],
    rasiTamil: RASI_TAMIL[lagnaIdx],
    lord: RASI_LORD[lagnaIdx],
  };
}

function calcDasha(dob, nakIdx, nakDegInNak) {
  const nakLord = NAK_LORD[nakIdx];
  const nakFraction = nakDegInNak / (360/27);
  const balanceYears = (1 - nakFraction) * NAK_YEARS[nakLord];

  const birthMs = new Date(dob).getTime();
  const dashaSequence = [];
  let startLordIdx = DASHA_ORDER.indexOf(nakLord);
  let cumYears = 0;

  // Build 3 full cycles (360 yrs) to cover past and future
  for (let i = 0; i < 27; i++) {
    const lord = DASHA_ORDER[(startLordIdx + i) % 9];
    const years = i === 0 ? balanceYears : NAK_YEARS[lord];
    const startMs = birthMs + cumYears * 365.25 * 24 * 3600 * 1000;
    const endMs   = startMs + years * 365.25 * 24 * 3600 * 1000;
    dashaSequence.push({
      lord,
      years: parseFloat(years.toFixed(2)),
      startDate: new Date(startMs).toISOString().slice(0,10),
      endDate:   new Date(endMs).toISOString().slice(0,10),
      startYear: parseFloat((new Date(startMs).getFullYear() + new Date(startMs).getMonth()/12).toFixed(2)),
      endYear:   parseFloat((new Date(endMs).getFullYear() + new Date(endMs).getMonth()/12).toFixed(2)),
    });
    cumYears += years;
  }

  // Find current dasha
  const now = Date.now();
  const current = dashaSequence.find(d => new Date(d.startDate) <= now && new Date(d.endDate) > now);

  // Build antardashas for current mahadasha
  let antardashas = [];
  if (current) {
    const mStart = new Date(current.startDate).getTime();
    const mYears = current.years;
    let aStartLordIdx = DASHA_ORDER.indexOf(current.lord);
    let aCum = 0;
    for (let j = 0; j < 9; j++) {
      const aLord = DASHA_ORDER[(aStartLordIdx + j) % 9];
      const aYrs  = (mYears * NAK_YEARS[aLord]) / 120;
      const aStartMs = mStart + aCum * 365.25 * 24 * 3600 * 1000;
      const aEndMs   = aStartMs + aYrs * 365.25 * 24 * 3600 * 1000;
      antardashas.push({
        lord: aLord,
        years: parseFloat(aYrs.toFixed(2)),
        startDate: new Date(aStartMs).toISOString().slice(0,10),
        endDate:   new Date(aEndMs).toISOString().slice(0,10),
      });
      aCum += aYrs;
    }
  }

  const currentAntar = antardashas.find(a => new Date(a.startDate) <= now && new Date(a.endDate) > now);

  return { dashaSequence, current, antardashas, currentAntar };
}

function getPlanetStatus(name, rasiIdx) {
  if (name === 'Rahu' || name === 'Ketu') return 'Shadow planet';
  if (RASI_EXALT[name] === rasiIdx) return 'Exalted (Uchham)';
  if (RASI_DEBIL[name] === rasiIdx) return 'Debilitated (Neecham)';
  if (RASI_OWN[name]?.includes(rasiIdx)) return 'Own Sign (Swakshetra)';
  const lord = RASI_LORD[rasiIdx];
  const friends = {
    Sun:['Moon','Mars','Jupiter'], Moon:['Sun','Mercury'],
    Mars:['Sun','Moon','Jupiter'], Mercury:['Sun','Venus'],
    Jupiter:['Sun','Moon','Mars'], Venus:['Mercury','Saturn'],
    Saturn:['Mercury','Venus']
  };
  if (friends[name]?.includes(lord)) return 'Friendly sign';
  return 'Neutral / Enemy sign';
}

function getHouseNum(lagnaRasiIdx, planetRasiIdx) {
  return ((planetRasiIdx - lagnaRasiIdx + 12) % 12) + 1;
}

function detectYogas(planets, lagnaIdx) {
  const yogas = [];
  const p = planets;

  // Pancha Mahapurusha
  const kendrHouses = [1,4,7,10];
  for (const [name, data] of Object.entries(p)) {
    const h = getHouseNum(lagnaIdx, data.rasiIdx);
    if (!kendrHouses.includes(h)) continue;
    if (getPlanetStatus(name, data.rasiIdx).includes('Exalted') ||
        getPlanetStatus(name, data.rasiIdx).includes('Own')) {
      const yogaNames = {Mars:'Ruchaka',Mercury:'Bhadra',Jupiter:'Hamsa',Venus:'Malavya',Saturn:'Shasha'};
      if (yogaNames[name]) yogas.push({name:`${yogaNames[name]} Yoga`,type:'good',planet:name,house:h,
        desc:`${name} ${getPlanetStatus(name,data.rasiIdx)} in H${h} — ${yogaNames[name]} Yoga`});
    }
  }

  // Gajakesari — Jupiter in Kendra from Moon
  const moonH = getHouseNum(lagnaIdx, p.Moon.rasiIdx);
  const jupH  = getHouseNum(lagnaIdx, p.Jupiter.rasiIdx);
  const jupFromMoon = ((p.Jupiter.rasiIdx - p.Moon.rasiIdx + 12)%12)+1;
  if ([1,4,7,10].includes(jupFromMoon))
    yogas.push({name:'Gajakesari Yoga',type:'good',planet:'Jupiter',
      desc:'Jupiter in Kendra from Moon — fame, wealth, good character, respected in society'});

  // Mangal Dosha — Mars in H1,2,4,7,8,12
  const marsH = getHouseNum(lagnaIdx, p.Mars.rasiIdx);
  if ([1,2,4,7,8,12].includes(marsH))
    yogas.push({name:'Mangal Dosha',type:'bad',planet:'Mars',house:marsH,
      desc:`Mars in H${marsH} — affects marriage harmony, partner must also have Mangal Dosha`});

  // Kaal Sarpa — all planets between Rahu and Ketu
  const rahuSid = p.Rahu.sid;
  const ketuSid = p.Ketu.sid;
  const planetNames = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
  const allBetween = planetNames.every(n => {
    const s = p[n].sid;
    return (s > rahuSid && s < ketuSid) || (s > rahuSid || s < ketuSid);
  });
  // simplified check
  const sidVals = planetNames.map(n => p[n].sid);
  const minS = Math.min(...sidVals), maxS = Math.max(...sidVals);
  if (Math.abs(rahuSid - ketuSid) < 5 || (minS > Math.min(rahuSid,ketuSid) && maxS < Math.max(rahuSid,ketuSid)))
    yogas.push({name:'Kaal Sarpa Yoga (partial)',type:'warn',
      desc:'Planets clustered between Rahu-Ketu axis — intense karmic life, obstacles then liberation'});

  // Neecha Bhanga — debilitated planet saved
  for (const [name, data] of Object.entries(p)) {
    if (getPlanetStatus(name, data.rasiIdx).includes('Debilitated')) {
      yogas.push({name:`${name} Neecham`,type:'warn',planet:name,
        desc:`${name} debilitated in ${data.rasi} — weakened significations, check Neecha Bhanga`});
    }
  }

  // Rahu-Venus conjunction
  if (Math.abs(p.Rahu.sid - p.Venus.sid) < 10)
    yogas.push({name:'Rahu-Venus Conjunction',type:'warn',
      desc:'Rahu with Venus — intense desires, unconventional relationships, foreign connections, artistic obsession'});

  return yogas;
}

// Geocode using a simple lookup for major Indian cities
const CITY_COORDS = {
  'kottayam':      {lat:9.5916,  lon:76.5222, tz:5.5, name:'Kottayam, Kerala'},
  'chennai':       {lat:13.0827, lon:80.2707,  tz:5.5, name:'Chennai, Tamil Nadu'},
  'mumbai':        {lat:19.0760, lon:72.8777,  tz:5.5, name:'Mumbai, Maharashtra'},
  'delhi':         {lat:28.6139, lon:77.2090,  tz:5.5, name:'Delhi'},
  'bangalore':     {lat:12.9716, lon:77.5946,  tz:5.5, name:'Bangalore, Karnataka'},
  'bengaluru':     {lat:12.9716, lon:77.5946,  tz:5.5, name:'Bangalore, Karnataka'},
  'hyderabad':     {lat:17.3850, lon:78.4867,  tz:5.5, name:'Hyderabad'},
  'kolkata':       {lat:22.5726, lon:88.3639,  tz:5.5, name:'Kolkata'},
  'pune':          {lat:18.5204, lon:73.8567,  tz:5.5, name:'Pune'},
  'ahmedabad':     {lat:23.0225, lon:72.5714,  tz:5.5, name:'Ahmedabad'},
  'coimbatore':    {lat:11.0168, lon:76.9558,  tz:5.5, name:'Coimbatore'},
  'madurai':       {lat:9.9252,  lon:78.1198,  tz:5.5, name:'Madurai'},
  'trivandrum':    {lat:8.5241,  lon:76.9366,  tz:5.5, name:'Thiruvananthapuram'},
  'thiruvananthapuram':{lat:8.5241,lon:76.9366,tz:5.5, name:'Thiruvananthapuram'},
  'kozhikode':     {lat:11.2588, lon:75.7804,  tz:5.5, name:'Kozhikode'},
  'thrissur':      {lat:10.5276, lon:76.2144,  tz:5.5, name:'Thrissur'},
  'ernakulam':     {lat:9.9816,  lon:76.2999,  tz:5.5, name:'Ernakulam'},
  'kochi':         {lat:9.9312,  lon:76.2673,  tz:5.5, name:'Kochi'},
  'salem':         {lat:11.6643, lon:78.1460,  tz:5.5, name:'Salem'},
  'tirunelveli':   {lat:8.7139,  lon:77.7567,  tz:5.5, name:'Tirunelveli'},
  'trichy':        {lat:10.7905, lon:78.7047,  tz:5.5, name:'Tiruchirappalli'},
  'tiruchirappalli':{lat:10.7905,lon:78.7047,  tz:5.5, name:'Tiruchirappalli'},
  'vellore':       {lat:12.9165, lon:79.1325,  tz:5.5, name:'Vellore'},
  'mysore':        {lat:12.2958, lon:76.6394,  tz:5.5, name:'Mysore'},
  'vijayawada':    {lat:16.5062, lon:80.6480,  tz:5.5, name:'Vijayawada'},
  'visakhapatnam': {lat:17.6868, lon:83.2185,  tz:5.5, name:'Visakhapatnam'},
};

function getCityCoords(place) {
  const key = place.toLowerCase().trim().split(',')[0].trim();
  return CITY_COORDS[key] || null;
}

function buildFullChart(dob, tob, place, overrides = {}) {
  // Parse date and time
  const [year, month, day] = dob.split('-').map(Number);
  const [hh, mm] = tob.split(':').map(Number);

  const coords = getCityCoords(place);
  if (!coords) throw new Error(`City not found: "${place}". Please use a major Indian city name.`);

  // Convert IST to UTC
  const utcHours = hh - coords.tz + mm/60;
  const utcDay   = day + utcHours/24;
  const jdUT = julian.CalendarGregorianToJD(year, month, utcDay);

  const { planets, ayanamsha } = getPlanetPositions(jdUT);
  const lagna = calcLagna(jdUT, coords.lat, coords.lon);

  // Override if user provides Rasi/Nakshatra/Lagna
  let lagnaIdx = lagna.rasiIdx;
  if (overrides.lagna) {
    const idx = RASI_NAMES.indexOf(overrides.lagna);
    if (idx >= 0) { lagnaIdx = idx; lagna.rasiIdx = idx; lagna.rasi = RASI_NAMES[idx]; }
  }
  if (overrides.rasi) {
    const idx = RASI_NAMES.indexOf(overrides.rasi);
    if (idx >= 0) { planets.Moon.rasiIdx = idx; planets.Moon.rasi = RASI_NAMES[idx]; }
  }
  if (overrides.nakshatra) {
    const nIdx = NAK_NAMES.indexOf(overrides.nakshatra);
    if (nIdx >= 0) {
      planets.Moon.nakIdx    = nIdx;
      planets.Moon.nakshatra = NAK_NAMES[nIdx];
      planets.Moon.nakLord   = NAK_LORD[nIdx];
      planets.Moon.pada      = 2;
    }
  }

  // Add house numbers to all planets
  for (const [name, p] of Object.entries(planets)) {
    p.house = getHouseNum(lagnaIdx, p.rasiIdx);
    p.status = getPlanetStatus(name, p.rasiIdx);
    p.lord = name;
  }

  // Nakshatra from Moon
  const moonNakIdx  = planets.Moon.nakIdx;
  // If nakshatra was overridden, use middle of nakshatra for Dasha balance calc
  const moonDegInNakOverride = overrides.nakshatra && NAK_NAMES.indexOf(overrides.nakshatra) >= 0;
  const moonDegInNak = moonDegInNakOverride ? (360/27)*0.5 : planets.Moon.sid % (360/27);

  const nakshatra = {
    name:    NAK_NAMES[moonNakIdx],
    tamil:   NAK_TAMIL[moonNakIdx],
    lord:    NAK_LORD[moonNakIdx],
    gana:    NAK_GANA[moonNakIdx],
    nadi:    NAK_NADI[moonNakIdx],
    yoni:    NAK_YONI[moonNakIdx],
    pada:    planets.Moon.pada,
    index:   moonNakIdx,
    degInNak: parseFloat(moonDegInNak.toFixed(4)),
  };

  const dasha = calcDasha(dob, moonNakIdx, moonDegInNak);
  const yogas = detectYogas(planets, lagnaIdx);

  // Build house occupants map
  const houses = {};
  for (let h = 1; h <= 12; h++) houses[h] = [];
  for (const [name, p] of Object.entries(planets)) {
    houses[p.house].push(name);
  }

  // Lagna lord details
  const lagnaLord = RASI_LORD[lagnaIdx];
  const lagnaLordPlanet = planets[lagnaLord];

  return {
    input: { dob, tob, place, coords },
    jd: jdUT,
    ayanamsha: parseFloat(ayanamsha.toFixed(4)),
    lagna: {
      ...lagna,
      rasiIdx: lagnaIdx,
      rasi: RASI_NAMES[lagnaIdx],
      rasiEn: RASI_EN[lagnaIdx],
      rasiTamil: RASI_TAMIL[lagnaIdx],
      lord: lagnaLord,
      lordHouse: lagnaLordPlanet?.house,
    },
    rasi: {
      name: planets.Moon.rasi,
      tamil: planets.Moon.rasiTamil,
      en: planets.Moon.rasiEn,
      lord: RASI_LORD[planets.Moon.rasiIdx],
      index: planets.Moon.rasiIdx,
    },
    nakshatra,
    planets,
    houses,
    dasha,
    yogas,
    metadata: {
      calculatedAt: new Date().toISOString(),
      method: 'Lahiri Ayanamsha, Sidereal, Whole Sign Houses',
    }
  };
}

module.exports = { buildFullChart, RASI_NAMES, NAK_NAMES, NAK_LORD, NAK_YEARS,
  DASHA_ORDER, getCityCoords, NAK_GANA, NAK_NADI, NAK_YONI, RASI_TAMIL, NAK_TAMIL };
