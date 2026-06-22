
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = `You are a precise Tamil Jyotish astrologer with 40 years of experience.
 
═══ FINAL SUPPRESSION RULES — HIGHEST PRIORITY ═══
 
RULE 1: NEVER convert a single placement into biography. Minimum 3 indicators for psychological statements, 2 for life events. Moon H12 alone ≠ emotional neglect. Rahu H7 alone ≠ foreign spouse. Ketu H5 alone ≠ self-sabotage.
 
RULE 2: Event = Natal Promise × Dasha Activation × Transit Trigger. Without all 3: use "possibility" not certainty.
 
RULE 3: Transit only triggers existing natal karma. Check natal support first. Transit alone never proves event.
 
RULE 4: For every negative placement, check: own sign, exalted, vargottama, benefic aspect, D9 strength, Pushkara, Vipareeta, Yogakaraka. Output: "X shows [negative], BUT Y shows [positive]. Net result: [conclusion]."
 
RULE 5: CONFIDENCE LEVELS on every major prediction. LOW=1 indicator | MEDIUM=2 | HIGH=3-4 | VERY HIGH=5+. Never use certainty without VERY HIGH.
 
RULE 6: Psychological patterns need multi-layer validation. Abandonment: Moon+Saturn/Ketu+H4 damage (3+). Father wound: Sun+H9+Saturn/Ketu (2+). Mother: Moon+H4 (2+). Obsessive love: Venus+Mars+Rahu (2+). Below threshold: "possible tendency" only.
 
RULE 7: Family dynamics use family houses only. Mother: H4+Moon. Father: H9+Sun. Never infer from Moon H12 alone.
 
RULE 8: Marriage analyzed in order: H7→H7 lord→Venus→Upapada→UL lord→D9 H7→D9 H7 lord→Darakaraka→A7→dasha→transit. Fewer than 4 favorable: do not predict near marriage.
 
RULE 9: Mangal Dosha — always check cancellation (Mars own/exalted, Jupiter aspect, Vargottama, D9 strong) before declaring active. If cancelled: state clearly.
 
RULE 10: Wealth must use H2+H2 lord+H11+H11 lord+Jupiter+Dhana yogas+D9+dasha. Never from one placement.
 
RULE 11: Career must use H10+H10 lord+Saturn+Sun+D10+Amatyakaraka+dasha+transits. Give 3-5 fields, never one.
 
RULE 12: Foreign settlement needs 4+ signals from H12 occupancy, H12 lord, Rahu, Moon H12, 9th/12th links, dasha, transit.
 
RULE 13: Children from H5+H5 lord+Jupiter+D7+Putrakaraka+dasha. Never predict delay from Ketu H5 alone.
 
RULE 14: Always output both positive factor AND blocking factor in every major prediction.
 
RULE 15: Language — use: may, possible, likely, tendency, potential. AVOID: will definitely, guaranteed, certainly, must happen. Unless VERY HIGH (5+ indicators).
 
SUPPRESSION LIST — never infer automatically:
× Moon H12 alone → emotional neglect
× Rahu H7 alone → foreign spouse  
× Ketu H5 alone → self-sabotage
× H12 → parental control
× Sun H4 → father decides marriage
× Venus affliction alone → family rejection
× Single malefic in dusthana → definite failure
 
OUTPUT: Facts only. No poetry. 2-4 sentences per sub-topic. No bullet points. Speak as "you". === SECTION === and --- Sub Heading --- headers. Always complete your current sentence before stopping. Prioritize most important content first so nothing critical is cut.
 
CERTAINTY ENGINE (mandatory for every major prediction):
After each major claim, show the evidence stack in this format:
→ Evidence: [list the specific indicators that support this]
→ Blockers: [list anything that weakens or contradicts]
→ Confidence: [X%] ([LOW/MEDIUM/HIGH/VERY HIGH])
This is not optional. Every life domain prediction needs a confidence tag.
 
TRIGGER STACK (for events):
Before predicting any specific event, silently verify: Natal Promise + Dasha + Transit + House Lord + Divisional.
State: "This prediction is supported by [N]/5 triggers" when N ≥ 3.
If N < 3: say "possible" not "likely."
 
PROTECTOR RULE (after every difficult domain):
After stating a difficulty, always identify what protects or softens it.
Format: "However, [protector] provides [specific protection]."
 
KARMA CLASSIFICATION (use KARMA CLASSIFICATION section from chart):
Label each major life outcome as:
FIXED KARMA — highly likely regardless of action
FLEXIBLE KARMA — depends on choices and timing
AVOIDABLE KARMA — can be reduced through remedies and awareness
EARNED KARMA — requires sustained effort to manifest`;
 
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
  const sr = chart.secretRelationship;
  const ul = chart.upapadaLordAnalysis;
  const nm = chart.navamsaMarriage;
  const va = chart.venusAffliction;
  const pe = chart.propertyEngine;
 
  const curM = d.current?.lord;
  const curA = d.currentAntar?.lord;
  const curP = d.prayantardashas?.find(pr => {
    const now = Date.now();
    return new Date(pr.startDate) <= now && new Date(pr.endDate) > now;
  });
 
  return `
╔══════════════════════════════════════════════════════════════
MASTER FACT SHEET — USE THIS TO ENSURE CONSISTENCY ACROSS ALL SECTIONS
Every section must align with these pre-computed facts. Never contradict them.
╚══════════════════════════════════════════════════════════════
 
PLANETARY STRENGTH:
Strongest planets: ${(pr?.strongest||[]).join(' | ')}
Weakest planets:   ${(pr?.weakest||[]).join(' | ')}
 
CONTRADICTIONS (planet is both strong and afflicted — state both sides):
${co.map(c=>`${c.planet}: ${c.resolution}`).join('\n') || 'None'}
 
VERIFIED PSYCHOLOGICAL PATTERNS (2-3+ indicators confirmed — use these only):
${sf.filter(f=>f.count>=2).map(f=>`[${f.confidence}] ${f.statement}`).join('\n') || 'No patterns meet confirmation threshold — do not invent psychological claims'}
 
WEIGHTED SCORES (blended D1+D9+UL — primary accuracy indicator):
Marriage (blended): ${chart.weightedScores?.marriage?.blended}/100
Career score: ${chart.weightedScores?.career?.normalized}/100
Wealth score: ${chart.weightedScores?.wealth?.normalized}/100
Health resilience: ${chart.weightedScores?.health?.normalized}/100
Top strengths: ${(chart.weightedScores?.topPositive||[]).join(' | ')}
Top risks: ${(chart.weightedScores?.topNegative||[]).join(' | ')}
 
TRIPLE CONFIRMATION (predict confidently only if 3+ active):
${chart.tripleConfirmation?.summary||''}
 
MARRIAGE FACT SHEET:
Overall stability score: ${ms?.overall}/100
Emotional compatibility: ${ms?.emotional}%
Stability score: ${ms?.stability}%
Karmic alignment: ${ms?.karmic}%
Delay risk: ${ms?.delay}%
Conflict risk: ${ms?.conflict}%
Venus affliction: ${va?.level} (${va?.score}/100) — ${(va?.factors||[]).join('; ')||'minimal'}
Divorce indicators: ${de?.level} — ${de?.summary?.slice(0,120)||'none'}
Second marriage: ${sm?.summary?.slice(0,100)||'not indicated'}
Secret relationship: ${sr?.summary?.slice(0,100)||'not indicated'}
Upapada lord: ${ul?.summary?.slice(0,100)||''}
Navamsa marriage: ${nm?.summary?.slice(0,120)||''}
Top marriage windows (refined, 2-of-4 rule):
${(rf?.windows||[]).slice(0,3).map(w=>`  ${w.period} (${w.dates}) — ${w.strength}: ${w.reason}`).join('\n')||'  Check next Mahadasha'}
 
CAREER FACT SHEET:
D10 chart: ${chart.d10 ? Object.entries(chart.d10.planets).map(([n,p])=>`${n}:${p.rasi} H${p.house} ${p.status.split(' ')[0]}`).join(' | ') : 'N/A'}
Top career windows: ${(chart.dashaEventTriggers?.career||[]).slice(0,3).join(' | ')||'From Dasha analysis'}
Transit career triggers: ${(tt?.career||[]).join(' | ')||'none active now'}
 
WEALTH FACT SHEET:
Dhana Yogas: ${(wt?.dhanaYogas||[]).join(' | ')||'none'}
Peak wealth windows: ${(wt?.windows||[]).slice(0,3).map(w=>`${w.period} (${w.dates}) — ${w.strength}`).join(' | ')||'from Dasha'}
 
CHILDREN FACT SHEET:
D7 Jupiter: ${chart.d7?.planets?.Jupiter ? `${chart.d7.planets.Jupiter.rasi} H${chart.d7.planets.Jupiter.house} ${chart.d7.planets.Jupiter.status.split(' ')[0]}` : 'N/A'}
Best conception windows: ${ct?.summary?.slice(0,150)||''}
 
HEALTH FACT SHEET:
Vulnerable body parts: ${ht?.vulnerableBodyParts||''}
Health tendencies: ${(ht?.concerns||[]).join(' | ')||'no major chronic tendencies'}
Danger periods: ${(ht?.dangerPeriods||[]).slice(0,3).join(' | ')||'none identified'}
 
FOREIGN SETTLEMENT:
Score: ${fs?.level} (${fs?.score}/100)
${(fs?.indicators||[]).join(' | ')||'mild indicators only'}
 
PROPERTY:
${pe?.summary?.slice(0,150)||''}
 
CURRENT DASHA:
Mahadasha: ${curM} (${d.current?.startDate?.slice(0,7)} to ${d.current?.endDate?.slice(0,7)})
Antardasha: ${curA} (${d.currentAntar?.startDate?.slice(0,7)} to ${d.currentAntar?.endDate?.slice(0,7)})
Pratyantar: ${curP ? curP.lord+' ('+curP.startDate.slice(0,7)+' to '+curP.endDate.slice(0,7)+')' : 'N/A'}
 
TRANSIT TRIGGERS NOW:
Jupiter: ${tt?.currentPositions?.jupiter||''}
Saturn: ${tt?.currentPositions?.saturn||''}
Rahu: ${tt?.currentPositions?.rahu||''}
${tt?.doubleTransitActive ? 'DOUBLE TRANSIT ACTIVE — major event likely now' : ''}
${chart.transits?.sadeSati ? 'SADE SATI ACTIVE' : ''}
Active triggers: ${[...(tt?.marriage||[]),(tt?.career||[]),(tt?.wealth||[]),(tt?.health||[])].slice(0,4).join(' | ')||'none'}
 
MARRIAGE TRIGGER STACK: ${chart.marriageTriggerStack?.summary||''}
BIRTH TIME WARNING: ${chart.rectificationWarning?.summary||''}
AFFLICTION SEVERITY: Venus ${chart.venusAfflictionDetailed?.level||'?'} | Saturn ${chart.saturnAfflictionDetailed?.level||'?'}
PROTECTORS: ${[chart.marriageProtector?.strongest,chart.careerProtector?.strongest,chart.wealthProtector?.strongest].filter(Boolean).join(' | ')||''}
KARMA CLASSIFICATION:
${chart.karmaClassification?.summary||''}
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
 
    const yr  = new Date().getFullYear();
    const age = Math.floor((Date.now()-new Date(dob))/(365.25*24*3600*1000));
    const p   = chart.planets;
    const d   = chart.dasha;
    const curM = d.current?.lord;
    const curA = d.currentAntar?.lord;
 
    // Build chart context from prompts.js
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender||'not specified' }, question);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const chartCtx = fullPrompt.split(divider)[0].trimEnd();
 
    // Master fact sheet — passed to EVERY call for consistency
    const mfs = buildMasterFactSheet(chart);
 
    // Combined context: chart data + master fact sheet
    const ctx = chartCtx + '\n\n' + mfs;
 
    const call = (prompt, tokens) => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: tokens,
      system: SYSTEM,
      messages: [{ role: 'user', content: `${ctx}\n\n${prompt}` }],
    });
 
    const [r0,r1,r2,r3,r4,r5,r6,r7,r8] = await Promise.all([
 
      // CALL 0 — Priority Engine + Self
      call(`Write ONLY these two sections from the reading structure. Apply ALL suppression rules.
PRIORITY RULE: Most important sub-topics first. 2-4 sentences per sub-topic. If space runs short, complete the current sentence cleanly.
CONCISENESS: No long explanations. State fact → reason → implication. Move on.
 
=== ACTIVE KARMA PRIORITY (Run this engine first) ===
State the 3 strongest active karmas RIGHT NOW based on current Dasha lord, Antardasha lord, and active transit triggers from the MASTER FACT SHEET. For each: state the planet, its house position, its condition, and what it is activating in real-world terms right now. Format: "1. [Planet] as [Mahadasha/Antardasha lord] activates [house] — [real-world meaning]." This is the lens for the entire reading.
 
=== SELF ===
Physical appearance, body type, constitution based on Lagna, Lagna lord, Moon. Be specific — not symbolic. Mention actual features.
Mind structure: how this person thinks, decides, processes emotion — Moon nakshatra, Mercury, Lagna lord house.
Natural temperament and aura — Nakshatra gana, element, pada psychology.
Core strengths — which planets give actual gifts and how in daily life (use PLANET DOMINANCE ranking).
Core weaknesses — which planets create recurring struggle and how.
Gift AND shadow for the 2 most dominant planets (state both sides, never one only).`, 3000),
 
      // CALL 1 — Family + Love
      call(`Write ONLY these two sections. Apply ALL suppression rules. Minimum 2 indicators before any family statement.
 
=== FAMILY ===
Mother: H4, H4 lord, Moon — what was the emotional relationship (2+ indicators required).
Father: H9, H9 lord, Sun — nature of the father figure (2+ required).
Siblings: H3, H3 lord, Mars condition.
Home karma: what was the emotional environment growing up.
Family wealth background: H2, H2 lord.
Inheritance possibility: H8, H8 lord.
 
=== LOVE & RELATIONSHIPS ===
Love nature and attachment style (Venus house, Moon, 5th lord — real behavior, not symbols).
Romantic wounds: only if 3+ indicators. What they are and how they show in relationships.
Sexual energy pattern: Mars-Venus connection, 8th house.
Karmic partner indicators: DK, Rahu-Venus, unfinished karma section.
Secret relationship risk: only if 2+ indicators. State each.
Relationship phase engine: based on current Dasha — which phase (attraction/commitment/stability/adjustment) is most active now?`, 3000),
 
      // CALL 2 — Marriage (full engine)
      call(`Write ONLY this section. Apply ALL suppression rules. Analyze marriage in exact order.
PRIORITY RULE: Most critical sub-topics first: timing windows, stability score, partner nature, conflict pattern. 2-4 sentences each. Complete sentences only.
CONCISENESS: Use the REFINED MARRIAGE and MARRIAGE STABILITY SCORES from the chart directly — do not re-analyze, just interpret and translate to real life.
 
=== MARRIAGE ===
 
--- Marriage Engine Score ---
State the blended D1+D9+UL score from WEIGHTED SCORES. State marriage trigger stack count (from MARRIAGE TRIGGER STACK). 2 sentences.
 
--- Marriage Type ---
Love / Arranged / Hybrid — state which indicators confirm this (2+ required). 2 sentences.
 
--- Partner Nature ---
Translate Darakaraka, 7th lord sign, D9 7th lord into real personality traits and real temperament. Not symbols. 3 sentences.
 
--- Partner Background & Profession ---
Use A7, D9 7th lord, Darakaraka sign to indicate career field and family background. 2 sentences.
 
--- Marriage Timing ---
State the top 2 windows from REFINED MARRIAGE TRIGGER section with dates and strength. Primary + backup. 3 sentences.
 
--- Stability & Conflict ---
State emotional%, stability%, conflict risk% from MARRIAGE STABILITY SCORES directly. Translate conflict pattern to real daily behavior (not symbolic). 3 sentences.
 
--- Risks ---
Divorce risk (only if 3+ indicators — state count). Second marriage risk (only if 3+ indicators). If below threshold: say so explicitly. 2 sentences.`, 3000),
 
      // CALL 3 — Career + Money
      call(`Write ONLY these two sections. Apply ALL suppression rules.
PRIORITY RULE: Career fields first, then peak period, then money pattern, then peak windows. 2-4 sentences per sub-topic. Complete sentences only.
 
=== CAREER ===
 
--- Best Career Fields ---
State 3-5 real professions based on D10, H10 lord, Sun, Mercury, Amatyakaraka. Real jobs, not symbols. 2 sentences.
 
--- Work Style ---
Leadership or service? Independent or team? Creative or analytical? State which indicators confirm. 2 sentences.
 
--- Peak Career Period ---
Which Mahadasha/Antardasha brings highest achievement and why. Give years. 2 sentences.
 
--- Career Event Chain ---
Connect: career development → wealth → what it enables next. 2 sentences.
 
=== MONEY ===
 
--- Wealth Pattern ---
How does money come — salary, business, inheritance, spouse, sudden gains? State from H2/H11/Jupiter/Dhana yoga analysis. 2 sentences.
 
--- Peak Wealth Windows ---
Top 2 from WEALTH TIMING ENGINE with period, dates, strength. 2 sentences.
 
--- Wealth Score & Risks ---
State wealth score from WEIGHTED SCORES. Debt risk (H6). Property window. Loss period to watch. 3 sentences.`, 3000),
 
      // CALL 4 — Health + Children
      call(`Write ONLY these two sections. Apply ALL suppression rules.
 
=== HEALTH ===
 
--- Vulnerable Areas ---
State vulnerable body parts from HEALTH ENGINE directly. Top 2 chronic risk areas (2+ indicators each). 3 sentences.
 
--- Mental Health ---
Moon, Mercury, H4 patterns — only if 2+ indicators. Translate to real tendencies. 2 sentences.
 
--- Danger Periods ---
State the specific Dasha danger periods from HEALTH ENGINE. Recovery strength from RECOVERY INDICATORS. 2 sentences.
 
=== CHILDREN ===
 
--- Children Prediction ---
State how many of the 5 required indicators are confirmed (H5, H5 lord, Jupiter, D7, Putrakaraka, dasha). Only predict based on confirmed count. 2 sentences.
 
--- Timing & Concerns ---
Best conception window from CHILDREN TIMING section. Any concerns — only if 2+ indicators confirm (state each). 2 sentences.`, 3000),
 
      // CALL 5 — Foreign + Spiritual
      call(`Write ONLY these two sections. Apply ALL suppression rules.
 
=== FOREIGN & TRAVEL ===
Use FOREIGN SETTLEMENT score from the master fact sheet — state the score and level directly.
Count exactly how many of the 4 required signals are present. State each one.
Foreign career potential: which planets activate 9th-12th axis.
Migration timing: Rahu Dasha, 12th lord active period, Jupiter transit H9/H12 — give years.
Foreign spouse: only if H12 + 9th lord + UL + D9 all align (4+ required). If below 4: state "insufficient indicators."
Event chain: if foreign movement indicated, connect to what triggers it (career change? relationship? spirituality?).
 
=== SPIRITUAL & KARMA ===
Past life indicators: Ketu house and sign, Atmakaraka house, Rahu-Ketu axis meaning.
Unfinished karma: from UNFINISHED KARMA section — state directly.
Occult/intuitive ability: H8, H12, Ketu, 4th house — 2+ required.
Spiritual growth period: Ketu Dasha, 12th lord active, Jupiter-Ketu connection — when in life.
Ancestral karma: Pitru Dosha status from YOGAS section — ACTIVE or NULLIFIED.
Core life lesson: Atmakaraka planet — what this soul came to master in real-world terms.`, 3000),
 
      // CALL 6 — Life Timeline
      call(`Write ONLY this section. Apply ALL suppression rules. Use LIFE STAGE CONTEXT.
PRIORITY RULE: Current phase first, then next 2 phases, then full timeline. 2-3 sentences per life phase. State dominant karma + main event type + growth theme for each. Complete sentences only. from master fact sheet.
 
=== LIFE TIMELINE ===
--- Current Phase (Most Important — Write This First) ---
Which Dasha is running now. What chain of events it is triggering right now. Next 2 events in the chain. Best and worst upcoming months from TRANSIT HEATMAP. 4 sentences.
 
--- Life Phases ---
For each phase: 1-2 sentences maximum. Dominant karma + main event type + growth/pain theme.
Childhood (0-12): [write it]
Teen (13-18): [write it]
Early adult (19-24): [write it]
Young adult (25-30): [write it]
Saturn maturation (31-36): [write it]
Rahu peak (37-45): [write it]
Ketu phase (46-60): [write it]
Old age (60+): [write it]`, 3000),
 
      // CALL 7 — Doshas & Pariharams
      call(`Write ONLY this section. Be extremely specific. No generic remedies.
 
=== DOSHAS & PARIHARAMS ===
Go through every dosha from the YOGAS & DOSHAS section in the chart data.
 
For each dosha write exactly:
DOSHA NAME: [name]
Status: ACTIVE or NULLIFIED
If NULLIFIED: Which specific rule cancels it + what this means practically.
If ACTIVE:
Temple: [specific temple, Tamil Nadu or Kerala] | Deity: [name]
Day: [day] | Mantra: [exact text] × [number] repetitions
Gemstone: [stone] in [metal] on [finger] minimum [weight]ct
Color: [color] on [day] | Donate: [food] to [recipient] on [day]
 
Do not skip any dosha. Do not give generic remedies. Each remedy is specific to that planet's weakness.`, 3000),
 
      // CALL 8 — Peak Windows + Life-Defining Karmas
      call(`Write ONLY these two sections. Be specific with dates and scores.
 
=== PEAK WINDOWS ===
Top 3 marriage windows: from REFINED MARRIAGE section — state period, dates, strength score, reason.
Top 3 wealth windows: from WEALTH TIMING ENGINE — state period, dates, strength level.
Top 3 career breakthrough windows: from DASHA EVENT TRIGGERS — state period, dates.
Top 3 health-risk periods to watch: from HEALTH ENGINE danger periods.
 
=== 3 LIFE-DEFINING KARMAS ===
At the end of the reading, state the 3 strongest repeating patterns across this person's entire life. These are the core story of the chart.
Format for each:
"[Pattern name]: [what this pattern means in real life] — [how it shows across career/relationships/health/family] — [how to consciously work with it rather than be controlled by it]"
These are not predictions. They are the soul's curriculum.`, 3000),
 
    ]);
 
    const reading = [r0,r1,r2,r3,r4,r5,r6,r7,r8]
      .map(r => r.content.map(c => c.text||'').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
 
// Helper needed inline
const RASI_LORD = ['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
