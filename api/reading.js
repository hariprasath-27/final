
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = `You are a precise Tamil Jyotish astrologer with 40 years of experience.
 
RULES:
- Facts only. No poetry. No flowery language.
- State WHAT will happen or tends to happen, WHEN (year/age/dasha period), and WHY (brief planet+house reason).
- Use === SECTION === for main headings and --- Sub Heading --- for sub-topics.
- Short paragraphs of 3-5 sentences. No bullet points.
- Speak directly to the person as "you".
- PROBABILITY LANGUAGE REQUIRED: Never say "you will". Say "strongly suggests", "high tendency", "likely if current patterns continue", "the chart indicates".
- CONTRADICTION RULE: If a planet is both strong and afflicted, state both sides. Do not choose one.
- SHOCK FACTS RULE: Only state psychological or personal insights if supported by 2+ chart indicators from the MASTER FACT SHEET. Never invent trauma, betrayal, or death without explicit chart support.
- HEALTH RULE: State health tendencies and vulnerable body systems only. Do not diagnose diseases. Use probabilistic language.
- DEATH RULE: Never estimate death age or manner. Focus on longevity tendencies and vulnerable periods only.
- PRIORITY: Strongest planets dominate life. Weakest create recurring struggles. Current Dasha is what is active NOW.
- Complete every sentence. Never stop mid-sentence.`;
 
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
${sf.filter(f=>f.count>=2).map(f=>`[${f.confidence}] ${f.statement}`).join('\n') || 'No high-confidence patterns'}
 
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
 
      // CALL 0 — Shock facts (guardrailed)
      call(`Write ONLY this section. Use ONLY facts from VERIFIED PSYCHOLOGICAL PATTERNS and MASTER FACT SHEET above. If fewer than 2 indicators support a claim, do not make it. No invented insights.
 
=== WHAT YOUR CHART REVEALS ABOUT YOU ===
 
Write 6 short statements (2-3 sentences each) using only verified chart data:
1. One fact about physical appearance and family background (from Lagna and H4/H9)
2. One fact about emotional nature that surprises others (from Moon + Nakshatra)
3. One verified psychological pattern (use only HIGH confidence ones from MASTER FACT SHEET)
4. One specific thing that has already happened based on past Dashas
5. One fact about career or money that is specific to this chart
6. One striking fact about what is coming in the next 2 years based on current Dasha + transit triggers`, 1500),
 
      // CALL 1 — Character
      call(`Write ONLY this section. Use MASTER FACT SHEET for all facts. Start with === header.
 
=== WHO YOU ARE ===
 
--- Appearance & Background ---
From ${chart.lagna.rasi} Lagna (lord ${chart.lagna.lord} H${chart.lagna.lordHouse}, ${chart.lagna.lordStatus}): 2 paragraphs on physical appearance and family background from H4 (${chart.houses[4]?.join(',')||'Empty'}) and H9 (${chart.houses[9]?.join(',')||'Empty'}).
 
--- Core Personality ---
From Moon H${p.Moon?.house} ${p.Moon?.rasi} and ${chart.nakshatra.name} Nakshatra: how this person thinks, feels, responds to stress and love. ${chart.contradictions?.length ? 'Note these contradictions: '+chart.contradictions.map(c=>c.planet).join(', ') : ''}
 
--- Strengths & Weaknesses ---
Strongest planets: ${chart.planetRanking?.strongest?.join(', ')} — what they give in real life.
Weakest planets: ${chart.planetRanking?.weakest?.join(', ')} — what recurring problems they create.`, 2000),
 
      // CALL 2 — Past & Present
      call(`Write ONLY this section. Start with === header. Use MASTER FACT SHEET for current period.
 
=== PAST & PRESENT ===
 
--- What Life Has Given So Far ---
2 paragraphs: brief summary of past Dasha periods. What shaped this person in childhood, education, early adult years. Key turning points with approximate years.
 
--- Karma & Soul Purpose ---
1 paragraph: Ketu H${p.Ketu?.house} and Rahu H${p.Rahu?.house} — what past life patterns this person brought in and what they came to learn.
 
--- Right Now: ${curM} Mahadasha, ${curA} Bhukti ---
3 paragraphs: What ${curM} in H${p[curM]?.house} (${p[curM]?.status}) is activating as Mahadasha lord. What ${curA} in H${p[curA]?.house} is adding right now. Then precisely what is happening in this person's life at this moment — career, relationships, finances, inner state.
 
--- Next 12 Months: Changes & What to Do ---
2 paragraphs: What is shifting in the next 12 months based on current Dasha + these transit triggers: ${[...(chart.transitTriggers?.marriage||[]),(chart.transitTriggers?.career||[]),(chart.transitTriggers?.wealth||[])].slice(0,3).join(' | ')||'see Dasha analysis'}. Good things opening, risks to navigate.`, 2500),
 
      // CALL 3 — Career & Wealth
      call(`Write ONLY this section. Start with === header. Use MASTER FACT SHEET career and wealth sections.
 
=== CAREER & MONEY ===
 
--- Right Profession ---
From H10 (${chart.houses[10]?.join(',')||'Empty'}), Sun H${p.Sun?.house} ${p.Sun?.status}, Mercury H${p.Mercury?.house} ${p.Mercury?.status}, Saturn H${p.Saturn?.house}: what profession suits this chart. Also D10 analysis: ${chart.d10 ? 'D10 10th house lord position shows career expression in deeper chart' : ''}.
 
--- Career Right Now (Age ${age}) ---
2 paragraphs: current ${curM}-${curA} Dasha impact on career. Is this a rise, slow, or transition period. Immediate actions that will move career forward.
 
--- Career Timeline ---
3 short paragraphs — one per phase:
- Now to age ${age+5}: career phase, key Dasha, what to pursue
- Age ${age+5} to ${age+10}: when breakthrough comes, which Dasha, what position
- After age ${age+10}: peak and later career picture
 
--- Wealth ---
2 paragraphs: how wealth comes from H2 (${chart.houses[2]?.join(',')||'Empty'}), H11 (${chart.houses[11]?.join(',')||'Empty'}), Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}. Peak wealth windows from MASTER FACT SHEET: ${(chart.wealthEngine?.windows||[]).slice(0,2).map(w=>w.period+' '+w.strength).join(', ')||'see Dasha'}. Lean periods and long-term picture.`, 2500),
 
      // CALL 4 — Marriage (fully updated with all engines)
      call(`Write ONLY this section. Start with === header. Use ALL marriage data from MASTER FACT SHEET. This is the most data-rich section.
 
=== MARRIAGE & RELATIONSHIPS ===
 
--- Your Life Partner ---
3 paragraphs describing the destined partner using:
- H7 (${chart.houses[7]?.join(',')||'Empty'}), 7th lord ${RASI_LORD[(chart.lagna.rasiIdx+6)%12]} in H${p[RASI_LORD[(chart.lagna.rasiIdx+6)%12]]?.house}
- Venus H${p.Venus?.house} ${p.Venus?.status} (affliction: ${chart.venusAffliction?.level})
- Upapada: ${chart.upapadaLordAnalysis?.summary?.slice(0,80)||''}
- A7 Darapada: ${chart.a7?.rasi}
- Navamsa: ${chart.navamsaMarriage?.summary?.slice(0,80)||''}
- Darakaraka: ${chart.karakas?.Darakaraka}
What kind of person, their profession, their nature, how they complement or challenge.
 
--- Love or Arranged? Family Reaction? ---
2 paragraphs. What the chart shows about how meeting happens. What parents' attitude will be and why. Will family approve?
 
--- Marriage Timing ---
2 paragraphs. Use the pre-computed marriage windows from MASTER FACT SHEET (overall stability ${chart.marriageScores?.overall}/100, delay risk ${chart.marriageScores?.delay}%). State the best Dasha window and approximate age. If delay indicated, state why and until when.
 
--- Married Life: Stability & Issues ---
2 paragraphs. Use marriage scores: stability ${chart.marriageScores?.stability}%, conflict risk ${chart.marriageScores?.conflict}%. What the recurring harmony and friction will be. Most challenging periods. ${chart.divorceIndicators?.count >= 2 ? 'Note: '+chart.divorceIndicators?.summary?.slice(0,100) : 'Marriage expected to be stable.'}
 
--- Second Marriage & Hidden Patterns ---
1 paragraph. ${chart.secondMarriage?.summary?.slice(0,150)||'Second marriage not strongly indicated.'}. ${chart.secretRelationship?.present ? 'Secret relationship tendency: '+chart.secretRelationship?.summary?.slice(0,100) : ''}`, 3000),
 
      // CALL 5 — Children & Health
      call(`Write ONLY this section. Start with === header. Use MASTER FACT SHEET for health and children sections.
 
=== CHILDREN ===
From H5 (${chart.houses[5]?.join(',')||'Empty'}), Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}, D7 Jupiter: ${chart.d7?.planets?.Jupiter?.rasi||'N/A'} H${chart.d7?.planets?.Jupiter?.house||'?'}.
2 paragraphs: when children come, how many, timing from MASTER FACT SHEET children windows. Nature of children. Any concerns.
 
=== HEALTH ===
 
--- Physical Constitution ---
2 paragraphs: body type from ${chart.lagna.rasi} Lagna and ${chart.nakshatra.nadi} Nadi. Energy level and immunity. Vulnerable body parts: ${chart.healthEngine?.vulnerableBodyParts}.
 
--- Health Tendencies & Systems ---
2 paragraphs: Using health tendencies from MASTER FACT SHEET. State which body SYSTEMS are vulnerable (digestive, nervous, hormonal, cardiovascular, immune). Use probabilistic language — tendencies not diagnoses.
 
--- Mental Health ---
2 paragraphs: Moon H${p.Moon?.house} ${p.Moon?.status} — how this person's mind handles sustained stress. Anxiety or depression tendency level. What maintains mental balance.
 
--- Danger Periods ---
1 paragraph: which Dasha periods need health care from MASTER FACT SHEET. What preventive actions to take now.`, 2500),
 
      // CALL 6 — Future (3 phases, accuracy-based)
      call(`Write ONLY this section. Start with === header. Use MASTER FACT SHEET for all predictions. Accuracy drops after 12 years so keep later phases shorter.
 
=== FUTURE ===
 
--- Phase 1: Next 3 Years (${yr}–${yr+3}) — HIGHEST ACCURACY ---
3 paragraphs. Which Dashas and Bhuktis run. What major events are indicated in career, relationships, finances, health. What decisions now shape the next decade. Use transit triggers from MASTER FACT SHEET. Good things opening and risks to navigate.
 
--- Phase 2: Years 3–7 (${yr+3}–${yr+7}) — HIGH ACCURACY ---
3 paragraphs. Which new Dashas begin. Key milestones indicated — career breakthrough, marriage, children, property. What to build during these years. What gets tested.
 
--- Phase 3: Years 7–12 (${yr+7}–${yr+12}) — MODERATE ACCURACY ---
2 paragraphs. How life looks by this point — career position, family, financial stability. Major challenges arriving and rewards from earlier work. Note that predictions beyond 7 years are tendencies, not certainties.`, 3000),
 
      // CALL 7 — Doshas & Remedies
      call(`Write ONLY this section. Start with === header. Every Dosha must get ACTIVE or NULLIFIED status.
 
=== DOSHAS & PARIHARAMS ===
 
--- Dosha Status ---
Go through every Dosha in the YOGAS & DOSHAS list above. For each: ACTIVE or NULLIFIED in first sentence. Then the exact classical rule. Then what it means in real life terms.
 
--- Complete Remedies ---
For every ACTIVE Dosha: specific temple name and location in Tamil Nadu or Kerala, deity, day, exact mantra in Sanskrit with repetition count, gemstone with finger and metal, colour to wear, food or item to donate. Enough detail to begin this week.`, 3000),
 
      // CALL 8 — Strengths + Longevity + Question
      call(`Write ONLY these sections. Start each with === header.
 
=== SPECIAL STRENGTHS ===
3 paragraphs. Strongest planets and yogas from MASTER FACT SHEET and what specific real-life gifts they give. What level of achievement is genuinely possible. What makes this chart exceptional.
 
=== LONGEVITY & LATER LIFE ===
3 paragraphs. What life looks like after 60. What 8th house (${chart.houses[8]?.join(',')||'Empty'}) and Saturn H${p.Saturn?.house} indicate about vitality and resilience in old age. Which Dasha periods in later life are vulnerable and need care. Focus on longevity tendencies and quality of later years — do not estimate death age or manner.${question ? `
 
=== YOUR QUESTION ===
3 paragraphs answering "${question}" — what the chart shows, which planets are involved, when it resolves, clear probability-based answer.` : ''}`, 2500),
 
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
