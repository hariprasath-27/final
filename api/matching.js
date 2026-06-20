'use strict';
const { NAK_NAMES, NAK_LORD, NAK_GANA, NAK_NADI, NAK_YONI, RASI_NAMES } = require('./ephemeris');

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
  // Friendly pairs from classical texts
  const friendly = [['Horse','Horse'],['Elephant','Elephant'],['Serpent','Serpent'],
    ['Tiger','Deer'],['Deer','Tiger'],['Monkey','Mongoose'],['Mongoose','Monkey']];
  if (friendly.some(([a,c])=>(a===b&&c===g)||(a===g&&c===b)))
    return { score:3, note:`Friendly Yoni (${b}–${g}) — good harmony` };
  return { score:2, note:`Neutral Yoni (${b}–${g}) — acceptable` };
}

// ── Rajju — correct Tamil classical grouping ──
const RAJJU_MAP = {
  1:'Siro', 2:'Kanta', 3:'Kanta', 4:'Nabhi', 5:'Nabhi', 6:'Nabhi',
  7:'Siro', 8:'Kanta', 9:'Kanta', 10:'Nabhi', 11:'Nabhi', 12:'Pada',
  13:'Pada', 14:'Kanta', 15:'Kanta', 16:'Nabhi', 17:'Nabhi', 18:'Siro',
  19:'Siro', 20:'Kanta', 21:'Kanta', 22:'Nabhi', 23:'Nabhi', 24:'Pada',
  25:'Pada', 26:'Kanta', 27:'Kanta'
};
function getRajju(nakIdx) { return RAJJU_MAP[nakIdx + 1] || 'Nabhi'; }

// ── Vedha pairs ──
const VEDHA_PAIRS = [
  [1,18],[2,16],[3,14],[4,12],[5,20],[6,22],[7,24],
  [8,9],[10,25],[11,26],[13,27],[15,21],[17,19]
];

// ── Rasi compatibility — correct directional check ──
function getRasiScore(bIdx, gIdx) {
  if (bIdx === gIdx)
    return { score:4, note:`Same Rasi (${RASI_NAMES[bIdx]}) — acceptable`, pass:true };
  const boyToGirl = ((gIdx - bIdx + 12) % 12) + 1;
  const girlToBoy = ((bIdx - gIdx + 12) % 12) + 1;
  if (boyToGirl===2 || girlToBoy===2)
    return { score:0, note:`2–12 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — inauspicious, domestic tension`, pass:false };
  if (boyToGirl===6 || girlToBoy===6)
    return { score:0, note:`6–8 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — conflict and health concerns`, pass:false };
  if (boyToGirl===5 || girlToBoy===5)
    return { score:7, note:`5–9 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — excellent, most auspicious`, pass:true };
  if (boyToGirl===4 || girlToBoy===4)
    return { score:6, note:`4–10 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — good, stable`, pass:true };
  if (boyToGirl===3 || girlToBoy===3)
    return { score:5, note:`3–11 relationship (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]}) — favorable`, pass:true };
  return { score:4, note:`Neutral (${RASI_NAMES[bIdx]}–${RASI_NAMES[gIdx]})`, pass:true };
}

// ── Nadi Dosha nullification ──
function checkNadiNull(bChart, gChart, bNadi, gNadi) {
  if (bNadi !== gNadi) return []; // no dosha
  const nullifiers = [];
  if (bChart.rasi.index === gChart.rasi.index)
    nullifiers.push('Same Rasi cancels Nadi Dosha');
  if (bChart.nakshatra.index === gChart.nakshatra.index)
    nullifiers.push('Same Nakshatra cancels Nadi Dosha');
  return nullifiers;
}

// ── Mangal Dosha cross-check ──
function checkMangal(chart, label) {
  if (!chart.planets) return null;
  const marsH = chart.planets.Mars?.house;
  if (!marsH || ![1,2,4,7,8,12].includes(marsH)) return null;
  const st = chart.planets.Mars.status || '';
  const nullifiers = [];
  if (st.includes('Exalted') || st.includes('Own')) nullifiers.push('Mars exalted/own sign');
  if ([0,7].includes(chart.lagna?.rasiIdx)) nullifiers.push('Mesha/Vrischika Lagna');
  if (chart.planets.Jupiter?.aspects?.includes(marsH)) nullifiers.push('Jupiter aspects Mars');
  return { house:marsH, nullified:nullifiers.length>0, nullifiers, label };
}

// ── Main calculation ──
function calcPorutham(boyChart, girlChart) {
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

  // 1. DINAM
  const dinam  = ((gNakIdx - bNakIdx + 27) % 27) + 1;
  const dinRem = dinam % 9 || 9;
  const dinPass= ![1,3,5,7].includes(dinRem);
  results['Dinam'] = {
    score:dinPass?3:0, max:3, pass:dinPass, critical:false,
    note:`Count ${dinam}, remainder ${dinRem} — ${dinPass?'Auspicious (health and longevity)':'Inauspicious'}`,
    meaning:'Health and longevity of the couple'
  };

  // 2. GANAM
  const ganaTable = {
    'Deva-Deva':{score:6,pass:true,note:'Same Deva gana — harmonious, virtuous natures'},
    'Manushya-Manushya':{score:6,pass:true,note:'Same Manushya gana — practical balance'},
    'Rakshasa-Rakshasa':{score:6,pass:true,note:'Same Rakshasa gana — both strong-willed, acceptable'},
    'Deva-Manushya':{score:5,pass:true,note:'Deva-Manushya — good, complementary natures'},
    'Manushya-Deva':{score:5,pass:true,note:'Manushya-Deva — good, complementary natures'},
    'Deva-Rakshasa':{score:0,pass:false,note:'Deva-Rakshasa — incompatible temperaments, friction'},
    'Rakshasa-Deva':{score:0,pass:false,note:'Rakshasa-Deva — incompatible temperaments'},
    'Manushya-Rakshasa':{score:2,pass:false,note:'Manushya-Rakshasa — challenging but manageable'},
    'Rakshasa-Manushya':{score:2,pass:false,note:'Rakshasa-Manushya — challenging but manageable'},
  };
  const ganaKey = `${bGana}-${gGana}`;
  const ganaR = ganaTable[ganaKey] || {score:3,pass:true,note:'Neutral Gana combination'};
  results['Ganam'] = { ...ganaR, max:6, critical:false, meaning:'Temperament and personality harmony' };

  // 3. MAHENDRAM
  const mah = ((bNakIdx - gNakIdx + 27) % 27) + 1;
  const mahPass = [4,7,10,13,16,19,22,25].includes(mah);
  results['Mahendram'] = {
    score:mahPass?2:0, max:2, pass:mahPass, critical:false,
    note:`Girl→Boy count: ${mah} — ${mahPass?'Mahendram present — prosperity and happiness':'No Mahendram'}`,
    meaning:'Prosperity and happiness in marriage'
  };

  // 4. STHREE DHIRGHAM
  const sd = ((gNakIdx - bNakIdx + 27) % 27) + 1;
  const sdPass = sd >= 7;
  results['Sthree Dhirgham'] = {
    score:sdPass?2:0, max:2, pass:sdPass, critical:false,
    note:`Boy→Girl distance: ${sd} nakshatras — ${sdPass?'Good (≥7), wife prospers':'Too close (<7), affects wife\'s prosperity'}`,
    meaning:"Wife's prosperity and happiness"
  };

  // 5. YONI
  const yoni = getYoniScore(bYoni, gYoni);
  results['Yoni'] = {
    score:yoni.score, max:4, pass:yoni.score>=2, critical:false,
    note:yoni.note, meaning:'Physical and intimate compatibility'
  };

  // 6. RASI
  const rasi = getRasiScore(bRasiIdx, gRasiIdx);
  results['Rasi'] = {
    score:rasi.score, max:7, pass:rasi.pass, critical:false,
    note:rasi.note, meaning:'Mental compatibility and family harmony'
  };

  // 7. RAJJU — MOST CRITICAL
  const bRajju = getRajju(bNakIdx);
  const gRajju = getRajju(gNakIdx);
  const rajjuPass = bRajju !== gRajju;
  results['Rajju'] = {
    score:rajjuPass?8:0, max:8, pass:rajjuPass, critical:true,
    note:`${bRajju}–${gRajju}: ${rajjuPass?'Different Rajju — SAFE, no longevity threat':'SAME RAJJU — CRITICAL. Classical texts say same Rajju shortens the life of the spouse. Most serious Dosha.'}`,
    meaning:'Longevity — the most critical factor in matching'
  };

  // 8. VEDHAM — CRITICAL
  const bN = bNakIdx+1, gN = gNakIdx+1;
  const hasVedha = VEDHA_PAIRS.some(([a,b])=>(a===bN&&b===gN)||(a===gN&&b===bN));
  results['Vedham'] = {
    score:hasVedha?0:2, max:2, pass:!hasVedha, critical:true,
    note:hasVedha?`Vedha present between Nak ${bN} and ${gN} — karmic obstacles, misfortune`:'No Vedha — auspicious, clear path',
    meaning:'Absence of karmic obstacles'
  };

  // 9. VASIYAM
  const VASIYAM = {
    'Mesha':['Vrischika','Kumbha'],'Rishabha':['Kataka','Tula'],'Mithuna':['Kanya'],
    'Kataka':['Vrischika','Dhanu'],'Simha':['Tula'],'Kanya':['Mithuna','Meena'],
    'Tula':['Makara','Mesha'],'Vrischika':['Kataka'],'Dhanu':['Meena'],
    'Makara':['Mesha'],'Kumbha':['Mesha'],'Meena':['Makara']
  };
  const bRN = RASI_NAMES[bRasiIdx], gRN = RASI_NAMES[gRasiIdx];
  const vasB = VASIYAM[bRN]?.includes(gRN);
  const vasG = VASIYAM[gRN]?.includes(bRN);
  results['Vasiyam'] = {
    score:(vasB||vasG)?2:1, max:2, pass:true, critical:false,
    note:vasB&&vasG?'Mutual Vasiyam — strong attraction':vasB?`${bRN} attracts ${gRN}`:vasG?`${gRN} attracts ${bRN}`:'Neutral — no special attraction',
    meaning:'Attraction and influence between partners'
  };

  // 10. NADI — South Indian / Tamil / Kerala rules
  // IMPORTANT: In Tamil and Kerala tradition, Rajju is the supreme factor.
  // Nadi Dosha is a North Indian (North Dasa Porutham) concept.
  // In South Indian matching:
  //   - Same Nadi is a concern but is NULLIFIED if:
  //     1. Rajju is different (which overrides Nadi in Tamil tradition)
  //     2. Same Rasi
  //     3. Same Nakshatra
  //     4. Different Nakshatra lords (different planets rule their stars)
  //     5. Different Yoni animals (no animal conflict)
  const nadiSame = bNadi === gNadi;
  const nadiNull = [];
  if (nadiSame) {
    // Rule 1 — Rajju differs (Tamil tradition: Rajju passing nullifies Nadi)
    if (rajjuPass)
      nadiNull.push('Different Rajju — In Tamil/Kerala tradition, Rajju is supreme. Passing Rajju overrides Nadi concern.');
    // Rule 2 — Same Rasi
    if (bRasiIdx === gRasiIdx)
      nadiNull.push('Same Rasi nullifies Nadi Dosha');
    // Rule 3 — Same Nakshatra
    if (bNakIdx === gNakIdx)
      nadiNull.push('Same Nakshatra nullifies Nadi Dosha');
    // Rule 4 — Different Nakshatra lords (Pushya=Saturn, Pooram=Venus — different lords = nullified)
    const bNakLord = NAK_LORD[bNakIdx];
    const gNakLord = NAK_LORD[gNakIdx];
    if (bNakLord !== gNakLord)
      nadiNull.push(`Different Nakshatra lords (${bNakLord} vs ${gNakLord}) — Dosha reduced significantly`);
    // Rule 5 — Non-hostile Yoni (Sheep and Rat are not enemy animals)
    if (!YONI_ENEMY[bYoni]?.includes(gYoni) && !YONI_ENEMY[gYoni]?.includes(bYoni))
      nadiNull.push(`Non-hostile Yoni (${bYoni}–${gYoni}) — no animal conflict, Nadi effect further reduced`);
  }
  const nadiNullified = nadiNull.length > 0;
  // In Tamil tradition: if Rajju passes, Nadi is not a blocking issue
  // Score: 0 only if same Nadi AND Rajju also fails AND no other nullifiers
  const nadiScore = !nadiSame ? 8 : nadiNullified ? 6 : 0;
  results['Nadi'] = {
    score: nadiScore,
    max:8, pass: nadiScore >= 4, critical: !nadiNullified && nadiSame,
    nullified: nadiNullified, nullifiers: nadiNull,
    note: nadiSame
      ? nadiNullified
        ? `Same Nadi (${bNadi}) — NULLIFIED under Tamil/Kerala rules: ${nadiNull.join('; ')}`
        : `Same Nadi (${bNadi}) — Dosha present with no nullification. Remedies recommended.`
      : `Different Nadi (${bNadi}–${gNadi}) — Excellent. Healthy children, complementary constitutions.`,
    meaning:"Constitutional compatibility — In Tamil tradition, secondary to Rajju"
  };

  // Mangal cross-check
  const mB = checkMangal(boyChart, 'Boy');
  const mG = checkMangal(girlChart, 'Girl');
  const mangalNotes = [];
  if (mB && mG && !mB.nullified && !mG.nullified)
    mangalNotes.push({type:'good', note:'Both have Mangal Dosha — they cancel each other. Marriage is fine.'});
  else if (mB && !mB.nullified)
    mangalNotes.push({type:'warn', note:`Boy has active Mangal Dosha (Mars H${mB.house}). Remedies or partner with Mangal Dosha recommended.`});
  else if (mG && !mG.nullified)
    mangalNotes.push({type:'warn', note:`Girl has active Mangal Dosha (Mars H${mG.house}). Remedies or partner with Mangal Dosha recommended.`});
  else if (mB?.nullified)
    mangalNotes.push({type:'good', note:`Boy's Mangal Dosha nullified: ${mB.nullifiers.join(', ')}`});
  else if (mG?.nullified)
    mangalNotes.push({type:'good', note:`Girl's Mangal Dosha nullified: ${mG.nullifiers.join(', ')}`});

  // Totals
  const totalScore = Object.values(results).reduce((s,r)=>s+r.score,0);
  const maxScore   = Object.values(results).reduce((s,r)=>s+r.max,0);
  const pct = Math.round((totalScore/maxScore)*100);
  const criticalFails = Object.entries(results).filter(([,r])=>r.critical&&!r.pass).map(([k])=>k);

  let verdict, recommendation, overallHealth;
  // Tamil/Kerala tradition: Rajju is supreme. If Rajju passes, Nadi cannot block.
  const rajjuOk  = results['Rajju'].pass;
  const nadiOk   = results['Nadi'].pass;
  const nadiIsNullified = results['Nadi'].nullified;
  if (!rajjuOk) {
    verdict='Not Recommended'; overallHealth='red';
    recommendation='Rajju Dosha is active — same Rajju is the most serious issue in Tamil astrology. Threatens spousal longevity. Classical Tamil texts strongly advise against this match.';
  } else if (!nadiOk && !nadiIsNullified) {
    // Rajju passes but Nadi fails with no nullification
    verdict='Good Match — Remedy Advised'; overallHealth='green';
    recommendation='Rajju is perfect — this is the most critical factor in Tamil/Kerala tradition and it passes. Same Nadi is present but under Tamil rules, passing Rajju significantly reduces Nadi concern. A simple Nadi Pariharam is advised as precaution before marriage.';
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
    recommendation='Multiple concerns. Detailed astrologer consultation recommended.';
  }

  return {
    results, totalScore, maxScore, pct,
    verdict, recommendation, overallHealth,
    criticalFails, mangalNotes,
    boyNakshatra:NAK_NAMES[bNakIdx], girlNakshatra:NAK_NAMES[gNakIdx],
    boyRasi:RASI_NAMES[bRasiIdx], girlRasi:RASI_NAMES[gRasiIdx],
  };
}

module.exports = { calcPorutham };
