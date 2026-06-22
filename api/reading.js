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
 
OUTPUT: Facts only. No poetry. Short paragraphs 3-5 sentences. No bullet points. Speak as "you". === SECTION === and --- Sub Heading --- headers. Complete every sentence.
 
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
 
=== ACTIVE KARMA PRIORITY (Run this engine first) ===
State the 3 strongest active karmas RIGHT NOW based on current Dasha lord, Antardasha lord, and active transit triggers from the MASTER FACT SHEET. For each: state the planet, its house position, its condition, and what it is activating in real-world terms right now. Format: "1. [Planet] as [Mahadasha/Antardasha lord] activates [house] — [real-world meaning]." This is the lens for the entire reading.
 
=== SELF ===
Physical appearance, body type, constitution based on Lagna, Lagna lord, Moon. Be specific — not symbolic. Mention actual features.
Mind structure: how this person thinks, decides, processes emotion — Moon nakshatra, Mercury, Lagna lord house.
Natural temperament and aura — Nakshatra gana, element, pada psychology.
Core strengths — which planets give actual gifts and how in daily life (use PLANET DOMINANCE ranking).
Core weaknesses — which planets create recurring struggle and how.
Gift AND shadow for the 2 most dominant planets (state both sides, never one only).`, 1200),
 
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
Relationship phase engine: based on current Dasha — which phase (attraction/commitment/stability/adjustment) is most active now?`, 1000),
 
      // CALL 2 — Marriage (full engine)
      call(`Write ONLY this section. Apply ALL suppression rules. Analyze marriage in exact order.
 
=== MARRIAGE ===
Go through each factor in order: H7 → H7 lord → Venus → Upapada → UL lord → D9 7th → D9 7th lord → Darakaraka → A7 → current dasha → transit. For each: state its condition (strong/weak/neutral/afflicted) and what it means in real terms.
 
Marriage type (Love/Arranged/Hybrid — needs 2+ indicators each type).
Partner nature: translate DK, 7th lord, D9 7th lord into real personality (not symbols — real traits, real temperament).
Partner profession: use Darakaraka sign, D9 7th lord, A7.
Partner appearance: 7th lord sign, D9 7th, DK nature.
Timing: primary window + secondary + backup. State period, dates, strength score from REFINED MARRIAGE section.
Stability score: state from MARRIAGE STABILITY SCORES directly.
Conflict pattern: Mars/Saturn/Rahu influence on H7 — translate to real daily behavior.
Divorce risk: only if 3+ indicators present. State count and each indicator.
Second marriage risk: only if 3+ indicators.
Blended marriage score: state D1+D9+UL score from WEIGHTED SCORES explicitly.`, 1200),
 
      // CALL 3 — Career + Money
      call(`Write ONLY these two sections. Apply ALL suppression rules.
 
=== CAREER ===
Best 3-5 career fields based on D10, H10 lord, Sun, Mercury, Saturn, Amatyakaraka. State real professions, not symbols.
Work style: leadership or service, independent or team, creative or analytical — which indicators confirm this.
Business potential: H7, Mercury, Jupiter, 11th lord analysis.
Career shift periods: when Saturn transits H10, Rahu Dasha, major Mahadasha changes — give years.
Promotion/breakthrough timing: current Antardasha, Jupiter transit H10/H6.
Peak career period: which Mahadasha brings highest achievement and exactly why.
Event chain: connect career shifts to other life events (career peak → wealth increase → marriage timing or vice versa).
 
=== MONEY ===
Wealth pattern: does money come through salary, business, inheritance, spouse, or sudden gains? Which indicators show this.
Savings vs expenditure tendency: H2 vs H12, Saturn vs Jupiter influence.
Debt risk: H6, H6 lord condition.
Property timing: H4, Mars, Moon — dasha windows for property.
Inheritance signal: H8, H8 lord, 9th lord.
Peak wealth windows: top 3 from WEALTH TIMING ENGINE section (state period + dates + strength).
Loss periods: when to be cautious.
Blended wealth score from WEIGHTED SCORES.`, 1100),
 
      // CALL 4 — Health + Children
      call(`Write ONLY these two sections. Apply ALL suppression rules.
 
=== HEALTH ===
Vulnerable body parts: state from HEALTH ENGINE section directly.
Top 2 chronic risk areas: H6, H8, H12 analysis — 2+ indicators required for each.
Mental health patterns: Moon, Mercury, H4 — 2+ required. Translate to real symptoms not symbols.
Accident risk: Mars, 8th house — 2+ required.
Surgery indicators: only if 3+ indicators (Mars H6/H8, 8th lord active, Saturn transit H1/H8).
Danger periods: from HEALTH ENGINE section — state the specific Dashas.
Recovery strength: from RECOVERY INDICATORS section — state directly.
Gift and shadow of the health chart (e.g., strong Mars = physical power but accident tendency).
 
=== CHILDREN ===
Use H5, H5 lord, Jupiter, D7, Putrakaraka, current dasha — all 5 required before strong prediction.
Fertility and timing: Jupiter transit over H5, Jupiter Bhukti window.
Bond quality with children: Moon-H5 connection, Jupiter condition.
Concerns: only if 2+ indicators confirm. Ketu H5 alone is not enough — state clearly what confirms concern.
Child karma from UNFINISHED KARMA section if relevant.`, 1000),
 
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
Core life lesson: Atmakaraka planet — what this soul came to master in real-world terms.`, 1000),
 
      // CALL 6 — Life Timeline
      call(`Write ONLY this section. Apply ALL suppression rules. Use LIFE STAGE CONTEXT from master fact sheet.
 
=== LIFE TIMELINE ===
For each phase state: dominant karma active, major event type most likely, growth theme, pain theme.
Childhood (0-12): family karma, education, emotional patterns set.
Teen (13-18): education direction, social patterns, family dynamics.
Early adult (19-24): education completion, first career steps, first love.
Young adult (25-30): career establishment, marriage window, wealth beginning.
Saturn maturation (31-36): career authority solidifies, family stability, property.
Rahu peak (37-45): peak ambition, major life decisions, foreign possibility.
Ketu phase (46-60): wisdom period, spiritual turning, legacy building.
Old age (60+): health patterns, family support quality, final life chapter.
 
Current phase NOW: state which Dasha is running, what chain of events it is currently triggering, and what the next 2 events in the chain are likely to be.
 
TRANSIT HEATMAP: state the best and worst months from TRANSIT HEATMAP section directly.`, 1000),
 
      // CALL 7 — Doshas & Pariharams
      call(`Write ONLY this section. Be extremely specific. No generic remedies.
 
=== DOSHAS & PARIHARAMS ===
Go through EVERY dosha in YOGAS & DOSHAS section. For EACH:
If NULLIFIED — state exactly which rule cancels it and what that means for this person's life.
If ACTIVE — give:
  Temple: specific temple name in Tamil Nadu or Kerala + presiding deity
  Day: specific day of week
  Mantra: exact mantra text + exact number of repetitions
  Gemstone: which stone, which finger, which metal, minimum weight in carats
  Color: specific color to wear on which day
  Food donation: specific food item to whom on which day
No generic advice. Every remedy must be tied to the specific dosha and the specific planet.`, 1000),
 
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
These are not predictions. They are the soul's curriculum.`, 1000),
 
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
