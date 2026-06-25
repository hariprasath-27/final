'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = `You are a deterministic Jyotish-Karma interpreter.
 
ABSOLUTE OUTPUT RULES — VIOLATING THESE MAKES THE READING USELESS:
1. EVERY topic gets EXACTLY 4 lines. No topic gets 3. No topic gets 5. Always 4.
2. NEVER repeat information from another topic in the same reading.
3. Each line must name at least one specific planet, house number, nakshatra, or dasha period.
4. Move to the next topic heading immediately after 4 lines. Never add extra sentences.
5. If evidence is insufficient: write 4 lines saying so with chart basis. Never skip.
6. Complete every sentence. Never cut mid-word.
7. No filler. No poetry. No "in the tapestry of your chart." Direct facts only.
8. Speak as "you" directly to the person.
 
TOPIC FORMAT — use exactly this pattern:
TOPIC NAME
Line 1: [specific planet/house fact]
Line 2: [specific planet/house fact]
Line 3: [specific planet/house fact]
Line 4: [specific planet/house fact]
[blank line]
NEXT TOPIC NAME
...
 
TRUTH LEVELS — append to predictions:
(FIXED = 5+ indicators) (STRONG = 3-4) (POSSIBLE = 2) (WEAK = 1 only)
 
SUPPRESSION:
× Moon H12 alone ≠ neglect × Rahu H7 alone ≠ foreign spouse × Single malefic ≠ definite failure
× No death prediction × No terminal disease × Classical doshas only (Mangal/KalaSarpa/Kemadruma/GuruChandal/Pitru/Shrapit)
× Gemstone only if: (a) functionally benefic for Lagna + (b) bala<55 + (c) current dasha needs it`;
 
function buildMasterFactSheet(chart) {
  const p = chart.planets;
  const d = chart.dasha;
  const ms = chart.marriageScores;
  const pr = chart.planetRanking;
  const rf = chart.refinedMarriage;
  const wt = chart.wealthEngine;
  const ht = chart.healthEngine;
  const ct = chart.childrenTiming;
  const fs = chart.foreignSettlement;
  const sf = chart.verifiedShockFacts || [];
  const co = chart.contradictions || [];
  const tt = chart.transitTriggers;
  const de = chart.divorceIndicators;
  const sm = chart.secondMarriage;
  const va = chart.venusAffliction;
  const ul = chart.upapadaLordAnalysis;
  const nm = chart.navamsaMarriage;
  const pe = chart.propertyEngine;
  const curP = d.prayantardashas?.find(pr => {
    const now = Date.now();
    return new Date(pr.startDate) <= now && new Date(pr.endDate) > now;
  });
 
  return `╔══ MASTER FACT SHEET ══╗
DOMINANCE: ${chart.planetDominance?.dominant?.join(' | ')||''}
WEAK: ${chart.planetDominance?.suppressed?.join(' | ')||''}
CONTRADICTIONS: ${co.map(c=>`${c.planet}: ${c.resolution}`).join(' | ')||'None'}
PATTERNS (2+): ${sf.filter(f=>f.count>=2).map(f=>`[${f.confidence}] ${f.statement}`).join(' | ')||'None'}
SCORES: Marriage ${chart.weightedScores?.marriage?.blended}/100 Career ${chart.weightedScores?.career?.normalized}/100 Wealth ${chart.weightedScores?.wealth?.normalized}/100 Health ${chart.weightedScores?.health?.normalized}/100
REPEATED KARMA: ${chart.repeatedKarma?.summary||''}
MARRIAGE: ${ms?.overall}/100 Emotional:${ms?.emotional}% Stability:${ms?.stability}% Conflict:${ms?.conflict}% Delay:${ms?.delay}%
Venus aff: ${va?.level}(${va?.score}/100) Divorce: ${de?.level} 2nd: ${sm?.summary?.slice(0,50)||'not indicated'}
UL: ${ul?.summary?.slice(0,70)||''} D9: ${nm?.summary?.slice(0,70)||''}
Stack: ${chart.marriageTriggerStack?.summary||''}
Windows: ${(rf?.windows||[]).slice(0,3).map(w=>`${w.period}(${w.dates})${w.strength}`).join(' | ')||''}
CAREER: ${chart.businessVsJob?.verdict||''} D10: ${chart.d10?Object.entries(chart.d10.planets).slice(0,4).map(([n,p])=>`${n}H${p.house}`).join(' '):'N/A'} Rep: ${chart.reputationEngine?.level||''}
WEALTH: ${chart.wealthStyle?.primary||''} Dhana: ${(wt?.dhanaYogas||[]).join(',')||'none'} Peaks: ${(wt?.windows||[]).slice(0,2).map(w=>`${w.period}(${w.strength})`).join(',')||''}
HEALTH: ${ht?.vulnerableBodyParts||''} Dangers: ${(ht?.dangerPeriods||[]).slice(0,2).join('|')||'none'} Recovery: ${chart.recoveryIndicators?.strength||''}
FOREIGN: ${fs?.level}(${fs?.score}/100) ${(fs?.indicators||[]).slice(0,3).join('|')||''}
CHILDREN: ${ct?.summary?.slice(0,100)||''} D7-Jup: ${chart.d7?.planets?.Jupiter?`${chart.d7.planets.Jupiter.rasi}H${chart.d7.planets.Jupiter.house}`:'N/A'}
PROPERTY: ${pe?.summary?.slice(0,70)||''} DEBT: ${chart.debtLitigation?.summary?.slice(0,70)||''}
PARENT: ${chart.parentKarma?.summary||''} SIBLING: ${chart.siblingKarma?.summary?.slice(0,70)||''}
WOUNDS: ${chart.relationshipWounds?.summary?.slice(0,80)||''} POWER: ${chart.powerEngine?.summary?.slice(0,70)||''}
FEAR: ${chart.fearEngine?.summary?.slice(0,70)||''} ELEMENT: ${chart.elementBalance?.summary?.slice(0,70)||''}
AL-LAGNA: ${chart.alVsLagna?.gap?.slice(0,80)||''} DISPOSITOR: ${chart.dispositorChain?.chartRuler?.summary?.slice(0,60)||''}
NAK: ${chart.nakshatraDeep?.summary?.slice(0,90)||''} KARMA-CLASS: ${chart.karmaClassification?.summary?.slice(0,80)||''}
BREAKS: ${chart.breakpointYears?.summary||''} PEAK-PWR: ${chart.peakPowerYears?.summary?.slice(0,70)||''}
DASHA: ${d.current?.lord}MD→${d.currentAntar?.lord}AD→${curP?curP.lord+'PD':'N/A'}
TRANSIT: Jup:${tt?.currentPositions?.jupiter||''} Sat:${tt?.currentPositions?.saturn||''} Rahu:${tt?.currentPositions?.rahu||''}
${tt?.doubleTransitActive?'DOUBLE-TRANSIT':''} ${chart.transits?.sadeSati?'SADE-SATI':''} DashaQ:${chart.dashaQuality?.quality||''}(${chart.dashaQuality?.overall||0}/100)
HEATMAP: ${chart.transitHeatmap?.summary||''} TRIGGERS: ${[...(tt?.marriage||[]),(tt?.career||[]),(tt?.wealth||[])].slice(0,4).join('|')||'none'}
KULA-DEVATA: ${chart.kulaDevata?.summary?.slice(0,70)||''} SOUND: ${chart.sacredSound?.fullMantricKey||''}
SENTENCE: ${chart.finalSentence?.primarySentence||''} EXHAUST: ${chart.soulExhaustion?.score||0}/100
VAK: ${chart.vakShakti?.score||0}/100 DRISHTI: ${chart.drishtiShakti?.level||''} SWAPNA: ${chart.swapnaEngine?.dreamType?.slice(0,40)||''}
GURU: ${chart.guruArrival?.summary?.slice(0,70)||''} HIDDEN-ENEMY: ${chart.hiddenEnemy?.summary?.slice(0,60)||''}
SACRED-FEAR: ${chart.sacredFear?.primaryFear||''} DIVINE-PROT: ${chart.divineProtection?.summary?.slice(0,80)||''}
PRE-BIRTH: ${chart.preBirthChoice?.summary?.slice(0,80)||''} BREAKING: ${chart.breakingEvent?.primary?.desc?.slice(0,70)||''}
DEATH-PURPOSE: ${chart.deathPurpose?.summary?.slice(0,80)||''} SHAKTI-TRIGGER: ${chart.shaktiAwakening?.primaryTrigger||''}
SHADOW-INH: ${chart.shadowInheritance?.summary?.slice(0,70)||''} FORGIVE: ${chart.personToForgive?.primary?.person||''}
ALMOST-LIVED: ${chart.lifeAlmostLived?.summary?.slice(0,80)||''} TIME-KARMA: ${chart.timeOfDayKarma?.summary?.slice(0,70)||''}
DIV-ARCH: ${chart.divineArch?Object.values(chart.divineArch).map(e=>e.summary?.slice(0,40)).join('|'):''}
COSMIC-MEM: ${chart.cosmicMem?Object.values(chart.cosmicMem).map(e=>e.summary?.slice(0,40)).join('|'):''}
COSMIC-DEST: ${chart.cosmicDest?Object.values(chart.cosmicDest).map(e=>e.summary?.slice(0,35)).join('|'):''}
FORBIDDEN: ${chart.forbiddenRishi?Object.values(chart.forbiddenRishi).map(e=>e.summary?.slice(0,35)).join('|'):''}
PL-ORIGIN: ${chart.plOrigin?Object.values(chart.plOrigin).map(e=>e.summary?.slice(0,35)).join('|'):''}
SOUL-AGE-EXP: ${chart.soulAgeExp?Object.values(chart.soulAgeExp).map(e=>e.summary?.slice(0,35)).join('|'):''}
PL-EVENTS: ${chart.plEvents?Object.values(chart.plEvents).map(e=>e.summary?.slice(0,35)).join('|'):''}
SOUL-TRAVEL: ${chart.soulTravel?Object.values(chart.soulTravel).map(e=>e.summary?.slice(0,35)).join('|'):''}
DEEP-MEM: ${chart.deepMemory?Object.values(chart.deepMemory).map(e=>e.summary?.slice(0,35)).join('|'):''}
FINAL-230: ${chart.finalSynth230?Object.values(chart.finalSynth230).map(e=>e.summary?.slice(0,35)).join('|'):''}
RINA-BASIS: H6=${Object.entries(p).filter(([,v])=>v.house===6).map(([n])=>n).join(',')||'empty'} H8=${Object.entries(p).filter(([,v])=>v.house===8).map(([n])=>n).join(',')||'empty'} H12=${Object.entries(p).filter(([,v])=>v.house===12).map(([n])=>n).join(',')||'empty'}
VARGOTTAMA: ${chart.vargottama?.map(v=>v.planet).join(',')||'none'} PUSHKARA: ${chart.pushkaraNavamsa?.map(v=>v.planet).join(',')||'none'}
MATURE: ${chart.planetMaturity?.matureNow?.join(',')||'none'} IMMATURE: ${chart.planetMaturity?.immatureNow?.join(',')||'none'}
FUNC: ${chart.functionalNature?Object.entries(chart.functionalNature).map(([p,n])=>`${p}:${n.role.split('(')[0].trim()}`).join('|'):''}
HOUSES: ${chart.houseStory?Object.values(chart.houseStory.stories||{}).filter(s=>s.specialStory).map(s=>`H${s.house}:${s.specialStory.slice(0,50)}`).join('|'):''}
UNFINISHED: ${chart.unfinishedKarma?.summary?.slice(0,80)||'none'}
╚════════════════════════╝`;
}
 
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: 'POST only' });
 
  try {
    const { dob, tob, place, name, gender, question, lagna, rasi, nakshatra } = req.body;
    if (!dob || !tob || !place || !name)
      return res.status(400).json({ error: 'dob, tob, place, name required' });
 
    const chart = buildFullChart(dob, tob, place, {
      lagna: lagna||undefined, rasi: rasi||undefined, nakshatra: nakshatra||undefined,
    });
 
    const d = chart.dasha;
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender||'not specified' }, question);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const chartCtx = fullPrompt.split(divider)[0].trimEnd();
    const mfs = buildMasterFactSheet(chart);
    const ctx = chartCtx + '\n\n' + mfs;
 
    const call = (topics, tokens) => {
      const topicList = topics.map(t => `${t}\n[4 lines only — no more, no less]`).join('\n\n');
      return anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: tokens,
        system: SYSTEM,
        messages: [{ role: 'user', content: `${ctx}\n\nWrite EXACTLY these topics in order. EXACTLY 4 lines per topic. No skipping. No combining. Use MASTER FACT SHEET data for each.\n\n${topicList}` }],
      });
    };
 
    const [r0,r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25] = await Promise.all([
 
      call(['ACTIVE KARMA PRIORITY','PHYSICAL APPEARANCE','PERSONALITY CORE','EMOTIONAL NATURE','PUBLIC MASK vs INNER SELF'], 1200),
 
      call(['STRENGTHS','WEAKNESSES','HIDDEN TALENTS','BLIND SPOTS','SELF-SABOTAGE PATTERN'], 1200),
 
      call(['FAMILY BACKGROUND','FATHER KARMA','MOTHER KARMA','SIBLING KARMA','CHILDHOOD PATTERN'], 1200),
 
      call(['HOME ENERGY','FAMILY WEALTH PATTERN','LINEAGE BURDEN','BLOODLINE REPETITION','ANCESTRAL BLESSINGS'], 1200),
 
      call(['LOVE NATURE','ATTACHMENT STYLE','ATTRACTION PATTERN','WHY CERTAIN PEOPLE TRIGGER YOU','SOUL RECOGNITION SIGNATURES'], 1200),
 
      call(['RELATIONSHIP KARMA SCORE','KARMIC PARTNER DETECTION','SOUL CONTRACT ENGINE','HIDDEN ENEMY IN SOUL CIRCLE','THE PERSON YOU MUST FORGIVE'], 1200),
 
      call(['MARRIAGE TIMING','MARRIAGE TYPE','SPOUSE NATURE','SPOUSE APPEARANCE','SPOUSE BACKGROUND','SPOUSE PROFESSION'], 1400),
 
      call(['SPOUSE ORIGIN','SPOUSE FAMILY WEALTH','SPOUSE EMOTIONAL PATTERN','MARRIAGE STABILITY','DIVORCE RISK','SEPARATION WINDOWS'], 1400),
 
      call(['WIDOWHOOD RISK','EXTRA-MARITAL RISK','SECOND MARRIAGE POSSIBILITY','MARRIAGE KARMA PURPOSE','WHO SUFFERS MORE IN MARRIAGE','WHO LEAVES FIRST','MARRIAGE DEBT COMPLETION'], 1600),
 
      call(['CHILDBIRTH TIMING','NUMBER OF CHILDREN','GENDER TENDENCIES','DELAYED CHILD KARMA','CHILD LOSS RISK','CHILD RELATIONSHIP PATTERN','KARMIC CHILD DETECTION','UNBORN SOUL QUEUE','CHILDREN PURPOSE'], 1800),
 
      call(['CAREER NATURE','CAREER STABILITY','CAREER GROWTH','CAREER DELAYS','CAREER OBSTACLES','CAREER BREAKTHROUGH','CAREER SHIFT TIMING','BEST INDUSTRY','LEADERSHIP POTENTIAL','BUSINESS vs JOB','FAME POTENTIAL','LEGACY THROUGH WORK'], 2400),
 
      call(['WEALTH POTENTIAL','WEALTH TIMING','WEALTH LOSS PATTERNS','PASSIVE INCOME','INHERITANCE KARMA','FOREIGN WEALTH','DEBT PATTERN','HIDDEN WEALTH BLOCKS','SUDDEN WEALTH WINDOWS','POVERTY KARMA'], 2000),
 
      call(['CORE HEALTH VULNERABILITIES','CHRONIC DISEASE INDICATORS','MENTAL HEALTH PATTERNS','STRESS RESPONSE','NERVOUS SYSTEM WEAKNESS','BODY WEAK POINTS','ACCIDENT RISK','SURGERY INDICATORS','RECOVERY POWER','FINAL LIFE HEALTH PATTERN'], 2000),
 
      call(['FOREIGN TRAVEL','FOREIGN SETTLEMENT','FOREIGN MARRIAGE','FOREIGN WORK','MIGRATION KARMA','EXILE PATTERN','HOMELAND DETACHMENT','BEST DIRECTION FOR GROWTH','SPIRITUAL INCLINATION','MOKSHA GATE'], 2000),
 
      call(['ISHTA DEVATA','KULA DEVATA RECOVERY','GURU ARRIVAL TIMING','TAPASYA DEBT','KUNDALINI AXIS','BHOGA vs YOGA PATH','SPIRITUAL AWAKENING TRIGGER','FINAL LIBERATION PATH'], 1600),
 
      call(['LIFE TIMELINE (current phase first then all phases)','PEAK WEALTH WINDOWS','PEAK MARRIAGE WINDOWS','PEAK CAREER WINDOWS','PEAK HEALTH RISK WINDOWS','FATE INTERRUPTION POINTS','TURNING POINT YEARS','SOUL RIPENING YEARS','FINAL MAJOR CYCLE'], 2000),
 
      call(['MANGAL DOSHA (active/nullified + remedy if active)','PITRU DOSHA','GURU SHAPA','MATRU SHAPA','STRI SHAPA','NAGA SHAPA','KAAL SARPA','VENUS AFFLICTION EFFECT','SATURN MARRIAGE DELAY','GEMSTONE RECOMMENDATION'], 2200),
 
      call(['RINA BANDHA (soul debt)','PITRU KARMA','GARBHA KARMA','VASANA ENGINE','PRARABDHA WEIGHT','SOUL AGE DETECTION','BIRTH MISSION ENGINE','FINAL UNFINISHED SENTENCE','SACRED FEAR MAPPING','SOUL EXHAUSTION INDEX'], 2000),
 
      call(['CURSE ORIGIN TRACING','DREAM KARMA','DREAM VISITOR CLASSIFICATION','DRISHTI SHAKTI','VAK SHAKTI','TEMPLE MEMORY ENGINE','ANIMAL KARMA','BIRTH SCAR KARMA','HOUSE SPIRIT COMPATIBILITY','DIVINE PROTECTION MOMENTS'], 2000),
 
      call(['PRE-BIRTH CHOICE ENGINE','WHY THIS EXACT BIRTH TIME','PARALLEL BIRTH LINK','THE LIFE YOU ALMOST LIVED','ONE EVENT THAT BREAKS THE SELF','KARMA TRANSFER EVENTS','DEATH PURPOSE ENGINE','SOUL EXIT CONDITION','DEHA TYAGA MODE','FINAL SOUL LESSON'], 2000),
 
      call(['TOP 3 LIFE-DEFINING KARMAS','TOP 3 BLESSINGS','CORE LIFE WOUND','CORE LIFE GIFT','REPEATING SUFFERING PATTERN','HIGHEST DESTINY PATH','BIGGEST LIFE TRAP','WHAT MUST BE COMPLETED BEFORE DEATH'], 1800),
 
      call(['SOUL POISON','DHARMA COLLAPSE TRIGGER','DHARMA RETURN TRIGGER','SOUL CONTRACT WITH GOD','DIVINE TEST PATTERN','GRACE ACTIVATION KEY','PREVIOUS LIFE STATUS','PREVIOUS DEATH PATTERN','UNFINISHED PREVIOUS-LIFE BOND','PAST-LIFE REPUTATION'], 2000),
 
      call(['FATE RESISTANCE INDEX','DESTINY ACCEPTANCE INDEX','KARMA BURN RATE','DIVINE INTERVENTION PROBABILITY','MIRACLE WINDOWS','COLLAPSE WINDOWS','REBIRTH PROBABILITY','LIBERATION DISTANCE','SOUL SIGNATURE FREQUENCY','KARMIC GRAVITY CENTER','SHADOW POSSESSION PATTERN','SACRED SACRIFICE POINT','COSMIC PRICE OF DESTINY','HIDDEN NAME OF SOUL','END-OF-LIFE REALIZATION','FINAL LIBERATION OBSTACLE','WHAT UNIVERSE WANTS FROM YOU'], 3400),
 
      call(['PAST-LIFE GEOGRAPHY','CIVILIZATION MEMORY','PAST-LIFE SOCIAL RANK','HOMELAND ATTACHMENT','PAST-LIFE LANGUAGE MEMORY','PAST-LIFE DEATH SCENE','PAST-LIFE BETRAYAL EVENT','UNFINISHED LOVE','PAST-LIFE VOW','LOST CHILD KARMA','ENEMY RETURN KARMA','FORGOTTEN SKILL RETRIEVAL','SOUL FAMILIARITY TRIGGERS','PAST-LIFE FEAR CARRYOVER','PAST-LIFE GUILT CARRYOVER','PAST-LIFE PROMISE ACTIVE','WHO WERE YOU BEFORE','WHAT DID YOU LOSE','WHAT DID YOU BRING','WHAT MUST END','WHAT HAPPENS IF IT ENDS','WHAT HAPPENS IF IT REPEATS'], 4400),
 
      call(['PRETA ATTACHMENT (unsettled dead influence)','SOUL PREDATOR PATTERN (who drains you)','SOUL IMPRISONMENT PATTERN (what traps you)','FORBIDDEN DESIRE ENGINE','SOUL FRAGMENTATION INDEX','REBIRTH DELAY ENGINE','ANCESTOR HUNGER ENGINE','HIDDEN DESIRE ENGINE','WHO WAITS AFTER DEATH','PROMISE BEFORE BIRTH','POSSESSION SUSCEPTIBILITY INDEX','LINEAGE COLLAPSE POINT (are you the breaker)','SHADOW DEITY','COSMIC PUNISHMENT LOOP'], 2800),
 
      call(['D60 ROOT CAUSE (why karma originally formed)','D60 PREVIOUS LIFE IDENTITY','D60 COLLAPSE EVENT (what ended the previous life)','D60 FINAL EMOTION AT DEATH (becomes subconscious baseline now)','D60 ANCESTOR CONTINUATION (which ancestor continues through you)','D60 POWER USE PATTERN','D60 MODE OF DEATH','D60 LIBERATION KEY'], 1600),
 
    ]);
 
    const reading = [r0,r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17,r18,r19,r20,r21,r22,r23,r24,r25]
      .map(r => r?.content?.map(c => c.text||'').join('')||'')
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
 
const RASI_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
