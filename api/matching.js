
'use strict';
const { NAK_NAMES, NAK_LORD, NAK_GANA, NAK_NADI, NAK_YONI, RASI_NAMES } = require('./ephemeris');
 
// ── Planetary friendship table (for Rasi Adhipathi override) ──
const RASI_LORD_LIST = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const PLANET_FRIENDS = {
  Sun:['Moon','Mars','Jupiter'],     Moon:['Sun','Mercury'],
  Mars:['Sun','Moon','Jupiter'],     Mercury:['Sun','Venus'],
  Jupiter:['Sun','Moon','Mars'],     Venus:['Mercury','Saturn'],
  Saturn:['Mercury','Venus'],        Rahu:['Venus','Saturn'],
  Ketu:['Mars','Jupiter']
};
function areFriends(p1, p2) {
  return PLANET_FRIENDS[p1]?.includes(p2) || PLANET_FRIENDS[p2]?.includes(p1);
}
 
// ── Yoni compatibility ──
const YONI_ENEMY = {
  Horse:['Buffalo'],Buffalo:['Horse'],Dog:['Deer'],Deer:['Dog'],
  Serpent:['Mongoose'],Mongoose:['Serpent'],Rat:['Cat'],Cat:['Rat'],
  Elephant:['Lion'],Lion:['Elephant'],Sheep:['Monkey'],Monkey:['Sheep'],
  Tiger:['Cow'],Cow:['Tiger']
};
function getYoniScore(b, g) {
  if (b === g) return { score:4, note:`Same Yoni (${b}) — excellent physical harmony` };
  if (YONI_ENEMY[b]?.includes(g) || YONI_ENEMY[g]?.includes(b))
    return { score:0, note:`Enemy Yoni (${b}–${g}) — physical incompatibility` };
  const friendly = [['Tiger','Deer'],['Deer','Tiger'],['Monkey','Mongoose'],['Mongoose','Monkey']];
  if (friendly.some(([a,c])=>(a===b&&c===g)||(a===g&&c===b)))
    return { score:3, note:`Friendly Yoni (${b}–${g}) — good harmony` };
  return { score:2, note:`Neutral Yoni (${b}–${g}) — acceptable` };
}
 
// ── Rajju — Tamil classical table ──
const RAJJU_MAP = {
  1:'Siro',2:'Kanta',3:'Kanta',4:'Nabhi',5:'Nabhi',6:'Nabhi',
  7:'Siro',8:'Kanta',9:'Kanta',10:'Nabhi',11:'Nabhi',12:'Pada',
  13:'Pada',14:'Kanta',15:'Kanta',16:'Nabhi',17:'Nabhi',18:'Siro',
  19:'Siro',20:'Kanta',21:'Kanta',22:'Nabhi',23:'Nabhi',24:'Pada',
  25:'Pada',26:'Kanta',27:'Kanta'
};
function getRajju(nakIdx) { return RAJJU_MAP[nakIdx+1] || 'Nabhi'; }
 
// ── Vedha pairs ──
const VEDHA_PAIRS = [
  [1,18],[2,16],[3,14],[4,12],[5,20],[6,22],[7,24],
  [8,9],[10,25],[11,26],[13,27],[15,21],[17,19]
];
 
// ── Rasi compatibility — directional check with Rasi Adhipathi override ──
function getRasiResult(bIdx, gIdx) {
  // Same Rasi = Utthamam
  if (bIdx === gIdx) {
    const lord = RASI_LORD_LIST[bIdx];
    return { score:7, note:`Same Rasi (${RASI_NAMES[bIdx]}) — Utthamam. Identical Rasi means shared emotional wavelength, same Rasi lord (${lord}), exceptional family bonding.`, pass:true, adhipathiOverride:false };
  }
 
  const boyToGirl = ((gIdx-bIdx+12)%12)+1;
  const girlToBoy = ((bIdx-gIdx+12)%12)+1;
  const bLord = RASI_LORD_LIST[bIdx];
  const gLord = RASI_LORD_LIST[gIdx];
  const lordsAreFriends = areFriends(bLord, gLord);
 
  // 2-12 relationship
  if (boyToGirl===2 || girlToBoy===2) {
    if (lordsAreFriends)
      return { score:5, note:`2–12 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) BUT Rasi Adhipathi Mitra override: ${bLord} and ${gLord} are friends — Dosha Nivarathi. Acceptable.`, pass:true, adhipathiOverride:true };
    return { score:0, note:`2–12 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — inauspicious. ${bLord} and ${gLord} are not friends — Dosha active.`, pass:false, adhipathiOverride:false };
  }
  // 6-8 relationship
  if (boyToGirl===6 || girlToBoy===6) {
    if (lordsAreFriends)
      return { score:4, note:`6–8 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) BUT Rasi Adhipathi Mitra: ${bLord} and ${gLord} are friends — partially mitigated.`, pass:true, adhipathiOverride:true };
    return { score:0, note:`6–8 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — Shatashtaka Dosha. ${bLord} and ${gLord} are enemies — conflict.`, pass:false, adhipathiOverride:false };
  }
  // 5-9 = best
  if (boyToGirl===5||girlToBoy===5)
    return { score:7, note:`5–9 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — Utthamam, most auspicious`, pass:true, adhipathiOverride:false };
  // 4-10
  if (boyToGirl===4||girlToBoy===4)
    return { score:6, note:`4–10 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — good, stable`, pass:true, adhipathiOverride:false };
  // 3-11
  if (boyToGirl===3||girlToBoy===3)
    return { score:5, note:`3–11 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — favorable`, pass:true, adhipathiOverride:false };
  // 7th
  if (boyToGirl===7)
    return { score:4, note:`7th relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — neutral`, pass:true, adhipathiOverride:false };
  return { score:4, note:`Neutral (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]})`, pass:true, adhipathiOverride:false };
}
 
// ── Nadi Dosha nullification (Tamil/Kerala rules) ──
function checkNadiNull(bNakIdx, gNakIdx, bRasiIdx, gRasiIdx, bNadi, gNadi, rajjuPass) {
  if (bNadi !== gNadi) return [];
  const nullifiers = [];
  if (rajjuPass) nullifiers.push('Different Rajju — Tamil tradition: Rajju is supreme, passing Rajju overrides Nadi concern');
  if (bRasiIdx === gRasiIdx) nullifiers.push('Same Rasi nullifies Nadi Dosha');
  if (bNakIdx === gNakIdx) nullifiers.push('Same Nakshatra nullifies Nadi Dosha');
  if (NAK_LORD[bNakIdx] !== NAK_LORD[gNakIdx])
    nullifiers.push(`Different Nakshatra lords (${NAK_LORD[bNakIdx]} vs ${NAK_LORD[gNakIdx]}) — significantly reduces Nadi effect`);
  if (!YONI_ENEMY[NAK_YONI[bNakIdx]]?.includes(NAK_YONI[gNakIdx]))
    nullifiers.push(`Non-hostile Yoni (${NAK_YONI[bNakIdx]}–${NAK_YONI[gNakIdx]}) — no animal conflict`);
  return nullifiers;
}
 
// ── Mangal/Chovva Dosham with Dosha Samyam ──
function checkChovvaDosham(chart, label) {
  if (!chart.planets) return null;
  const marsH = chart.planets.Mars?.house;
  if (!marsH) return null;
 
  // Check from Lagna
  const fromLagna = [1,2,4,7,8,12].includes(marsH);
  // Check from Chandra (Moon Rasi)
  const moonRasiIdx = chart.rasi?.index ?? 0;
  const lagnaIdx = chart.lagna?.rasiIdx ?? 0;
  const marsRasiIdx = chart.planets.Mars.rasiIdx;
  const marsFromMoon = ((marsRasiIdx - moonRasiIdx + 12) % 12) + 1;
  const fromMoon = [1,2,4,7,8,12].includes(marsFromMoon);
  // Check from Venus
  const venusRasiIdx = chart.planets.Venus?.rasiIdx ?? 0;
  const marsFromVenus = ((marsRasiIdx - venusRasiIdx + 12) % 12) + 1;
  const fromVenus = [1,2,4,7,8,12].includes(marsFromVenus);
 
  const doshaCount = [fromLagna, fromMoon, fromVenus].filter(Boolean).length;
  const hasDosham = doshaCount >= 2; // Dosham if Mars afflicts at least 2 of the 3 reference points
 
  if (!hasDosham) return { hasDosham:false, label, doshaCount, note:`No significant Chovva Dosham (Mars afflicts only ${doshaCount}/3 reference points)` };
 
  // Check nullification
  const nullifiers = [];
  const st = chart.planets.Mars.status || '';
  if (st.includes('Exalted')||st.includes('Own')) nullifiers.push('Mars exalted/own sign');
  if ([0,7].includes(chart.lagna?.rasiIdx)) nullifiers.push('Mesha/Vrischika Lagna');
  if (chart.planets.Jupiter?.aspects?.includes(marsH)) nullifiers.push('Jupiter aspects Mars');
  // Mars in H8 for Kataka/Simha Lagna — classical nullification
  if (marsH===8 && [3,4].includes(chart.lagna?.rasiIdx)) nullifiers.push('Mars in H8 for Kataka/Simha Lagna');
 
  return {
    hasDosham:true, label, doshaCount, nullified:nullifiers.length>0, nullifiers,
    note:`Chovva Dosham present (Mars afflicts ${doshaCount}/3: Lagna=${fromLagna}, Moon=${fromMoon}, Venus=${fromVenus})${nullifiers.length?' — NULLIFIED: '+nullifiers.join(', '):''}`
  };
}
 
// ── Dasa Sandhi check ──
function checkDasaSandhi(chart1, chart2, name1, name2) {
  const warnings = [];
  const now = new Date();
  const oneYear = 365.25*24*3600*1000;
 
  // Check if either person is transitioning Mahadasha within 1 year
  const d1 = chart1.dasha, d2 = chart2.dasha;
 
  // Dangerous dashas to transition into
  const dangerousDashas = ['Saturn','Rahu','Ketu'];
 
  [d1,d2].forEach((d,i)=>{
    const name = i===0?name1:name2;
    // Check if current Mahadasha ends within 1 year
    if (d.current) {
      const endMs = new Date(d.current.endDate).getTime();
      const monthsLeft = (endMs - now.getTime()) / (30.44*24*3600*1000);
      if (monthsLeft <= 12 && monthsLeft >= 0) {
        const nextDasha = d.dashaSequence?.find(ds=>new Date(ds.startDate)>now);
        const isDangerous = dangerousDashas.includes(nextDasha?.lord) || dangerousDashas.includes(d.current.lord);
        if (isDangerous)
          warnings.push(`${name} is transitioning from ${d.current.lord} → ${nextDasha?.lord||'next'} Dasha within ${Math.round(monthsLeft)} months — Dasa Sandhi. Tamil tradition advises against marrying during this transition.`);
        else
          warnings.push(`${name} transitions Mahadasha (${d.current.lord}→${nextDasha?.lord||'next'}) in ${Math.round(monthsLeft)} months — plan marriage before or 6 months after this transition.`);
      }
    }
    // Check if Antardasha transitions within 3 months
    if (d.currentAntar) {
      const antarEnd = new Date(d.currentAntar.endDate).getTime();
      const antarMonths = (antarEnd - now.getTime()) / (30.44*24*3600*1000);
      if (antarMonths <= 3 && antarMonths >= 0)
        warnings.push(`${name}'s Antardasha (${d.current?.lord}–${d.currentAntar.lord}) ends in ${Math.round(antarMonths*4)} weeks — avoid marriage in this transition window.`);
    }
  });
 
  // Check if BOTH are in Sandhi simultaneously — most serious
  const both = warnings.length >= 2;
  return { warnings, bothInSandhi:both };
}
 
// ── Main calculation ──
function calcPorutham(boyChart, girlChart, boyName, girlName) {
  const bNakIdx  = boyChart.nakshatra.index;
  const gNakIdx  = girlChart.nakshatra.index;
  const bRasiIdx = boyChart.rasi.index;
  const gRasiIdx = girlChart.rasi.index;
  const bGana    = boyChart.nakshatra.gana;
  const gGana    = girlChart.nakshatra.gana;
  const bNadi    = boyChart.nakshatra.nadi;
  const gNadi    = girlChart.nakshatra.nadi;
  const bYoni    = boyChart.nakshatra.yoni;
  const gYoni    = girlChart.nakshatra.yoni;
 
  const results = {};
 
  // ── EKA RASI EXCEPTION ──
  // Tamil classical rule: same Rasi + boy star immediately before girl star
  // → Rajju, Vedha, Yoni doshas completely cancelled (Nivarathi / Utthamam)
  const sameRasi    = bRasiIdx === gRasiIdx;
  const boyNakFirst = sameRasi && (gNakIdx === bNakIdx+1);
  const ekaRasi     = boyNakFirst; // Full Eka Rasi Utthamam applies
 
  // 1. DINAM — count from boy to girl, remainder ÷9 not 1,3,5,7
  const dinam   = ((gNakIdx-bNakIdx+27)%27)+1;
  const dinRem  = dinam%9||9;
  const dinPass = ![1,3,5,7].includes(dinRem);
  results['Dinam'] = {
    score:dinPass?3:0, max:3, pass:dinPass, critical:false,
    note:`Boy→Girl count: ${dinam}, remainder: ${dinRem} — ${dinPass?'Auspicious (good health and longevity for couple)':'Inauspicious'}`,
    meaning:'Health and longevity of the couple'
  };
 
  // 2. GANAM
  const ganaTable = {
    'Deva-Deva':{score:6,pass:true,note:'Same Deva gana — virtuous, harmonious natures'},
    'Manushya-Manushya':{score:6,pass:true,note:'Same Manushya gana — practical balance'},
    'Rakshasa-Rakshasa':{score:6,pass:true,note:'Same Rakshasa gana — both strong-willed, acceptable'},
    'Deva-Manushya':{score:5,pass:true,note:'Deva-Manushya — complementary, good'},
    'Manushya-Deva':{score:5,pass:true,note:'Manushya-Deva — complementary, good'},
    'Deva-Rakshasa':{score:0,pass:false,note:'Deva-Rakshasa — incompatible temperaments, chronic friction'},
    'Rakshasa-Deva':{score:0,pass:false,note:'Rakshasa-Deva — incompatible temperaments'},
    'Manushya-Rakshasa':{score:2,pass:false,note:'Manushya-Rakshasa — challenging but manageable with effort'},
    'Rakshasa-Manushya':{score:2,pass:false,note:'Rakshasa-Manushya — challenging but manageable'},
  };
  const gK = `${bGana}-${gGana}`;
  const gR = ganaTable[gK]||{score:3,pass:true,note:'Neutral Gana'};
  results['Ganam'] = { ...gR, max:6, critical:false, meaning:'Temperament and personality harmony' };
 
  // 3. MAHENDRAM — count from girl to boy, auspicious if 4,7,10,13,16,19,22,25
  const mah = ((bNakIdx-gNakIdx+27)%27)+1;
  const mahPass = [4,7,10,13,16,19,22,25].includes(mah);
  results['Mahendram'] = {
    score:mahPass?2:0, max:2, pass:mahPass, critical:false,
    note:`Girl→Boy count: ${mah} — ${mahPass?'Mahendram present — prosperity, children, long happy marriage':'No Mahendram'}`,
    meaning:'Prosperity and happiness in marriage'
  };
 
  // 4. STHREE DHIRGHAM — CORRECT: count from GIRL to BOY
  // Utthamam if >13, Madhyamam if 7-13, fail if <7
  // Nivarathi (not applicable) when same Rasi
  const sdGirlToBoy = ((bNakIdx-gNakIdx+27)%27)+1;
  const sdCancelled = sameRasi;
  const sdPass = sdCancelled || sdGirlToBoy >= 7;
  const sdNote = sdCancelled
    ? 'Same Rasi — Sthree Dhirgham is Nivarathi (not applicable). No harm.'
    : sdGirlToBoy > 13
      ? `Girl→Boy: ${sdGirlToBoy} nakshatras — Utthamam (>13). Excellent for wife's prosperity.`
      : sdGirlToBoy >= 7
        ? `Girl→Boy: ${sdGirlToBoy} nakshatras — Madhyamam (7–13). Acceptable.`
        : `Girl→Boy: ${sdGirlToBoy} nakshatras — Too close (<7). Affects wife's prosperity.`;
  results['Sthree Dhirgham'] = {
    score:sdPass?2:0, max:2, pass:sdPass, critical:false,
    nullified:sdCancelled, note:sdNote,
    meaning:"Wife's prosperity and happiness (count from girl to boy)"
  };
 
  // 5. YONI — with Eka Rasi override
  const yoni = getYoniScore(bYoni, gYoni);
  const yoniScore = ekaRasi && yoni.score<2 ? 2 : yoni.score;
  results['Yoni'] = {
    score:yoniScore, max:4, pass:yoniScore>=2, critical:false,
    nullified: ekaRasi && yoni.score<2,
    note: ekaRasi && yoni.score<2
      ? `${yoni.note} — OVERRIDDEN by Eka Rasi star sequence. No real friction.`
      : yoni.note,
    meaning:'Physical and intimate compatibility'
  };
 
  // 6. RASI — with Rasi Adhipathi override
  const rasiR = getRasiResult(bRasiIdx, gRasiIdx);
  results['Rasi'] = {
    score:rasiR.score, max:7, pass:rasiR.pass, critical:false,
    nullified:rasiR.adhipathiOverride,
    note:rasiR.note, meaning:'Mental compatibility and family harmony'
  };
 
  // 7. RAJJU — with Eka Rasi exception (most critical)
  const bRajju = getRajju(bNakIdx);
  const gRajju = getRajju(gNakIdx);
  const rajjuPassNatural = bRajju !== gRajju;
  const rajjuPass = rajjuPassNatural || ekaRasi;
  results['Rajju'] = {
    score:rajjuPass?8:0, max:8, pass:rajjuPass, critical:!rajjuPass,
    nullified:ekaRasi && !rajjuPassNatural,
    nullifiers:ekaRasi&&!rajjuPassNatural?['Eka Rasi Utthamam — boy star precedes girl star in same Rasi']:[],
    note: ekaRasi && !rajjuPassNatural
      ? `Same Rajju (${bRajju}) BUT CANCELLED — Eka Rasi Utthamam: ${NAK_NAMES[bNakIdx]} precedes ${NAK_NAMES[gNakIdx]} in same Rasi. Rajju Dosha Nivarathi.`
      : rajjuPassNatural
        ? `${bRajju}–${gRajju}: Different Rajju — SAFE, no longevity threat`
        : `SAME RAJJU (${bRajju}) — CRITICAL. Classical texts: same Rajju shortens spouse's lifespan.`,
    meaning:'Longevity — the most critical factor in Tamil matching'
  };
 
  // 8. VEDHAM — with Eka Rasi exception
  const bN=bNakIdx+1, gN=gNakIdx+1;
  const hasVedha = VEDHA_PAIRS.some(([a,b])=>(a===bN&&b===gN)||(a===gN&&b===bN));
  const vedhaPass = !hasVedha || ekaRasi;
  results['Vedham'] = {
    score:vedhaPass?2:0, max:2, pass:vedhaPass, critical:!vedhaPass,
    nullified:ekaRasi&&hasVedha,
    note: ekaRasi&&hasVedha
      ? `Vedha between Nak ${bN}–${gN} CANCELLED by Eka Rasi rule`
      : hasVedha
        ? `Vedha present (Nak ${bN}–${gN}) — karmic obstacles, misfortune`
        : 'No Vedha — clear path, auspicious',
    meaning:'Absence of karmic obstacles'
  };
 
  // 9. VASIYAM
  const VASIYAM = {
    'Mesha':['Vrischika','Kumbha'],'Rishabha':['Kataka','Tula'],'Mithuna':['Kanya'],
    'Kataka':['Vrischika','Dhanu'],'Simha':['Tula'],'Kanya':['Mithuna','Meena'],
    'Tula':['Makara','Mesha'],'Vrischika':['Kataka'],'Dhanu':['Meena'],
    'Makara':['Mesha'],'Kumbha':['Mesha'],'Meena':['Makara']
  };
  const bRN=RASI_NAMES[bRasiIdx], gRN=RASI_NAMES[gRasiIdx];
  const vasB=VASIYAM[bRN]?.includes(gRN), vasG=VASIYAM[gRN]?.includes(bRN);
  results['Vasiyam'] = {
    score:(vasB||vasG)?2:1, max:2, pass:true, critical:false,
    note:vasB&&vasG?'Mutual Vasiyam — strong attraction':vasB?`${bRN} attracts ${gRN}`:vasG?`${gRN} attracts ${bRN}`:'Neutral',
    meaning:'Attraction and influence between partners'
  };
 
  // 10. NADI — with Tamil/Kerala nullification rules
  // Rajju must be determined first (used in Nadi nullification check)
  const nadiSame = bNadi === gNadi;
  const nadiNull = checkNadiNull(bNakIdx, gNakIdx, bRasiIdx, gRasiIdx, bNadi, gNadi, rajjuPass);
  const nadiNullified = nadiNull.length > 0;
  const nadiScore = !nadiSame ? 8 : nadiNullified ? 6 : 0;
  results['Nadi'] = {
    score:nadiScore, max:8, pass:nadiScore>=4, critical:!nadiSame&&!nadiNullified,
    nullified:nadiNullified, nullifiers:nadiNull,
    note: nadiSame
      ? nadiNullified
        ? `Same Nadi (${bNadi}) — NULLIFIED under Tamil rules: ${nadiNull.join('; ')}`
        : `SAME NADI (${bNadi}) — ACTIVE DOSHA. Risk to children's health. Temperament clashes. Remedies mandatory.`
      : `Different Nadi (${bNadi}–${gNadi}) — Excellent. Healthy children, complementary constitutions.`,
    meaning:"Children's health and constitutional compatibility"
  };
 
  // ── Chovva Dosham (Mars affliction) with Dosha Samyam ──
  const chovvaB = checkChovvaDosham(boyChart, 'Boy');
  const chovvaG = checkChovvaDosham(girlChart, 'Girl');
  const chovvaNotes = [];
  if (chovvaB?.hasDosham && chovvaG?.hasDosham && !chovvaB.nullified && !chovvaG.nullified)
    chovvaNotes.push({type:'good', note:'Dosha Samyam — both have Chovva Dosham. They match perfectly. Dosham cancelled by equal affliction.'});
  else if (chovvaB?.hasDosham && !chovvaB.nullified)
    chovvaNotes.push({type:'warn', note:`Boy has Chovva Dosham (${chovvaB.note}). Girl should also have Chovva Dosham or remedies required.`});
  else if (chovvaG?.hasDosham && !chovvaG.nullified)
    chovvaNotes.push({type:'warn', note:`Girl has Chovva Dosham (${chovvaG.note}). Boy should also have Chovva Dosham or remedies required.`});
  else if (chovvaB?.nullified)
    chovvaNotes.push({type:'good', note:`Boy's Chovva Dosham nullified: ${chovvaB.nullifiers.join(', ')}`});
  else if (chovvaG?.nullified)
    chovvaNotes.push({type:'good', note:`Girl's Chovva Dosham nullified: ${chovvaG.nullifiers.join(', ')}`});
  else
    chovvaNotes.push({type:'good', note:'No significant Chovva Dosham in either chart.'});
 
  // ── Dasa Sandhi check ──
  const dasaSandhi = checkDasaSandhi(boyChart, girlChart, boyName||'Boy', girlName||'Girl');
 
  // ── Totals and verdict ──
  const totalScore = Object.values(results).reduce((s,r)=>s+r.score,0);
  const maxScore   = Object.values(results).reduce((s,r)=>s+r.max,0);
  const pct = Math.round((totalScore/maxScore)*100);
  const criticalFails = Object.entries(results).filter(([,r])=>r.critical&&!r.pass).map(([k])=>k);
 
  // Build exceptions list for prompt
  const exceptionsTriggered = [];
  if (ekaRasi) exceptionsTriggered.push(`Eka Rasi Utthamam — ${NAK_NAMES[bNakIdx]} precedes ${NAK_NAMES[gNakIdx]} in same ${RASI_NAMES[bRasiIdx]} Rasi`);
  if (rasiR.adhipathiOverride) exceptionsTriggered.push(`Rasi Adhipathi Mitra override — ${RASI_LORD_LIST[bRasiIdx]} and ${RASI_LORD_LIST[gRasiIdx]} are friends`);
  if (sameRasi) exceptionsTriggered.push(`Same Rasi — Sthree Dhirgham Nivarathi`);
  Object.entries(results).filter(([,r])=>r.nullified).forEach(([k])=>exceptionsTriggered.push(`${k} Dosha Nivarathi`));
 
  let verdict, recommendation, overallHealth;
  const rajjuOk = results['Rajju'].pass;
  const nadiOk  = results['Nadi'].pass;
 
  if (!rajjuOk) {
    verdict='Not Recommended'; overallHealth='red';
    recommendation='Rajju Dosha active — same Rajju is the most critical issue in Tamil astrology. Classical texts strongly advise against this match.';
  } else if (!nadiOk) {
    verdict='Conditional — Remedy Required'; overallHealth='amber';
    recommendation='Nadi Dosha active without nullification. Marriage possible with Grade-A Pariharams before wedding.';
  } else if (pct>=75) {
    verdict='Excellent Match'; overallHealth='green';
    recommendation='Highly recommended. Strong compatibility across all key factors.';
  } else if (pct>=60) {
    verdict='Good Match'; overallHealth='green';
    recommendation='Good compatibility. Proceed with confidence.';
  } else if (pct>=45) {
    verdict='Acceptable Match'; overallHealth='amber';
    recommendation='Acceptable. Address specific weak areas through remedies.';
  } else {
    verdict='Below Average'; overallHealth='amber';
    recommendation='Multiple concerns present. Detailed consultation recommended.';
  }
 
  return {
    results, totalScore, maxScore, pct,
    verdict, recommendation, overallHealth,
    criticalFails, chovvaNotes, dasaSandhi,
    exceptionsTriggered,
    ekaRasiApplied: ekaRasi,
    boyNakshatra:NAK_NAMES[bNakIdx], girlNakshatra:NAK_NAMES[gNakIdx],
    boyRasi:RASI_NAMES[bRasiIdx], girlRasi:RASI_NAMES[gRasiIdx],
  };
}
 
module.exports = { calcPorutham };
