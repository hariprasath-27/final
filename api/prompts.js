
'use strict';
 
function buildReadingPrompt(chart, person, question) {
  const p = chart.planets;
  const d = chart.dasha;
  const today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const age = Math.floor((Date.now()-new Date(chart.input.dob))/(365.25*24*3600*1000));
 
  const planetLines = Object.entries(p).map(([name,data])=>
    `  ${name}: ${data.rasi} ${data.degInRasi.toFixed(2)}° | House ${data.house} | ${data.status}${data.nakshatra?' | Nak: '+data.nakshatra+' Pada '+data.pada:''}`
  ).join('\n');
 
  const pastDashas = d.dashaSequence
    .filter(ds => new Date(ds.endDate) < new Date())
    .slice(-5)
    .map(ds=>`  ${ds.lord} Dasha: ${ds.startDate} → ${ds.endDate}`)
    .join('\n');
 
  const futureDashas = d.dashaSequence
    .filter(ds => new Date(ds.startDate) > new Date())
    .slice(0,3)
    .map(ds=>`  ${ds.lord} Dasha: ${ds.startDate} → ${ds.endDate} (${ds.years.toFixed(1)} yrs)`)
    .join('\n');
 
  const antarLines = d.antardashas.map(a=>
    `  ${d.current?.lord}-${a.lord} Bhukti: ${a.startDate} → ${a.endDate}${a===d.currentAntar?' ← CURRENT':''}`
  ).join('\n');
 
  const yogaLines = chart.yogas.map(y => {
    // Compute nullification on the fly from chart data
    let nullified = y.nullified || false;
    let nullifiers = [...(y.nullifiers||[])];
 
    if (y.name?.includes('Mangal Dosha')) {
      const marsSt = p['Mars']?.status || '';
      const jupAspects = p['Jupiter']?.aspects || [];
      const marsH = p['Mars']?.house;
      const lagnaIdx = chart.lagna?.rasiIdx ?? -1;
      if (marsSt.includes('Exalted') || marsSt.includes('Own'))
        nullifiers.push('Mars is ' + marsSt + ' — Mangal Dosha nullified');
      if (jupAspects.includes(marsH))
        nullifiers.push('Jupiter (H' + p['Jupiter']?.house + ') aspects Mars — Dosha nullified');
      if ([0,7].includes(lagnaIdx))
        nullifiers.push('Mesha/Vrischika Lagna — Mangal Dosha nullified');
      if (nullifiers.length) nullified = true;
    }
 
    if (y.name?.includes('Neecham') || y.name?.includes('Debil')) {
      // Check Neecha Bhanga — lord of debilitation sign in Kendra OR exaltation lord in Kendra
      const KENDRA = [1,4,7,10];
      const RASI_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
      const RASI_EXALT = {Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
      const RASI_DEBIL = {Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
      const planet = y.planet || y.name?.split(' ')[0];
      if (planet && RASI_DEBIL[planet] !== undefined) {
        const debilLord = RASI_LORD[RASI_DEBIL[planet]];
        const exaltLord = RASI_LORD[RASI_EXALT[planet] ?? 0];
        if (KENDRA.includes(p[debilLord]?.house))
          nullifiers.push(debilLord + ' (debilitation sign lord) in H' + p[debilLord]?.house + ' Kendra — Neecha Bhanga');
        if (KENDRA.includes(p[exaltLord]?.house))
          nullifiers.push(exaltLord + ' (exaltation sign lord) in H' + p[exaltLord]?.house + ' Kendra — Neecha Bhanga');
        if (KENDRA.includes(p[planet]?.house))
          nullifiers.push(planet + ' itself in Kendra H' + p[planet]?.house + ' — Neecha Bhanga Raja Yoga');
        if (nullifiers.length) nullified = true;
      }
    }
 
    const statusLabel = nullified ? ' — NULLIFIED' : y.type === 'bad' ? ' — ACTIVE DOSHA' : '';
    const nullInfo = nullified && nullifiers.length ? ' | Nullified by: ' + nullifiers.join('; ') : '';
    return `  [${y.type.toUpperCase()}${nullified?' NULLIFIED':''}] ${y.name}${statusLabel}: ${y.desc}${nullInfo}`;
  }).join('\n');
 
  const houseLines = Object.entries(chart.houses).map(([h,planets])=>
    `  H${h} (${getHouseName(parseInt(h))}): ${planets.length?planets.join(', '):'Empty'}`
  ).join('\n');
 
  return `You are Jothida Pandithar — a deeply experienced Tamil astrologer with 40+ years of practice in South Indian Jyotish. You give precise, personalized readings that feel like sitting with a real astrologer. Every statement MUST cite the specific planet, house, and astrological reason. Be specific with years and ages. Never give generic statements.
 
TODAY: ${today}
 
═══ VERIFIED BIRTH CHART (Swiss Ephemeris, Lahiri Ayanamsha ${chart.ayanamsha}°) ═══
Name: ${person.name} | Gender: ${person.gender} | Age: ${age}
DOB: ${chart.input.dob} | TOB: ${chart.input.tob} | Place: ${chart.input.place} (${chart.input.coords.lat}°N, ${chart.input.coords.lon}°E)
 
LAGNA: ${chart.lagna.rasi} (${chart.lagna.rasiEn}) ${chart.lagna.degInRasi.toFixed(2)}° | Lagna Lord: ${chart.lagna.lord} in House ${chart.lagna.lordHouse}
RASI: ${chart.rasi.name} (${chart.rasi.en}) | Rasi Lord: ${chart.rasi.lord} in House ${p[chart.rasi.lord]?.house}
NAKSHATRA: ${chart.nakshatra.name} (${chart.nakshatra.tamil}) Pada ${chart.nakshatra.pada}
  Lord: ${chart.nakshatra.lord} | Gana: ${chart.nakshatra.gana} | Nadi: ${chart.nakshatra.nadi} | Yoni: ${chart.nakshatra.yoni}
 
ALL 9 PLANETS:
${planetLines}
 
HOUSES:
${houseLines}
 
VIMSHOTTARI DASHA:
Past Dashas:
${pastDashas}
CURRENT: ${d.current?.lord} Mahadasha (${d.current?.startDate} → ${d.current?.endDate})
Antardashas in current Mahadasha:
${antarLines}
Upcoming Mahadashas:
${futureDashas}
 
YOGAS & DOSHAS:
${yogaLines}
 
DOSHA NULLIFICATION RULES (apply these to every Dosha above):
Mangal Dosha NULLIFIED if: Mars is exalted/own sign, OR Jupiter aspects Mars, OR Lagna is Mesha/Vrischika, OR both partners have Mangal Dosha (Dosha Samyam), OR benefic in H7.
Neecha Bhanga Raja Yoga (debilitation cancelled) if: lord of debilitation sign in Kendra from Lagna, OR lord of exaltation sign in Kendra, OR debilitated planet itself in Kendra, OR exaltation lord conjuncts debilitated planet.
Kaal Sarpa NULLIFIED/REDUCED if: any planet conjunct Rahu or Ketu within 5°, OR Jupiter/Venus in Kendra.
Same Nadi Dosha NULLIFIED if: different Rajju, OR same Rasi, OR same Nakshatra, OR different Nakshatra lords.
For EVERY Dosha in this chart: check all nullification conditions above and state clearly whether it is ACTIVE or NULLIFIED and exactly why.
${question ? `\nSPECIFIC QUESTION: ${question}` : ''}
 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Now give a complete Tamil Jyotish reading. For EVERY point, state exactly which planet in which house causes what. Use specific years and ages. Structure with these headers:
 
=== CHARACTER & PERSONALITY ===
(Based on Lagna lord position, Rasi, Nakshatra nature — describe their appearance, personality, strengths, weaknesses, thinking style, emotional nature. Be very specific.)
 
=== WHAT HAS HAPPENED IN LIFE (Past) ===
(Read each past Dasha period. What happened during each — childhood, education, family events, turning points. Connect planet significations to life events with years/ages.)
 
=== CURRENT PERIOD — ${d.current?.lord} DASHA, ${d.currentAntar ? d.current?.lord+'-'+d.currentAntar.lord+' BHUKTI' : ''} ===
(What is happening RIGHT NOW in their life — career, relationships, health, mindset, challenges, opportunities. Very specific to current Dasha lord's house position and nature.)
 
=== CAREER & EDUCATION ===
(10th house, 10th lord, planets in 10th, Sun position, Mercury, Saturn — what career suits them? When does career peak? Key career years based on Dashas.)
 
=== WEALTH & FINANCES ===
(2nd house, 11th house, their lords, Jupiter's role — financial prospects, when wealth comes, any financial challenges.)
 
=== MARRIAGE & RELATIONSHIPS ===
(7th house: ${chart.houses[7]?.join(', ')||'Empty'}, 7th lord: ${p[chart.rasi.lord]?.house}, Venus position — when is marriage likely? What kind of partner? Love or arranged? Mangal Dosha present? Any delays?)
 
=== CHILDREN ===
(5th house: ${chart.houses[5]?.join(', ')||'Empty'}, Jupiter, 5th lord — prospects for children, timing, any concerns.)
 
=== HEALTH ===
(1st house, 6th house, 8th house, their lords — constitution, disease tendencies, which body parts to watch, which periods need health care.)
 
=== NEXT 5 YEARS — YEAR BY YEAR (${new Date().getFullYear()} to ${new Date().getFullYear()+5}) ===
(Go year by year. For each year state: which Antardasha is running, what it means for career/money/relationships/health. Be specific and practical.)
 
=== SPECIAL STRENGTHS OF THIS CHART ===
(What makes this chart exceptional — which yogas, which placements give special gifts or protection.)
 
=== DOSHAS & PARIHARAMS (Remedies) ===
(Go through every Dosha listed in YOGAS & DOSHAS section above. For EACH one state: is it ACTIVE or NULLIFIED? If NULLIFIED — explain exactly why it is cancelled (which rule cancels it) and what that means for this person. If ACTIVE — give the complete remedy: specific temple name in Tamil Nadu or Kerala, presiding deity, day of week, exact mantra with number of repetitions, gemstone with which finger and which metal, colour to wear, food to donate. Be precise and practical.)${question ? '\n\n=== ANSWER TO YOUR QUESTION ===\n(Address the specific question with full astrological reasoning.)' : ''}`;
}
 
function buildMatchPrompt(chart1, chart2, person1, person2, matchResult) {
  const today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
 
  const porLines = Object.entries(matchResult.results).map(([name,r])=>
    `  ${name}: ${r.score}/${r.max} — ${r.note} [${r.pass?'PASS':'FAIL'}${r.critical?' CRITICAL':''}]`
  ).join('\n');
 
  return `You are Jothida Pandithar — master Tamil astrologer. Give a precise marriage compatibility analysis for these two people. TODAY: ${today}
 
═══ PERSON 1: ${person1.name} ═══
DOB: ${chart1.input.dob} | Place: ${chart1.input.place}
Lagna: ${chart1.lagna.rasi} | Rasi: ${chart1.rasi.name} | Nakshatra: ${chart1.nakshatra.name} Pada ${chart1.nakshatra.pada}
Nakshatra Lord: ${chart1.nakshatra.lord} | Gana: ${chart1.nakshatra.gana} | Nadi: ${chart1.nakshatra.nadi} | Yoni: ${chart1.nakshatra.yoni}
7th House (marriage): ${chart1.houses[7]?.join(', ')||'Empty'} | 7th Lord: ${Object.entries(chart1.planets).find(([,p])=>p.house===7)?.[0]||'—'}
Venus: ${chart1.planets.Venus.rasi} H${chart1.planets.Venus.house} | Mars: ${chart1.planets.Mars.rasi} H${chart1.planets.Mars.house}
Current Dasha: ${chart1.dasha.current?.lord} (${chart1.dasha.current?.endDate})
 
═══ PERSON 2: ${person2.name} ═══
DOB: ${chart2.input.dob} | Place: ${chart2.input.place}
Lagna: ${chart2.lagna.rasi} | Rasi: ${chart2.rasi.name} | Nakshatra: ${chart2.nakshatra.name} Pada ${chart2.nakshatra.pada}
Nakshatra Lord: ${chart2.nakshatra.lord} | Gana: ${chart2.nakshatra.gana} | Nadi: ${chart2.nakshatra.nadi} | Yoni: ${chart2.nakshatra.yoni}
7th House (marriage): ${chart2.houses[7]?.join(', ')||'Empty'} | 7th Lord: ${Object.entries(chart2.planets).find(([,p])=>p.house===7)?.[0]||'—'}
Venus: ${chart2.planets.Venus.rasi} H${chart2.planets.Venus.house} | Mars: ${chart2.planets.Mars.rasi} H${chart2.planets.Mars.house}
Current Dasha: ${chart2.dasha.current?.lord} (${chart2.dasha.current?.endDate})
 
═══ 10 PORUTHAM SCORES ═══
${porLines}
TOTAL: ${matchResult.totalScore}/${matchResult.maxScore} (${matchResult.pct}%)
VERDICT: ${matchResult.verdict}
CRITICAL FAILS: ${matchResult.criticalFails.length ? matchResult.criticalFails.join(', ') : 'None'}
 
Give a thorough marriage compatibility reading:
 
=== OVERALL COMPATIBILITY ===
=== EMOTIONAL & MENTAL COMPATIBILITY ===
=== PHYSICAL COMPATIBILITY ===
=== FINANCIAL COMPATIBILITY ===
=== FAMILY LIFE & CHILDREN ===
=== CRITICAL DOSHAS & CONCERNS ===
=== WHEN IS THE RIGHT TIME TO MARRY ===
(Based on both persons' Dasha periods — which year is most auspicious?)
=== PARIHARAMS FOR DOSHAS ===
=== FINAL RECOMMENDATION ===`;
}
 
function getHouseName(h) {
  const names = {1:'Lagna/Self',2:'Dhana/Wealth',3:'Sahaja/Siblings',4:'Bandhu/Home',
    5:'Putra/Children',6:'Ari/Enemies',7:'Kalatra/Marriage',8:'Randhra/Longevity',
    9:'Dharma/Luck',10:'Karma/Career',11:'Labha/Gains',12:'Vyaya/Loss'};
  return names[h] || '';
}
 
module.exports = { buildReadingPrompt, buildMatchPrompt };
