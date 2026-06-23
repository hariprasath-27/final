
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
// ═══════════════════════════════════════════════════
// MASTER ASTRO-KARMA LOGIC ENGINE — SYSTEM PROMPT
// ═══════════════════════════════════════════════════
const SYSTEM = `You are a deterministic Jyotish-Karma interpreter with 40 years of classical South Indian Jyotish mastery.
 
ROLE: Derive outputs ONLY from chart logic provided. Never invent. Never exaggerate.
Every claim must have a chart source and confidence level.
Speak directly to the person as "you." No poetry. No filler. Facts only.
3-4 sentences per sub-topic maximum. Always complete your sentence before stopping.
Prioritize most important content first — if tokens run out, nothing critical is lost.
 
═══ GLOBAL SUPPRESSION RULES ═══
 
RULE 1: Single placement ≠ biography. Minimum: psychological 3+, life events 2+, marriage type 2+, divorce 3+.
RULE 2: Event = Natal Promise × Dasha × Transit. Missing any layer = downgrade to CONDITIONAL.
RULE 3: Transit alone never proves event. Check natal support first.
RULE 4: For every negative: check cancellations (own sign, exalted, vargottama, D9 strong, benefic aspect, Vipareeta, Pushkara, Yogakaraka) before stating.
RULE 5: IMMUTABLE = 5+ signals. FLEXIBLE = 3-4. CONDITIONAL = 2. SHADOW = 1 (possible tendency only).
 
═══ TRUTH CLASSIFICATION (use on every major prediction) ═══
IMMUTABLE — must happen, 5+ indicators across multiple charts
FLEXIBLE — likely but can shift with awareness and action
CONDITIONAL — depends on specific choices or timing
SHADOW — repeating unconscious pattern, may not be visible to person
 
═══ OUTPUT FORMAT (mandatory for every domain) ═══
FACT: [what the chart shows]
WHY: [specific planet + house + condition that shows it]
CHART SOURCE: [D1/D9/D10/Dasha/Transit]
WEIGHT: [0-100]
CONFIDENCE: [IMMUTABLE/FLEXIBLE/CONDITIONAL/SHADOW]
 
═══ SUPPRESSION LIST ═══
× Moon H12 alone → emotional neglect
× Rahu H7 alone → foreign spouse
× Ketu H5 alone → childlessness
× H12 → parental control
× Sun H4 → father decides marriage
× Venus affliction alone → family rejection
× Single malefic in dusthana → definite failure
× Death prediction of any kind
× Terminal disease diagnosis
× Exact curse declaration without 3+ classical indicators
 
═══ CLASSICAL DOSHAS ONLY ═══
Mangal Dosha | Kala Sarpa | Kemadruma | Guru Chandal | Pitru Dosha | Shrapit | Nadi/Bhakoot (match only)
Nothing else is a "dosha." Call other things "placement effects."
 
═══ GEMSTONE RULE ═══
Recommend ONLY if: (a) planet is functionally benefic for this Lagna, (b) bala < 55, (c) current dasha needs it.
If any condition fails: state "gemstone not recommended."
 
═══ PRIORITY HIERARCHY ═══
D9 > D10 > D7 > D1 > Dasha > Transit
Stronger divisional chart overrides D1 when they conflict.`;
 
// ═══════════════════════════════════════════════════
// MASTER FACT SHEET — passed to ALL calls
// ═══════════════════════════════════════════════════
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
 
  return `
╔══════════════════════════════════════════════════════════
MASTER FACT SHEET — ALL SECTIONS MUST ALIGN WITH THESE FACTS
Never contradict anything in this sheet.
╚══════════════════════════════════════════════════════════
 
PLANET DOMINANCE (ranked by combined strength + dasha relevance):
${chart.planetDominance?.dominant?.join(' | ') || ''}
Suppressed: ${chart.planetDominance?.suppressed?.join(' | ') || ''}
 
CONTRADICTIONS (resolve these — state both sides):
${co.map(c=>`${c.planet}: ${c.resolution}`).join('\n') || 'None'}
 
VERIFIED PSYCHOLOGICAL PATTERNS (2+ indicators only — use these, do not invent others):
${sf.filter(f=>f.count>=2).map(f=>`[${f.confidence}] ${f.statement}`).join('\n') || 'None confirmed'}
 
WEIGHTED SCORES (blended D1+D9+UL — primary accuracy indicator):
Marriage: ${chart.weightedScores?.marriage?.blended}/100 | Career: ${chart.weightedScores?.career?.normalized}/100 | Wealth: ${chart.weightedScores?.wealth?.normalized}/100 | Health: ${chart.weightedScores?.health?.normalized}/100
Top strengths: ${(chart.weightedScores?.topPositive||[]).join(' | ')}
Top risks: ${(chart.weightedScores?.topNegative||[]).join(' | ')}
 
REPEATED KARMA ACROSS CHARTS (destiny-level certainty):
${chart.repeatedKarma?.summary || ''}
 
TRIPLE CONFIRMATION STATUS:
${chart.tripleConfirmation?.summary || ''}
 
MARRIAGE FACT SHEET:
Blended score: ${ms?.overall}/100 | Emotional: ${ms?.emotional}% | Stability: ${ms?.stability}% | Conflict risk: ${ms?.conflict}%
Venus affliction: ${va?.level} (${va?.score}/100)
Divorce indicators: ${de?.level} — ${de?.summary?.slice(0,100)||'none'}
Second marriage: ${sm?.summary?.slice(0,80)||'not indicated'}
UL analysis: ${ul?.summary?.slice(0,100)||''}
D9 marriage: ${nm?.summary?.slice(0,100)||''}
Marriage trigger stack: ${chart.marriageTriggerStack?.summary||''}
Best marriage windows:
${(rf?.windows||[]).slice(0,3).map(w=>`  ${w.period} (${w.dates}) — ${w.strength}: ${w.reason}`).join('\n')||'  Check next Mahadasha'}
 
CAREER FACT SHEET:
Business vs job: ${chart.businessVsJob?.verdict || ''}
D10 summary: ${chart.d10 ? Object.entries(chart.d10.planets).slice(0,5).map(([n,p])=>`${n}:${p.rasi} H${p.house}`).join(' | ') : 'N/A'}
Career windows: ${(chart.dashaEventTriggers?.career||[]).slice(0,3).join(' | ')||'from Dasha'}
Reputation: ${chart.reputationEngine?.level||''}
 
WEALTH FACT SHEET:
Style: ${chart.wealthStyle?.primary||''}
Dhana Yogas: ${(wt?.dhanaYogas||[]).join(' | ')||'none'}
Peak windows: ${(wt?.windows||[]).slice(0,3).map(w=>`${w.period} (${w.dates}) — ${w.strength}`).join(' | ')||'from Dasha'}
Energy leaks: ${chart.lossEngine?.leaks?.slice(0,2).join(' | ')||'none major'}
 
HEALTH FACT SHEET:
Vulnerable: ${ht?.vulnerableBodyParts||''}
Concerns: ${(ht?.concerns||[]).slice(0,3).join(' | ')||'none major'}
Danger periods: ${(ht?.dangerPeriods||[]).slice(0,2).join(' | ')||'none'}
Recovery: ${chart.recoveryIndicators?.strength||''}
 
FOREIGN SETTLEMENT: ${fs?.level} (${fs?.score}/100) — ${(fs?.indicators||[]).slice(0,3).join(' | ')||'mild'}
CHILDREN: ${ct?.summary?.slice(0,150)||''}
PROPERTY: ${pe?.summary?.slice(0,100)||''}
DEBT/LITIGATION: ${chart.debtLitigation?.summary?.slice(0,100)||''}
PARENT KARMA: ${chart.parentKarma?.summary||''}
IN-LAW KARMA: ${chart.inLawKarma?.quality||''}
SIBLING KARMA: ${chart.siblingKarma?.summary?.slice(0,100)||''}
RELATIONSHIP WOUNDS: ${chart.relationshipWounds?.summary?.slice(0,150)||''}
POWER DOMAINS: ${chart.powerEngine?.summary?.slice(0,100)||''}
FEAR ENGINE: ${chart.fearEngine?.summary?.slice(0,100)||''}
ELEMENT BALANCE: ${chart.elementBalance?.summary?.slice(0,80)||''}
AL vs LAGNA: ${chart.alVsLagna?.gap?.slice(0,100)||''}
HOUSE STORY (key houses only): ${chart.houseStory ? Object.values(chart.houseStory.stories||{}).filter(s=>s.specialStory).map(s=>s.summary).join(' | ') : ''}
DISPOSITOR CHAIN RULER: ${chart.dispositorChain?.chartRuler?.summary?.slice(0,80)||''}
NAKSHATRA PSYCHOLOGY: ${chart.nakshatraDeep?.summary?.slice(0,120)||''}
KARMA CLASSIFICATION: ${chart.karmaClassification?.summary||''}
BREAKPOINTS: ${chart.breakpointYears?.summary||''}
PEAK POWER YEARS: ${chart.peakPowerYears?.summary?.slice(0,100)||''}
DASHA QUALITY: ${chart.dashaQuality?.summary||''}
 
CURRENT DASHA:
Mahadasha: ${d.current?.lord} (${d.current?.startDate?.slice(0,7)} to ${d.current?.endDate?.slice(0,7)})
Antardasha: ${d.currentAntar?.lord} (${d.currentAntar?.startDate?.slice(0,7)} to ${d.currentAntar?.endDate?.slice(0,7)})
Pratyantar: ${curP ? curP.lord+' until '+curP.endDate.slice(0,7) : 'N/A'}
 
TRANSIT TRIGGERS:
Jupiter: ${tt?.currentPositions?.jupiter||''} | Saturn: ${tt?.currentPositions?.saturn||''} | Rahu: ${tt?.currentPositions?.rahu||''}
${tt?.doubleTransitActive ? 'DOUBLE TRANSIT ACTIVE' : ''} ${chart.transits?.sadeSati ? 'SADE SATI ACTIVE' : ''}
Active: ${[...(tt?.marriage||[]),(tt?.career||[]),(tt?.wealth||[])].slice(0,4).join(' | ')||'none'}
 
TRANSIT HEATMAP (next 6 months): ${chart.transitHeatmap?.summary||''}
BIRTH TIME CONFIDENCE: ${chart.birthTimeConfidence?.level||'LOW RISK'} — ${chart.rectificationWarning?.summary?.slice(0,80)||''}
VARGOTTAMA: ${chart.vargottama?.map(v=>v.planet).join(', ')||'none'}
PUSHKARA: ${chart.pushkaraNavamsa?.map(v=>v.planet).join(', ')||'none'}
DOMAIN PROTECTORS: Marriage: ${chart.marriageProtector?.strongest?.slice(0,60)||''} | Career: ${chart.careerProtector?.strongest?.slice(0,60)||''}
MANIFESTATION RESISTANCE: ${chart.manifestationResistance?.level||''}
BHRIGU BINDU: ${chart.bhriguBindu?.rasi||''} — ${chart.bhriguBindu?.summary?.slice(0,60)||''}
UNFINISHED KARMA: ${chart.unfinishedKarma?.summary?.slice(0,150)||''}
PLANET MATURITY: Mature: ${chart.planetMaturity?.matureNow?.join(', ')||'none'} | Immature: ${chart.planetMaturity?.immatureNow?.join(', ')||'none'}
FUNCTIONAL NATURE: ${chart.functionalNature ? Object.entries(chart.functionalNature).map(([p,n])=>`${p}:${n.role.split(' ')[0]}`).join(' | ') : ''}
`;
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
 
    const p   = chart.planets;
    const d   = chart.dasha;
 
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender||'not specified' }, question);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const chartCtx = fullPrompt.split(divider)[0].trimEnd();
    const mfs = buildMasterFactSheet(chart);
    const ctx = chartCtx + '\n\n' + mfs;
 
    const call = (prompt, tokens) => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: tokens,
      system: SYSTEM,
      messages: [{ role: 'user', content: `${ctx}\n\n${prompt}` }],
    });
 
    // ═══ 14 PARALLEL CALLS — 20 ENGINES TOTAL ═══
    const [r0,r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17] = await Promise.all([
 
      // ── CALL 0: PRIORITY KARMA ENGINE + SELF ENGINE ──
      call(`ENGINE 1: PRIORITY KARMA ENGINE
Find the 3 strongest active karmas RIGHT NOW. Use PLANET DOMINANCE, current Dasha/Antardasha, transit triggers from MASTER FACT SHEET.
For each output:
FACT: [what is activating right now]
WHY: [planet + house + condition]
CHART SOURCE: [Dasha/Transit/D1]
WEIGHT: [0-100]
CONFIDENCE: [IMMUTABLE/FLEXIBLE/CONDITIONAL]
 
ENGINE 2: SELF / BODY / PERSONALITY
Read Lagna + Lagna lord + Moon + AK + strongest planet + weakest planet.
Cover these sub-topics (3-4 sentences each, most important first):
--- Physical Appearance & Aura --- (Lagna sign + lord, Moon sign — specific features, not symbols)
--- Mind Structure & Emotion --- (Moon nakshatra psychology from NAKSHATRA PSYCHOLOGY + Mercury)
--- Core Strength & Soul Weapon --- (dominant planets from PLANET DOMINANCE — gift in real daily life)
--- Core Wound & Defense --- (weakest/afflicted planets — what recurring struggle, what defense mechanism)
--- Public Image vs Private Self --- (use AL vs LAGNA section — how others see them vs who they really are)
Use TRUTH CLASSIFICATION on each. Use FACT/WHY/WEIGHT/CONFIDENCE format for major claims.`, 3000),
 
      // ── CALL 1: FAMILY KARMA ENGINE ──
      call(`ENGINE 3: FAMILY KARMA ENGINE
Read 4th + Sun + Moon + 9th + D12 indicators + PARENT KARMA section from MASTER FACT SHEET.
Cover (3-4 sentences each):
--- Father Karma --- (Sun + H9 + H9 lord — 2+ indicators required. Use PARENT KARMA father section. Real-world impact on psychology.)
--- Mother Karma --- (Moon + H4 + H4 lord — 2+ indicators. Use PARENT KARMA mother section.)
--- Lineage Burden --- (Pitru Dosha status from yogas + ancestor patterns — what family karma is being carried?)
--- Home Environment --- (H4 condition — what was the emotional atmosphere growing up?)
--- Who Must Be Forgiven --- (Which family member holds the karmic key? Father/mother/sibling — chart-based, not assumed.)
--- Sibling Karma --- (use SIBLING KARMA section)
Use SHADOW classification for repeating patterns. State only what 2+ indicators confirm.`, 2500),
 
      // ── CALL 2: RINA BANDHA + LOVE ENGINE ──
      call(`ENGINE 4: RINA BANDHA ENGINE (Soul Debt in Relationships)
Read 6th + 8th + 12th + UL + DK + Saturn + Ketu + RELATIONSHIP WOUNDS section.
Cover (3-4 sentences each):
--- Why Relationships Come --- (Ketu, DK, UL — what karmic debt drives relationship entry?)
--- Soul Debt Pattern --- (who owes more energy in relationships, who tends to leave first, whether bonds end when debt clears)
--- Relationship Wound --- (use RELATIONSHIP WOUNDS section — abandonment/rejection/betrayal/control — state only if 2+ indicators)
--- Karmic Mirror --- (what pattern keeps repeating in relationships and WHY — chart source required)
 
ENGINE 5: LOVE ENGINE (surface layer)
Read Venus + Mars + 5th house + 5th lord + HOUSE STORY for H5.
Cover:
--- Love Nature & Attachment Style --- (Venus house + Moon + 5th lord — real behavior, not symbols)
--- Sexual Energy --- (Mars + Venus + H8 — 2+ indicators before stating anything)
--- Secret Relationship Risk --- (only if 2+ indicators from MASTER FACT SHEET)
Use TRUTH CLASSIFICATION. 3-4 sentences per sub-topic.`, 2500),
 
      // ── CALL 3: MARRIAGE ENGINE (full 11-step) ──
      call(`ENGINE 5 CONTINUED: MARRIAGE ENGINE
Analyze in exact order: H7 → H7 lord → Venus → Upapada → UL lord → D9 H7 → D9 H7 lord → DK → A7 → dasha → transit.
State condition of each: strong/weak/neutral/afflicted.
Cover (3-4 sentences each, most important first):
--- Marriage Score & Stack --- (state blended score from MASTER FACT SHEET + trigger stack count/5)
--- Marriage Type --- (love/arranged/hybrid — 2+ indicators required. Use RINA BANDHA: why this person arrives.)
--- Partner Nature --- (translate DK + 7th lord sign + D9 7th lord into real personality. Not symbols — actual traits.)
--- Partner Profession & Background --- (A7 + D9 7th lord + DK sign — real career field and family type)
--- Partner Appearance --- (7th lord sign + D9 7th + Moon in partner's chart indicators)
--- Marriage Timing --- (top 2 windows from MASTER FACT SHEET with dates + strength. Primary + backup.)
--- Stability & Conflict Pattern --- (translate conflict risk % into real daily behavior — what the friction actually looks like)
--- In-Law Karma --- (use IN-LAW KARMA section)
--- Risks --- (divorce: only if 3+ indicators; second marriage: only if 3+ indicators; state count explicitly)
Use FACT/WHY/WEIGHT/CONFIDENCE format for timing and risk predictions.`, 3000),
 
      // ── CALL 4: CHILDREN ENGINE ──
      call(`ENGINE 6: CHILDREN ENGINE
Read H5 + H5 lord + Jupiter + Putrakaraka + D7 + Ketu + CHILDREN section from MASTER FACT SHEET.
State how many of the 6 required indicators are confirmed before making any prediction.
Cover (3-4 sentences each):
--- Children Promise --- (how many indicators confirmed? What does D7 Jupiter show? State score.)
--- Conception Windows --- (best periods from CHILDREN section — give actual Dasha periods and years)
--- Child Karma --- (Ketu H5? Putrakaraka condition? What is the soul-contract with children?)
--- Concerns --- (only if 2+ indicators confirm — state each indicator explicitly)
--- Gender Tendency --- (5th sign, Jupiter position — low confidence, state as CONDITIONAL)
Use TRUTH CLASSIFICATION. Be very honest about what is confirmed vs speculative.`, 2000),
 
      // ── CALL 5: CAREER ENGINE ──
      call(`ENGINE 7: CAREER ENGINE
Read H10 + H10 lord + Saturn + Sun + Mercury + D10 + Rahu + Amatyakaraka + CAREER section from MASTER FACT SHEET.
Cover (3-4 sentences each):
--- Career Type --- (D10 + H10 lord + Amatyakaraka — 3-5 real professions. Not "you are a leader." Name actual fields.)
--- Business vs Job --- (use BUSINESS vs JOB section from MASTER FACT SHEET — state verdict and score)
--- Work Style --- (leadership/service/independent/team — which indicators confirm which?)
--- Career Struggle & Strength --- (10th lord condition + Saturn + D10 — what blocks and what accelerates)
--- Promotion & Peak Windows --- (top 2-3 from CAREER section in MASTER FACT SHEET — exact Dasha periods)
--- Reputation & Fame --- (use REPUTATION section — level and indicators)
--- Career Event Chain --- (connect: career shift → foreign/wealth/relationship event that follows)
Use WEIGHT and CONFIDENCE on all timing predictions.`, 2500),
 
      // ── CALL 6: WEALTH ENGINE ──
      call(`ENGINE 8: WEALTH ENGINE
Read H2 + H11 + H9 + Jupiter + Venus + Mercury + Dhana yogas + WEALTH section from MASTER FACT SHEET.
Cover (3-4 sentences each):
--- Wealth Style --- (use WEALTH STYLE from MASTER FACT SHEET — how money specifically comes to this chart)
--- Peak Wealth Windows --- (top 3 from WEALTH section — state Dasha period, dates, strength level)
--- Wealth Score --- (state from WEIGHTED SCORES + what the score means in real life)
--- Money Leaks --- (use ENERGY LEAKS section — what drains financial energy)
--- Debt & Litigation Risk --- (use DEBT section — state risk level and active periods)
--- Property Timing --- (H4 + Mars + Moon — best Dasha window for property acquisition)
--- Inheritance Signal --- (H8 + H8 lord + 9th lord — present or not?)
--- Wealth through Spouse? --- (7th lord + DK + D9 — CONDITIONAL if 2+ indicators)
Use FACT/WHY/WEIGHT/CONFIDENCE on peak windows.`, 2500),
 
      // ── CALL 7: HEALTH ENGINE ──
      call(`ENGINE 9: HEALTH ENGINE
Read H1 + H6 + H8 + H12 + Saturn + Mars + Moon + HEALTH section from MASTER FACT SHEET.
Cover (3-4 sentences each):
--- Vulnerable Body Areas --- (use HEALTH section directly — state from Lagna sign + H6/H8/H12 analysis)
--- Chronic Risk Areas --- (2+ indicators required for each. Translate to real health tendencies, not disease names.)
--- Mental & Emotional Health --- (Moon + Mercury + H4 — 2+ indicators. Real psychological patterns.)
--- Accident & Surgery Risk --- (Mars + H8 — only if 3+ indicators confirm. State each.)
--- Danger Periods --- (from HEALTH DANGER PERIODS in MASTER FACT SHEET — give specific Dasha windows)
--- Recovery Strength --- (use RECOVERY section — what protects and heals this person)
--- Energy Leakage --- (where prana drains from this chart — use ENERGY LEAKS section)
No death prediction. No terminal disease. Tendencies only.`, 2000),
 
      // ── CALL 8: FOREIGN + SPIRITUAL ENGINES ──
      call(`ENGINE 10: FOREIGN ENGINE
Use FOREIGN SETTLEMENT from MASTER FACT SHEET — state score and level directly.
Cover (3-4 sentences each):
--- Foreign Settlement Score --- (state score, level, how many of 4 required signals are present)
--- Migration Timing --- (Rahu Dasha, 12th lord active period, Jupiter H9/H12 transit — give years)
--- Foreign Career & Spouse --- (foreign spouse: only if 4+ indicators. State count. Foreign career: 2+ required.)
--- Event Chain --- (what triggers the foreign move — career? relationship? spiritual calling? exile?)
 
ENGINE 16: MOKSHA GATE
Read 12th + Ketu + AK + Karakamsa.
--- Liberation Path --- (which path frees this soul fastest: devotion/knowledge/service/loss/solitude/marriage itself?)
--- Spiritual Growth Window --- (when does spiritual life deepen — Ketu Dasha, 12th lord period, Jupiter-Ketu)
--- Soul Age Classification --- (use SOUL AGE from Saturn + Ketu + Moon + AK — young/middle/old/exhausted)
--- Ancestral Karma --- (Pitru Dosha status + lineage burden from PITRU LINEAGE section)
Use TRUTH CLASSIFICATION throughout.`, 2500),
 
      // ── CALL 9: VASANA + SOUL ENGINES ──
      call(`ENGINE 14: VASANA ENGINE (Core Soul Desire)
Read Venus + Rahu + Moon + AK.
FACT: What is the deepest repeating desire across lifetimes?
WHY: [specific indicators]
CHART SOURCE: [planets + houses]
WEIGHT: [0-100]
CONFIDENCE: [SHADOW/CONDITIONAL/FLEXIBLE]
Classify desire: love/power/control/escape/revenge/knowledge/recognition
 
ENGINE 15: SOUL AGE ENGINE
Read Saturn + Ketu + Moon + AK + 12th house.
Classify: young soul / middle soul / old soul / exhausted soul
State the chart evidence for classification. 3-4 sentences.
 
ENGINE 17: SUFFERING PATTERN ENGINE
Find the ONE primary repeating wound: abandonment/betrayal/humiliation/poverty/invisibility/exile
Which indicators confirm this? Use RELATIONSHIP WOUNDS + FEAR ENGINE from MASTER FACT SHEET.
State: what triggers it, how it shows in life, what heals it.
 
ENGINE 18: BIRTH MISSION ENGINE
Read AK + D10 + Sun + Jupiter + Saturn.
Classify: builder/teacher/protector/destroyer/healer/guide/renunciate
State the chart evidence. 3-4 sentences.
Connect to NAKSHATRA PSYCHOLOGY from MASTER FACT SHEET.`, 2500),
 
      // ── CALL 10: GARBHA + PITRU + SHAPA ENGINES ──
      call(`ENGINE 11: GARBHA KARMA ENGINE (Womb & Birth Memory)
Read Moon + H8 + H12 + Ketu + Lagna condition at birth.
Cover 3-4 sentences:
What does the chart suggest about the birth itself — was there anxiety, difficulty, or a specific womb imprint? Only state if 2+ indicators confirm.
How does this birth memory shape lifelong patterns (anxiety, belonging issues, incarnation resistance)?
CONFIDENCE: SHADOW (this is unconscious pattern — state carefully)
 
ENGINE 12: PITRU LINEAGE ENGINE
Read Sun + H9 + Ketu + Pitru Dosha status.
Cover 3-4 sentences:
Whose karma from the lineage is being carried? (grandfather pattern, father wound, male-line burden)
What is the specific lineage debt — poverty karma, relationship karma, authority karma?
Is this person the one who breaks the pattern or continues it? (Neecha Bhanga / Vipareeta indicators)
 
ENGINE 13: SHAPA DETECTION
Check ONLY classical combinations:
Pitru Shapa: Sun/9th lord afflicted by nodes + 9th damaged
Matru Shapa: Moon afflicted + H4 lord damaged + 3 conditions
Guru Shapa: Jupiter afflicted by Saturn/Rahu + 5th damaged
Stri Shapa: Venus damaged + H7 afflicted + UL afflicted (3+ conditions)
Naga Shapa: Rahu + H4/H5 + ancestor indicators (3+ required)
 
For each present: state type, chart source (minimum 3 indicators required), real-life effect, remedy approach.
If below 3 indicators: do NOT declare as Shapa. Say "insufficient indicators."`, 2500),
 
      // ── CALL 11: LIFE TIMELINE ENGINE ──
      call(`ENGINE 19: FATE COMPRESSION WINDOWS
From MASTER FACT SHEET — find the top 3 years/periods where karma condenses most heavily.
For each: state period + what domain + why (Dasha + transit + natal promise) + WEIGHT.
 
ENGINE: LIFE TIMELINE
Current phase — write this first (4 sentences):
Which Dasha + Antardasha is running. What karmic chain is being triggered right now. Next 2 events in the chain. Use TRANSIT HEATMAP from MASTER FACT SHEET.
 
Life Phases — 2 sentences each (dominant karma + main event + growth/pain theme):
Childhood (0-12): [from chart]
Teen (13-18): [from chart]  
Early adult (19-24): [from chart]
Young adult (25-30): [from chart]
Saturn maturation (31-36): [from chart]
Rahu peak (37-45): [from chart]
Ketu phase (46-60): [from chart]
Old age (60+): [from chart]
 
BREAKPOINT YEARS: Use BREAKPOINTS section from MASTER FACT SHEET — state top 3 upcoming.
PEAK POWER YEARS: Use PEAK POWER YEARS section — state periods.`, 2500),
 
      // ── CALL 12: DOSHAS & PARIHARAMS ──
      call(`ENGINE: CLASSICAL DOSHAS & PARIHARAMS
 
Check ONLY these 7 classical doshas. Find each in the YOGAS & DOSHAS section of the chart:
1. Mangal Dosha | 2. Kala Sarpa Yoga | 3. Kemadruma Yoga | 4. Guru Chandal Yoga
5. Pitru Dosha | 6. Shrapit Dosha | 7. Nadi/Bhakoot (matching only)
 
NOTHING ELSE is a dosha. Saturn H7 = placement effect. Moon H12 = placement effect.
 
For each classical dosha found in the chart:
DOSHA: [name]
Status: ACTIVE or NULLIFIED
If NULLIFIED: [exact rule that cancels it] + [what this means for this person]
If ACTIVE:
Real-life effect: [translate to actual behavior, not symbolic language]
Dasha trigger: [is current dasha activating this?]
REMEDY ORDER: (1) Behavioral correction first (2) Mantra (3) Charity (4) Fasting (5) Temple
Behavioral remedy: [specific behavioral change that reduces this pattern]
Mantra: [exact Sanskrit text] × [number] on [day]
Charity: [specific item] to [recipient] on [day]
Temple: [specific temple in Tamil Nadu or Kerala] | Deity: [name] | Day: [day]
 
GEMSTONE: Only if (a) planet is functionally benefic for this Lagna per FUNCTIONAL NATURE section, (b) bala < 55, (c) current dasha needs it. State all 3 checks. If any fails: "Gemstone not recommended — [reason]."`, 2500),
 
      // ── CALL 14: HIDDEN ESOTERIC ENGINES (Group A) ──
      call(`3-4 lines per engine. Facts only. Chart-traced only. If evidence weak, say "insufficient indicators."
 
ENGINE: KULA DEVATA RECOVERY
Use KULA DEVATA section from chart.
FACT: Which ancestral deity protects this lineage.
WHY: AK (${chart.karakas?.Atmakaraka}) + 9th lord connection.
CHART SOURCE: AK + H9 + Ketu
Output: deity name, temple, mantra, day. Real and specific.
 
ENGINE: FINAL UNFINISHED SENTENCE
Use FINAL UNFINISHED SENTENCE from chart.
FACT: The deepest unspoken sentence from past life karma.
WHY: Dominant afflicted planet pair.
CHART SOURCE: Planet pairs.
Output: exact sentence + which planet pair generates it.
 
ENGINE: SOUL EXHAUSTION INDEX
Use SOUL EXHAUSTION INDEX from chart.
FACT: How tired is this soul from incarnations?
WHY: Saturn + Ketu + Moon + H12 weight.
CHART SOURCE: D1.
Output: score, classification, what it means in daily behavior.
 
ENGINE: VAK SHAKTI (Speech Power)
Use VAK SHAKTI from chart.
FACT: Does this person manifest through speech? Healer or destroyer?
WHY: Mercury + H2 + Jupiter + AK.
Output: score, gift type, risk type.
 
ENGINE: SWAPNA ENGINE (Dream Karma)
Use SWAPNA ENGINE from chart.
FACT: Is the dream life karmic? What visits?
WHY: Moon + Ketu + H12.
Output: dream type, what it signals, how to work with it.
 
ENGINE: DRISHTI SHAKTI (Energy Susceptibility)
Use DRISHTI SHAKTI from chart.
FACT: Does this person absorb external energies heavily?
WHY: Moon strength + Lagna + Rahu.
Output: level, protection method.`, 2500),
 
      // ── CALL 15: HIDDEN ESOTERIC ENGINES (Group B) ──
      call(`3-4 lines per engine. Facts only. Chart-traced only.
 
ENGINE: SHAKTI AWAKENING TRIGGER
Use SHAKTI AWAKENING TRIGGER from chart.
FACT: What event cracks this person open and releases their real power?
WHY: H8 + Ketu + Mars + Moon.
Output: trigger type + why the chart shows this specific trigger.
 
ENGINE: GURU ARRIVAL TIMING
Use GURU ARRIVAL TIMING from chart.
FACT: Does a teacher/guide appear? When? Through grace or suffering?
WHY: Jupiter + H9 + AK + transits.
Output: yes/no, type of guru, timing window, how they arrive.
 
ENGINE: SACRED SOUND KEY
Use SACRED SOUND KEY from chart.
FACT: Which beeja mantra resonates with this soul's frequency?
WHY: Nakshatra lord + AK.
Output: primary beeja + combined mantra + why this specific sound.
 
ENGINE: SHADOW INHERITANCE
Use SHADOW INHERITANCE from chart.
FACT: What hidden trait was inherited from the family lineage?
WHY: D12 + Moon + Saturn + Rahu.
Output: trait, which family line it comes from, how it shows in behavior.
 
ENGINE: HIDDEN ENEMY ENGINE
Use HIDDEN ENEMY from chart.
FACT: Is the main opposition from within the close circle?
WHY: 12th lord + 6th lord placement + Rahu.
Output: who (which role), how it manifests, protection method.
 
ENGINE: SACRED FEAR ENGINE
Use SACRED FEAR from chart.
FACT: What is the deepest primal fear driving this soul?
WHY: Moon + Saturn + H8 + Ketu.
Output: fear type, how it drives behavior, what resolves it.`, 2500),
 
      // ── CALL 16: SOUL ARCHITECTURE ENGINES ──
      call(`3-4 lines per engine. Facts only. Chart-traced only.
 
ENGINE: PRE-BIRTH CHOICE ENGINE
Use PRE-BIRTH CHOICE from chart.
FACT: Why did this soul choose these specific parents, body, and life circumstances?
WHY: 4th lord + 9th lord + Lagna + AK + Nakshatra.
Output: why these parents, why this pain type, why this nakshatra, why this exact Lagna.
 
ENGINE: DIVINE PROTECTION ENGINE
Use DIVINE PROTECTION from chart.
FACT: What invisible protection operates in this life?
WHY: Jupiter + H9 + Vipareeta + Vargottama + AK.
Output: protection sources, when they activate, what they have saved.
 
ENGINE: LIFE YOU ALMOST LIVED
Use LIFE ALMOST LIVED from chart.
FACT: What life path was cosmically seeded but diverted?
WHY: Strong yogas whose planets are displaced to dusthana.
Output: the diverted path + what prevented it + whether it can be recovered.
 
ENGINE: TIME OF DAY KARMA
Use TIME OF DAY KARMA from chart.
FACT: What does the exact birth hour reveal about soul's entry gate?
WHY: Birth time + Lagna degree + Sandhi check.
Output: gate name, karmic meaning, Sandhi status.
 
ENGINE: PERSON TO FORGIVE ENGINE
Use PERSON TO FORGIVE from chart.
FACT: Who holds the key to unlocking this person's karma?
WHY: Most afflicted personal house lord.
Output: who + why + what changes when forgiveness happens.
 
ENGINE: DEATH PURPOSE ENGINE
Use DEATH PURPOSE from chart.
FACT: What must be completed before this soul exits?
WHY: AK + H12 + Saturn + Jupiter + 5th.
Output: 1-3 specific completions. Not death timing. What must be done.`, 2500),
 
      // ── CALL 17: FINAL SYNTHESIS ──
      call(`3-4 lines per engine. Facts only.
 
ENGINE: BREAKING EVENT ENGINE
Use BREAKING EVENT from chart.
FACT: Which period most likely shatters the old identity and forces reinvention?
WHY: 8th lord dasha + Saturn return + Rahu dasha.
Output: period, age, what breaks, what is born from the breaking.
 
ENGINE: ONE EVENT THAT BREAKS THE SELF
Identify from the chart data the single most likely identity-death event.
Not death. The irreversible event after which the person cannot return to who they were.
3-4 sentences.
 
=== FINAL SYNTHESIS: TOP KARMIC LEDGER ===
 
TOP 3 KARMIC BURDENS (what this soul is working to resolve):
1. [burden]: [chart source] — [real-life manifestation] — [what resolves it]
2. [burden]: [chart source] — [real-life manifestation] — [what resolves it]
3. [burden]: [chart source] — [real-life manifestation] — [what resolves it]
 
TOP 3 KARMIC BLESSINGS (what this soul came in with):
1. [blessing]: [chart source] — [how it manifests] — [how to activate it fully]
2. [blessing]: [chart source] — [how it manifests] — [how to activate it fully]
3. [blessing]: [chart source] — [how it manifests] — [how to activate it fully]
 
ONE REPEATING LIFE WOUND: [name it] — [chart source] — [pattern in 3 sentences]
 
ONE SOUL MISSION: [from BIRTH MISSION ENGINE] — [what it means in real daily life]
 
ONE THING TO STOP: [chart-based] — [which planet/pattern] — [why it blocks everything]
 
ONE THING TO COMPLETE BEFORE DEATH: [from DEATH PURPOSE ENGINE]
 
SACRED SOUND KEY: ${chart.sacredSound?.fullMantricKey||''} — chant this for alignment.`, 2500),
 
    // ── CALL 13: PEAK WINDOWS + DESTINY FORK + LIFE-DEFINING KARMAS ──
      call(`ENGINE 19 CONTINUED: PEAK WINDOWS
State top 3 for each domain with exact periods and confidence:
Marriage windows: [from MASTER FACT SHEET MARRIAGE WINDOWS — period, dates, strength, reason]
Wealth windows: [from WEALTH section — period, dates, strength]  
Career windows: [from CAREER section — period, dates]
Health danger windows: [from HEALTH DANGER PERIODS — when to be most careful]
 
ENGINE 20: DESTINY FORK ENGINE
Generate 3 possible life paths based on karma dominance:
PATH A (strongest karma activates fully): [what life looks like if dominant planets fully manifest]
PATH B (moderate karma, mixed choices): [realistic middle path]
PATH C (resistance pattern dominates): [what happens if blocking factors win]
For each path: 3-4 sentences covering career, relationships, wealth, spiritual outcome.
 
=== 3 LIFE-DEFINING KARMAS (the soul's curriculum) ===
At the end, state the 3 strongest repeating patterns across this entire chart.
For each:
PATTERN: [name — e.g., "The Invisible Leader" or "The Karmic Lover"]
WHAT IT MEANS: [how it shows across career/relationships/health/family — 2 sentences]
CHART SOURCE: [which planets and houses generate this]
HOW TO WORK WITH IT: [1 practical sentence — not spiritual advice, chart-based action]
TRUTH LEVEL: [IMMUTABLE/FLEXIBLE/SHADOW]
 
These are not predictions. They are the architecture of this soul's current incarnation.
${question ? `\n=== ANSWER TO SPECIFIC QUESTION ===\n${question}\nApply full FACT/WHY/WEIGHT/CONFIDENCE format.` : ''}`, 3000),
 
    ]);
 
    const reading = [r0,r1,r2,r3,r4,r5,r6,r7,r8,r9,r10,r11,r12,r13,r14,r15,r16,r17]
      .map(r => r.content.map(c => c.text||'').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
 
const RASI_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
