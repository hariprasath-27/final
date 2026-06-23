
 
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
 
  // New computed fields
  const moonPhaseStr = chart.moonPhase
    ? `${chart.moonPhase.paksha} | Tithi ${chart.moonPhase.tithi} | Sun-Moon angle ${chart.moonPhase.diff}°`
    : '';
  const karakaStr = chart.karakas
    ? Object.entries(chart.karakas).map(([k,v])=>`${k}: ${v}`).join(' | ')
    : '';
  const arudhaStr = chart.arudhaLagna ? `${chart.arudhaLagna.rasi}` : '';
  const upapadaStr = chart.upapadaLagna ? `${chart.upapadaLagna.rasi}` : '';
  const navamsaStr = chart.navamsa
    ? Object.entries(chart.navamsa.planets)
        .map(([n,p])=>`${n}:${p.rasi} H${p.house} ${p.status.split(' ')[0]}`)
        .join(' | ')
    : '';
  const aspectStr = chart.houseAspects
    ? Object.entries(chart.houseAspects)
        .filter(([,pl])=>pl.length)
        .map(([h,pl])=>`H${h}<-${pl.join(',')}`)
        .join(' ')
    : '';
 
  // Advanced engine data
  const houseLordStr = chart.houseLords
    ? Object.entries(chart.houseLords).map(([h,l])=>l.summary).join('\n')
    : '';
  const transitStr = chart.transits?.summary || '';
  const venusStr = chart.venusAffliction?.summary || '';
  const divorceStr = chart.divorceIndicators?.summary || '';
  const psychStr = chart.psychProfile?.summary || '';
  const gandantaStr = chart.gandanta?.length
    ? chart.gandanta.map(g=>g.desc).join(' | ') : 'No Gandanta planets';
  const a7Str = chart.a7?.rasi || '';
  const d10Str = chart.d10 ? Object.entries(chart.d10.planets)
    .map(([n,p])=>`${n}:${p.rasi} H${p.house}`).join(' | ') : '';
  const d7Str = chart.d7 ? `Jupiter in D7: ${chart.d7.planets?.Jupiter?.rasi} H${chart.d7.planets?.Jupiter?.house}` : '';
  const sadeSati = chart.transits?.sadeSati ? 'YES — SADE SATI ACTIVE' : 'No';
  const dashaTriggersStr = chart.dashaEventTriggers
    ? [
        chart.dashaEventTriggers.marriage?.length ? 'Marriage windows: '+chart.dashaEventTriggers.marriage.slice(0,3).join(', ') : '',
        chart.dashaEventTriggers.career?.length   ? 'Career windows: '+chart.dashaEventTriggers.career.slice(0,2).join(', ') : '',
        chart.dashaEventTriggers.wealth?.length   ? 'Wealth windows: '+chart.dashaEventTriggers.wealth.slice(0,2).join(', ') : '',
        chart.dashaEventTriggers.children?.length ? 'Children windows: '+chart.dashaEventTriggers.children.slice(0,2).join(', ') : '',
        chart.dashaEventTriggers.foreign?.length  ? 'Foreign windows: '+chart.dashaEventTriggers.foreign.slice(0,2).join(', ') : '',
        chart.dashaEventTriggers.currentPratyantar ? 'Current Pratyantar: '+chart.dashaEventTriggers.currentPratyantar : '',
      ].filter(Boolean).join(' | ')
    : '';
  const upapadaLordStr = chart.upapadaLordAnalysis?.summary || '';
  const navamsaMarriageStr = chart.navamsaMarriage?.summary || '';
  const secondMarriageStr = chart.secondMarriage?.summary || '';
  const secretRelStr = chart.secretRelationship?.summary || '';
  const foreignStr = chart.foreignSettlement?.summary || '';
  const childrenTimingStr = chart.childrenTiming?.summary || '';
 
  // Scoring engine data
  const rankingStr = chart.planetRanking
    ? 'STRONGEST: ' + (chart.planetRanking.strongest||[]).join(' | ') +
      ' || WEAKEST: ' + (chart.planetRanking.weakest||[]).join(' | ')
    : '';
  const contradictionStr = (chart.contradictions||[])
    .map(c => c.resolution).join(' | ');
  const shockFactsStr = (chart.verifiedShockFacts||[])
    .filter(f => f.confidence === 'HIGH' || f.count >= 2)
    .map(f => f.statement).join(' | ');
  const marriageScoreStr = chart.marriageScores?.summary || '';
  const weightedStr = chart.weightedScores ? [
    chart.weightedScores.marriage?.summary,
    chart.weightedScores.career?.summary,
    chart.weightedScores.wealth?.summary,
    chart.weightedScores.health?.summary,
    'TOP STRENGTHS: '+(chart.weightedScores.topPositive||[]).join(' | '),
    'TOP RISKS: '+(chart.weightedScores.topNegative||[]).join(' | '),
  ].join('\n') : '';
  const tripleConfStr = chart.tripleConfirmation?.summary || '';
 
  // Batch 5 precision data
  const lifeStageStr = chart.lifeStage
    ? `Life Stage: ${chart.lifeStage.stage} | ${chart.lifeStage.note}${chart.lifeStage.invalidPredictions?.length ? ' | INVALID for this age: '+chart.lifeStage.invalidPredictions.join(', ') : ''}`
    : '';
  const maturityStr = chart.planetMaturity
    ? `Mature planets (stable results): ${chart.planetMaturity.matureNow?.join(', ')||'none'} | Immature (unstable): ${chart.planetMaturity.immatureNow?.join(', ')||'none'}`
    : '';
  const funcNatureStr = chart.functionalNature
    ? Object.entries(chart.functionalNature).map(([p,n])=>`${p}:${n.role}`).join(' | ')
    : '';
  const relKarmaStr = chart.relationshipKarma?.summary || '';
  const resistanceStr = chart.manifestationResistance?.summary || '';
  const bhriguStr = chart.bhriguBindu?.summary || '';
  const unfinishedStr = chart.unfinishedKarma?.summary || '';
  const probMatrixStr = chart.probabilityMatrix?.summary || '';
 
  // Batch 6 precision data
  const vargottamaStr = chart.vargottama?.length
    ? chart.vargottama.map(v=>v.desc).join(' | ')
    : 'No Vargottama planets';
  const pushkaraStr = chart.pushkaraNavamsa?.length
    ? chart.pushkaraNavamsa.map(v=>v.desc).join(' | ')
    : 'No Pushkara Navamsa planets';
  const dominanceStr = chart.planetDominance
    ? `Dominant: ${chart.planetDominance.dominant?.join(' | ')} | Suppressed: ${chart.planetDominance.suppressed?.join(' | ')}`
    : '';
  const dashaQualityStr = chart.dashaQuality?.summary || '';
  const birthConfStr = chart.birthTimeConfidence?.summary || '';
  const recoveryStr = chart.recoveryIndicators?.summary || '';
  const heatmapStr = chart.transitHeatmap
    ? `Best month: ${chart.transitHeatmap.best} | Worst: ${chart.transitHeatmap.worst} | Scores: ${chart.transitHeatmap.summary}`
    : '';
  const dusthanaStr = chart.dusthanaTransformations?.summary || '';
 
  // Batch 7 — Certainty & Precision
  const rectificationStr = chart.rectificationWarning?.summary || '';
  const marriageStackStr = chart.marriageTriggerStack?.summary || '';
  const venusAffDetailStr = chart.venusAfflictionDetailed?.summary || '';
  const saturnAffDetailStr = chart.saturnAfflictionDetailed?.summary || '';
  const marriageProtStr = chart.marriageProtector?.summary || '';
  const careerProtStr = chart.careerProtector?.summary || '';
  const wealthProtStr = chart.wealthProtector?.summary || '';
  const karmaClassStr = chart.karmaClassification?.summary || '';
 
  // Batch 8 deep analysis
  const houseStoryStr = chart.houseStory ? Object.entries(chart.houseStory.stories||{}).filter(([,s])=>s.specialStory||s.occupants?.length>0).map(([,s])=>s.summary).join(' | ') : '';
  const dispositorStr = chart.dispositorChain?.chartRuler?.summary || '';
  const dispositorChainsStr = chart.dispositorChain ? Object.values(chart.dispositorChain.chains||{}).filter(c=>c.chainLength>2).map(c=>c.summary).join(' | ') : '';
  const clustersStr = chart.planetClusters?.summary || '';
  const elementStr = chart.elementBalance?.summary || '';
  const modalityStr = chart.modalityEngine?.summary || '';
  const alLagnaStr = chart.alVsLagna?.summary || '';
  const breakpointsStr = chart.breakpointYears?.summary || '';
  const wealthStyleStr = chart.wealthStyle?.summary || '';
  const relWoundsStr = chart.relationshipWounds?.summary || '';
  const powerStr = chart.powerEngine?.summary || '';
  const fearStr = chart.fearEngine?.summary || '';
  const nakshatraDeepStr = chart.nakshatraDeep?.summary || '';
  const peakPowerStr = chart.peakPowerYears?.summary || '';
 
  // Batch 9 domain engines
  const parentKarmaStr = chart.parentKarma?.summary || '';
  const businessJobStr = chart.businessVsJob?.summary || '';
  const lossStr = chart.lossEngine?.summary || '';
  const reputationStr = chart.reputationEngine?.summary || '';
  const inLawStr = chart.inLawKarma?.summary || '';
  const siblingStr = chart.siblingKarma?.summary || '';
  const debtStr = chart.debtLitigation?.summary || '';
  const repeatedKarmaStr = chart.repeatedKarma?.summary || '';
 
  // Batch 10 deep karma engines
  const kulaDevataStr = chart.kulaDevata?.summary || '';
  const finalSentenceStr = chart.finalSentence?.summary || '';
  const soulExhaustionStr = chart.soulExhaustion?.summary || '';
  const vakShaktiStr = chart.vakShakti?.summary || '';
  const sacredSoundStr = chart.sacredSound?.summary || '';
  const drishtiStr = chart.drishtiShakti?.summary || '';
  const swapnaStr = chart.swapnaEngine?.summary || '';
  const guruArrivalStr = chart.guruArrival?.summary || '';
  const hiddenEnemyStr = chart.hiddenEnemy?.summary || '';
  const sacredFearStr = chart.sacredFear?.summary || '';
  const divineProtStr = chart.divineProtection?.summary || '';
  const preBirthStr = chart.preBirthChoice?.summary || '';
  const breakingEventStr = chart.breakingEvent?.summary || '';
  const deathPurposeStr = chart.deathPurpose?.summary || '';
  const shaktiStr = chart.shaktiAwakening?.summary || '';
  const shadowInhStr = chart.shadowInheritance?.summary || '';
  const forgiveStr = chart.personToForgive?.summary || '';
  const almostLivedStr = chart.lifeAlmostLived?.summary || '';
  const timeKarmaStr = chart.timeOfDayKarma?.summary || '';
  const transitTriggersStr = chart.transitTriggers
    ? [
        chart.transitTriggers.marriage?.length  ? 'MARRIAGE TRIGGERS: '+chart.transitTriggers.marriage.join(' | ')  : '',
        chart.transitTriggers.career?.length    ? 'CAREER TRIGGERS: '+chart.transitTriggers.career.join(' | ')      : '',
        chart.transitTriggers.wealth?.length    ? 'WEALTH TRIGGERS: '+chart.transitTriggers.wealth.join(' | ')      : '',
        chart.transitTriggers.health?.length    ? 'HEALTH TRIGGERS: '+chart.transitTriggers.health.join(' | ')      : '',
        chart.transitTriggers.property?.length  ? 'PROPERTY TRIGGERS: '+chart.transitTriggers.property.join(' | ') : '',
        'Current transit positions: Jupiter in '+chart.transitTriggers.currentPositions?.jupiter+
          ', Saturn in '+chart.transitTriggers.currentPositions?.saturn+
          ', Rahu in '+chart.transitTriggers.currentPositions?.rahu,
        chart.transitTriggers.doubleTransitActive ? 'DOUBLE TRANSIT ACTIVE — major life event now' : '',
      ].filter(Boolean).join('\n')
    : '';
  const refinedMarriageStr = chart.refinedMarriage?.summary || '';
  const healthEngineStr = chart.healthEngine?.summary || '';
  const wealthEngineStr = chart.wealthEngine?.summary || '';
  const propertyEngineStr = chart.propertyEngine?.summary || '';
  const argalaStr = [
    chart.argala7  ? 'H7 (marriage): '+chart.argala7.summary  : '',
    chart.argala10 ? 'H10 (career): '+chart.argala10.summary  : '',
    chart.argala1  ? 'H1 (self): '+chart.argala1.summary      : '',
  ].filter(Boolean).join('\n');
  const doubleTransit = chart.transits?.doubleTransit ? 'YES — major events likely now' : 'No';
 
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
 
VIMSHOTTARI HOUSE LORDS (every house lord placement — critical for reading):
${houseLordStr}
 
CURRENT TRANSITS (live planetary positions now):
${transitStr}
Sade Sati: ${sadeSati}
Double Transit: ${doubleTransit}
 
MARRIAGE ANALYSIS:
Venus Affliction: ${venusStr}
Divorce Indicators: ${divorceStr}
A7 Darapada (relationship image): ${a7Str}
Upapada Lord Analysis: ${upapadaLordStr}
Navamsa Marriage Engine: ${navamsaMarriageStr}
Second Marriage Indicators: ${secondMarriageStr}
Secret Relationship Indicators: ${secretRelStr}
 
DASHA EVENT TRIGGERS (when specific events are most likely):
${dashaTriggersStr}
 
CHILDREN TIMING: ${childrenTimingStr}
FOREIGN SETTLEMENT: ${foreignStr}
 
REFINED MARRIAGE TRIGGER (2-of-4 rule applied):
${refinedMarriageStr}
 
EXACT TRANSIT TRIGGERS RIGHT NOW:
${transitTriggersStr}
 
HEALTH ENGINE:
${healthEngineStr}
 
WEALTH TIMING ENGINE:
${wealthEngineStr}
 
PROPERTY ENGINE:
${propertyEngineStr}
 
ARGALA (hidden influences on key houses):
${argalaStr}
 
PLANET RANKING (weighted by bala + yogas + combustion):
${rankingStr}
 
VERIFIED PSYCHOLOGICAL PATTERNS (3+ indicators confirmed):
${shockFactsStr||'No high-confidence psychological patterns detected'}
 
CONTRADICTIONS TO RESOLVE (planet is both strong and afflicted):
${contradictionStr||'No major contradictions'}
 
MARRIAGE STABILITY SCORES:
${marriageScoreStr}
 
WEIGHTED SCORES (D1+D9+UL blended — use these for strength assessment):
${weightedStr}
 
TRIPLE CONFIRMATION (event only predicted if 3+ confirmations):
${tripleConfStr}
 
LIFE STAGE CONTEXT (age filter — do not make predictions invalid for this age):
${lifeStageStr}
 
PLANET MATURITY (immature planets give unstable/delayed results):
${maturityStr}
 
FUNCTIONAL NATURE FOR THIS LAGNA (use this, not generic planet nature):
${funcNatureStr}
 
RELATIONSHIP KARMA: ${relKarmaStr}
MANIFESTATION RESISTANCE: ${resistanceStr}
UNFINISHED KARMA: ${unfinishedStr}
BHRIGU BINDU: ${bhriguStr}
PROBABILITY MATRIX: ${probMatrixStr}
 
VARGOTTAMA PLANETS (same sign D1+D9 — exceptional strength, full results):
${vargottamaStr}
 
PUSHKARA NAVAMSA (special grace positions — afflictions softened):
${pushkaraStr}
 
PLANET DOMINANCE (ranked by combined strength — these control the reading):
${dominanceStr}
 
CURRENT DASHA QUALITY:
${dashaQualityStr}
 
TRANSIT HEATMAP (next 6 months):
${heatmapStr}
 
RECOVERY INDICATORS (where healing comes from):
${recoveryStr}
 
DUSTHANA TRANSFORMATIONS (6/8/12 are not always bad):
${dusthanaStr}
 
BIRTH TIME CONFIDENCE & RECTIFICATION WARNING:
${birthConfStr}
${rectificationStr}
 
MARRIAGE TRIGGER STACK (event certainty):
${marriageStackStr}
 
AFFLICTION SEVERITY:
Venus: ${venusAffDetailStr}
Saturn: ${saturnAffDetailStr}
 
DOMAIN PROTECTORS:
${marriageProtStr}
${careerProtStr}
${wealthProtStr}
 
KARMA CLASSIFICATION (Fixed / Flexible / Avoidable / Earned):
${karmaClassStr}
 
HOUSE STORY ENGINE (lord placement tells the real story — use these for all house interpretations):
${houseStoryStr}
 
DISPOSITOR CHAIN (hidden chart ruler and planet root controllers):
Chart ruler: ${dispositorStr}
Key chains: ${dispositorChainsStr}
 
PLANET CLUSTERS (concentrated karma zones):
${clustersStr}
 
ELEMENT & MODALITY BALANCE:
${elementStr}
${modalityStr}
 
PUBLIC IMAGE vs TRUE SELF (AL vs Lagna):
${alLagnaStr}
 
BREAKPOINT YEARS (use for timeline section):
${breakpointsStr}
 
WEALTH STYLE (how money specifically comes to this chart):
${wealthStyleStr}
 
RELATIONSHIP WOUNDS (use in love/marriage sections — 2+ indicators only):
${relWoundsStr}
 
POWER DOMAINS (where this person commands and dominates):
${powerStr}
 
CORE FEARS (subconscious patterns — 2+ indicators only):
${fearStr}
 
NAKSHATRA DEEP PSYCHOLOGY:
${nakshatraDeepStr}
 
PEAK POWER YEARS:
${peakPowerStr}
 
PARENT KARMA (Father/Mother separate — 2+ indicators required):
${parentKarmaStr}
 
BUSINESS vs JOB ANALYSIS:
${businessJobStr}
 
ENERGY LEAKS (where life leaks strength):
${lossStr}
 
REPUTATION & FAME ENGINE:
${reputationStr}
 
IN-LAW KARMA:
${inLawStr}
 
SIBLING KARMA:
${siblingStr}
 
DEBT & LITIGATION RISK:
${debtStr}
 
REPEATED KARMA ACROSS CHARTS (destiny-level patterns):
${repeatedKarmaStr}
 
KULA DEVATA (ancestral deity): ${kulaDevataStr}
FINAL UNFINISHED SENTENCE: ${finalSentenceStr}
SOUL EXHAUSTION INDEX: ${soulExhaustionStr}
VAK SHAKTI (speech power): ${vakShaktiStr}
SACRED SOUND KEY: ${sacredSoundStr}
DRISHTI SHAKTI (energy susceptibility): ${drishtiStr}
SWAPNA ENGINE (dream karma): ${swapnaStr}
GURU ARRIVAL TIMING: ${guruArrivalStr}
HIDDEN ENEMY: ${hiddenEnemyStr}
SACRED FEAR (primary karmic fear): ${sacredFearStr}
DIVINE PROTECTION: ${divineProtStr}
PRE-BIRTH CHOICE: ${preBirthStr}
BREAKING EVENT (identity death): ${breakingEventStr}
DEATH PURPOSE (what must complete): ${deathPurposeStr}
SHAKTI AWAKENING TRIGGER: ${shaktiStr}
SHADOW INHERITANCE: ${shadowInhStr}
PERSON TO FORGIVE: ${forgiveStr}
LIFE ALMOST LIVED: ${almostLivedStr}
TIME OF DAY KARMA: ${timeKarmaStr}
 
PSYCHOLOGICAL PROFILE:
${psychStr}
 
GANDANTA PLANETS:
${gandantaStr}
 
D10 CAREER CHART: ${d10Str}
D7 CHILDREN CHART: ${d7Str}
 
MOON PHASE: ${moonPhaseStr}
ARUDHA LAGNA (public image/reputation): ${arudhaStr}
UPAPADA LAGNA (marriage quality indicator): ${upapadaStr}
KARAKAS: ${karakaStr}
 
NAVAMSA D9 (marriage/soul chart):
${navamsaStr}
 
HOUSE ASPECTS (which planets cast influence on which houses):
${aspectStr}
 
PLANETARY CONDITIONS:
${Object.entries(chart.planets).map(([n,p])=>
  n+': Bala '+p.bala+' | '+(p.retrograde?'RETROGRADE ':' ')+(p.combust?'COMBUST ':' ')+'Avastha:'+p.avastha+' | D9:'+p.navamsaRasi
).join('\n')}
 
DASHA:
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
READING INSTRUCTIONS — FOLLOW EXACTLY:
 
GUARDRAIL RULES — ENFORCE EVERY ONE:
 
SUPPRESSION LIST (never infer these automatically):
× Moon H12 alone → emotional neglect (needs Moon+Saturn/Ketu+H4 = 3+ indicators)
× Rahu H7 alone → foreign spouse (needs H12+9th lord+UL+D9 = 4+ indicators)
× Ketu H5 alone → childlessness or self-sabotage (needs H5 lord+Jupiter+D7 = 3+)
× H12 placement → surrender to parents or parental control (never)
× Sun H4 alone → father decides marriage (needs H9+Sun+Saturn = 2+)
× Venus affliction alone → family rejection (needs H4+H9+UL = 3+)
× Single malefic in dusthana → definite failure (always check Vipareeta/cancellation)
 
PREDICTION FORMULA: Prediction Strength = Natal Promise × Dasha Activation × Transit Trigger × Cancellation Check × Divisional Support. Missing any layer = downgrade to LOW or MEDIUM confidence.
 
CONTRADICTION RULE: For every negative, check: own sign? exalted? vargottama? pushkara? benefic aspect? D9 strong? Vipareeta? If any apply, state: "[negative] exists BUT [positive] partially/fully cancels it. Net result: [balanced conclusion]."
 
CONFIDENCE LABELS (mandatory on every major prediction):
LOW = 1 indicator → "possible tendency"
MEDIUM = 2 indicators → "likely"  
HIGH = 3-4 indicators → "strongly indicated"
VERY HIGH = 5+ indicators → "very strongly indicated"
(Only VERY HIGH allows near-certain language. Never say "will definitely".)
 
MINIMUM CONFIRMATIONS: Psychological 3+. Marriage type 2+. Divorce 3+. Family opposition 3+. Second marriage 3+. Wealth conclusions 3+. Foreign settlement 4+.
 
MARRIAGE ORDER: Analyze in sequence: H7 → H7 lord → Venus → Upapada → UL lord → D9 7th → D9 7th lord → Darakaraka → A7 → dasha → transit. Fewer than 4 favorable = "marriage possible but timing unclear."
 
ALWAYS OUTPUT BOTH: positive factor AND blocking factor for every major prediction.
Format: "[Positive indicator] suggests X, but [negative indicator] suggests friction. Overall: [net conclusion with confidence]."
 
FORBIDDEN: death prediction, terminal disease, exact tragedy, fatal accidents.
TIMING: Primary + secondary + backup windows always. Never binary.
CAREER: 3-5 fields always. Never force one.
 
WEIGHTED SCORING RULE: Use the WEIGHTED SCORES above (not raw planet positions) to determine strength.
Example: Marriage weighted 35/100 = challenging, not just "Jupiter in H7 = good marriage."
The blended D1+D9+UL score is the most accurate marriage indicator.
 
TRIPLE CONFIRMATION RULE: Only make a confident prediction for marriage/career/wealth/children if 3+ confirmations are active (see TRIPLE CONFIRMATION above). If only 1-2 confirmations, say "possible tendency" not "will happen."
 
PRIORITY ORDER (use this to weigh your interpretation):
1. Strongest planets (see PLANET RANKING above) — these dominate the person's life
2. Weakest/afflicted planets — these create the recurring struggles
3. Lagna + Lagna lord condition — fundamental life direction
4. Moon + Nakshatra — emotional patterns and psychology
5. Atmakaraka — soul-level karma and life purpose
6. Current Mahadasha + Antardasha + Pratyantar — what is active RIGHT NOW
7. Transit triggers — exact timing of events
8. Yogas — special gifts and burdens
9. Doshas — where remedies are needed
10. D9 marriage engine — relationship destiny
 
CONTRADICTION RULE: If a planet has both positive and negative indicators (see CONTRADICTIONS above), do NOT choose one side. State both and explain how they interact. Example: "Venus is dignified but combust — the potential is real but expressed inconsistently, with moments of clarity followed by confusion."
 
PROBABILITY LANGUAGE: Never say "you will divorce" or "you will succeed." Say "there is a high tendency" or "the chart strongly suggests" or "this is likely if current patterns continue." Differentiate between a tendency (chart shows inclination) and an event (dasha + transit both active).
 
VERIFIED PSYCHOLOGICAL PATTERNS: Use only the confirmed patterns from VERIFIED PSYCHOLOGICAL PATTERNS section above. Do not invent additional psychological claims without chart evidence.
 
FACTS NOT POETRY: State what, when, and the brief astrological reason. No long explanations. No generic statements.
 
PRIORITY ENGINE — DO THIS FIRST BEFORE WRITING ANYTHING:
Rank the top 3 strongest active karmas right now:
  1. Current Dasha lord (strength + house + natal promise)
  2. Current Antardasha lord (strength + house activation)
  3. Strongest transit trigger active now
Only speak primarily from these top active karmas. Do not give equal weight to inactive placements.
 
DO NOT INTERPRET THE WHOLE CHART. INTERPRET THE MOST ACTIVE CHART. STATE FACTS. NO REASONING FILLER.
 
EVENT CHAIN RULE: Connect events as chains. Job loss → relocation → marriage → wealth. Weak career → foreign move → partner meeting → marriage. Do not isolate events.
 
REAL-LIFE TRANSLATOR RULE: Convert astrology into real behavior. Saturn H7 ≠ "delay" — it means: late commitment, older/serious partner, duty-based marriage, slow bonding. Always translate symbol into lived reality.
 
SHADOW vs GIFT RULE: For every strong placement show both. Strong Mars: gift=drive and courage, shadow=aggression and impatience. Strong Saturn: gift=discipline, shadow=emotional coldness. Never show only one side.
 
MANIFESTATION LEVEL: Score each major prediction 0-100. 0-30=dormant, 31-50=weak, 51-70=moderate, 71-85=strong, 86-100=dominant.
 
Now give the reading:
 
=== ACTIVE KARMA PRIORITY (Run this engine first) ===
State the 3 strongest active karmas right now based on Dasha lord + Antardasha lord + transit.
Format: "1. [Planet] as [role] activates [house/signification] — [real-world meaning now]"
This is the lens for the entire reading. Everything else is secondary.
 
=== SELF ===
Physical appearance (Lagna, Lagna lord, Moon — specific, not generic).
Body constitution and health baseline (Lagna sign, Lagna lord condition).
Mind structure: how this person thinks, decides, processes emotion (Moon, Mercury, Nakshatra).
Natural temperament and aura (Nakshatra gana, element, pada).
Core strengths — which planets give actual gifts and how they show in daily life.
Core weaknesses — which planets create recurring struggle and exactly how.
Gift and shadow for the 2 dominant planets.
 
=== FAMILY ===
Mother (H4, H4 lord, Moon — minimum 2 indicators before stating anything).
Father (H9, H9 lord, Sun — minimum 2 indicators).
Siblings (H3, H3 lord, Mars).
Home karma — what was the emotional environment growing up (H4 condition).
Family financial background (H2, H2 lord).
Inheritance potential (H8, H8 lord, H4 link).
Only state family patterns with 2+ indicators. Never from a single house alone.
 
=== LOVE & RELATIONSHIPS ===
Love nature and attachment style (Venus, Moon, 5th house).
Romantic wounds — only if 3+ indicators confirm (Moon, Venus, Rahu/Ketu involvement, 8th house).
Sexual energy and physical attraction patterns (Mars, Venus, 8th house).
Karmic partner indicators (DK, Rahu-Venus, 8th lord).
Secret relationship risk — only if 2+ indicators (Venus H8/H12, Rahu-Venus, 5th-8th link).
Relationship phase engine: when is attraction phase, when is commitment, when is stability.
 
=== MARRIAGE ===
Analyze in exact order: H7 → H7 lord → Venus → Upapada → UL lord → D9 H7 → D9 H7 lord → DK → A7 → dasha → transit.
State for each: strong, weak, neutral, afflicted.
Type: Love / Arranged / Hybrid (2+ indicators required for each).
Partner nature (H7 sign, 7th lord sign, Darakaraka nature — real-world translation).
Partner profession (Darakaraka, D9 7th lord, A7).
Partner appearance (7th lord sign, D9 7th sign).
Timing: primary window + secondary + backup. Never binary.
Stability score from MARRIAGE STABILITY SCORES section.
Conflict pattern (Mars/Saturn in H7, Venus affliction — translate to real behavior).
Divorce risk: only if 3+ indicators. State each indicator.
Second marriage risk: only if 3+ indicators.
Use blended D1+D9+UL score from WEIGHTED SCORES — state it explicitly.
 
=== CHILDREN ===
Use H5, H5 lord, Jupiter, D7, Putrakaraka, dasha. All 5 required before stating strong prediction.
Fertility and timing (Jupiter transit over H5, Jupiter Bhukti, D7 Jupiter).
Child karma — bond quality, nature of children.
Concerns — only if 2+ indicators. Ketu H5 alone is NOT enough.
 
=== CAREER ===
Best 3-5 career fields (D10, H10 lord, Sun, Mercury, Saturn, Amatyakaraka — real professions not symbols).
Work style: leadership or service, independent or team, creative or analytical.
Business potential (H7, Mercury, Jupiter, 11th lord).
Career shift periods (Saturn transit H10, Rahu dasha, major Mahadasha change).
Promotion timing (Jupiter transit H10/H6, current Antardasha).
Peak career period — which Dasha brings highest achievement and why.
 
=== MONEY ===
Wealth pattern: does money come through career, business, inheritance, spouse, or sudden gains.
Use: H2, H11, their lords, Jupiter, Dhana yogas, current dasha — all required.
Savings vs expenditure tendency (H2 vs H12, Saturn vs Jupiter).
Debt risk (H6, H6 lord).
Property (H4, Mars, Moon — timing from dasha).
Inheritance (H8, H8 lord, 9th lord).
Peak money windows: top 3 from WEALTH TIMING ENGINE section.
Loss periods: when H12 lord activates, Ketu Bhukti, 8th lord period.
 
=== HEALTH ===
Vulnerable body parts from Lagna sign (state from HEALTH ENGINE section).
2 highest chronic risk areas (from H6, H8, H12 analysis — 2+ indicators each).
Mental health patterns (Moon, Mercury, 4th house — 2+ required).
Accident risk (Mars, 8th house — 2+ required).
Surgery indicators (Mars H6/H8, 8th lord active, Saturn transit H1/H8 — 3+ required).
Danger periods from HEALTH ENGINE danger periods section.
Recovery strength from RECOVERY INDICATORS section.
 
=== FOREIGN & TRAVEL ===
Use FOREIGN SETTLEMENT section — state score and level directly.
Need 4+ signals. State exactly how many present.
Foreign career potential (Mercury H12, Rahu, 9th-12th link).
Migration timing (Rahu Dasha, 12th lord active, Jupiter transit H9/H12).
Foreign spouse: only if H12+9th lord+UL+D9 all align (4+ indicators).
 
=== SPIRITUAL & KARMA ===
Past life indicators (Ketu house, AK house, Rahu-Ketu axis, D60 if available).
Unfinished karma from UNFINISHED KARMA section — state directly.
Occult ability (H8, H12, Ketu, Neptune-type placements).
Spiritual growth period (Ketu Dasha, 12th lord active, Jupiter-Ketu connection).
Ancestral karma (Pitru Dosha, Sun-Rahu, 9th house affliction).
Core life lesson (Atmakaraka sign and house — what this soul came to master).
 
=== LIFE TIMELINE ===
For each phase, state: dominant karma, major event type, growth theme, pain theme.
Childhood (0-12): family karma, education start, basic personality.
Teen (13-18): education, first social patterns, family dynamics.
Early adult (19-24): education completion, first career, love.
Young adult (25-30): career establishment, marriage window, wealth beginning.
Saturn maturation (31-36): career authority, family stability, property.
Rahu peak (37-45): peak ambition, major decisions, foreign possibility.
Ketu phase (46-60): wisdom, spiritual turning, legacy.
Old age (60+): health patterns, family support, final life quality.
Current phase: state which Dasha is active, what chain of events is being triggered now, next 2 events in chain.
 
=== PEAK WINDOWS ===
Top 3 marriage windows (from REFINED MARRIAGE section — state period + dates + strength score).
Top 3 wealth windows (from WEALTH TIMING ENGINE).
Top 3 career windows.
Top 3 health-risk windows (from HEALTH ENGINE danger periods).
 
=== SPECIAL STRENGTHS ===
What makes this chart exceptional. Which yogas, placements give rare gifts.
Manifestation level for top 2 yogas (score from PLANET DOMINANCE).
 
=== DOSHAS & PARIHARAMS ===
For EVERY dosha in YOGAS & DOSHAS section: ACTIVE or NULLIFIED — state exactly why.
If NULLIFIED — which specific rule cancels it.
If ACTIVE — specific temple (Tamil Nadu or Kerala), deity, day, mantra with count, gemstone with finger and metal, color, food donation.
 
=== 3 LIFE-DEFINING KARMAS ===
At the end, state the 3 strongest repeating patterns across this person's life.
These are not predictions — they are the core story of this chart.
Format: "1. [Pattern name]: [what it means in real life] — [how it shows across career/relationships/health] — [how to work with it]"
This is the deepest part of the reading.
 
${question ? '\n\n=== ANSWER TO YOUR QUESTION ===\n(Address the specific question with full astrological reasoning.)' : ''}`;
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
