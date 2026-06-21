
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = `You are a precise Tamil Jyotish astrologer with 40 years of experience. You give clear, factual readings.
 
HOW YOU WRITE:
- Be direct and factual. No flowery language, no poetic descriptions
- State WHAT will happen, WHEN it will happen, and WHY (planet + house in one short phrase)
- Use === SECTION === for main headings and --- Sub Heading --- for sub-topics
- Write in short clear paragraphs — 3 to 5 sentences each, factual and specific
- Every statement must have a time period or age attached to it
- Speak directly to the person as "you"
- No bullet points — short paragraphs only
- CRITICAL: Complete every sentence fully. Never stop mid-sentence or mid-word.`;
 
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
      lagna:     lagna     || undefined,
      rasi:      rasi      || undefined,
      nakshatra: nakshatra || undefined,
    });
 
    const yr   = new Date().getFullYear();
    const age  = Math.floor((Date.now() - new Date(dob)) / (365.25*24*3600*1000));
    const p    = chart.planets;
    const d    = chart.dasha;
    const curM = d.current?.lord;
    const curA = d.currentAntar?.lord;
 
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender || 'not specified' }, question);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const ctx = fullPrompt.split(divider)[0].trimEnd();
 
    const call = (prompt, tokens) => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: tokens,
      system: SYSTEM,
      messages: [{ role: 'user', content: `${ctx}\n\n${prompt}` }],
    });
 
    // All 9 calls run in parallel simultaneously
    const [r0,r1,r2,r3,r4,r5,r6,r7,r8] = await Promise.all([
 
      // CALL 0 — Shock Facts (top hook segment)
      call(`Write ONLY this section. Start directly with the === header.
 
=== WHAT YOUR STARS REVEAL ABOUT YOU ===
 
Write 6 to 8 short sharp statements — each one a specific, striking, personal fact about this person that most people would find shocking or uncannily accurate. Each statement should be 2-3 sentences maximum. They must feel personal and specific — not generic horoscope statements.
 
Cover these areas, one statement each:
- One fact about their childhood or family that most people would not know just by looking at them
- One fact about their personality that they try to hide or that surprises others
- One specific thing that has already happened in their life (a struggle, a turning point, a loss, a phase of confusion or delay)
- One fact about their career — either a specific talent they have or a specific obstacle or delay they have faced
- One fact about their love life or relationship — something they have felt or experienced
- One fact about their health — a specific physical tendency or issue they recognise
- One fact about money — how they handle it or a specific financial pattern in their life
- One striking fact about their future — something specific that is coming that they should know now
 
Base every statement on the actual chart: ${chart.lagna.rasi} Lagna, ${chart.rasi.name} Rasi, ${chart.nakshatra.name} Nakshatra, current ${curM}-${curA} Dasha, and the planetary positions. Each statement should feel like the astrologer is reading their diary, not giving a generic prediction.
 
Do not use headers inside this section. Do not number the statements. Just write them as flowing short paragraphs one after another.`, 2000),
 
      // CALL 1 — Who You Are
      call(`Write ONLY this section. Start with the === header. Short factual paragraphs, 3-5 sentences each. State facts clearly with timing and astrological reason in brief.
 
=== WHO YOU ARE ===
 
--- Appearance & Family Background ---
Describe physical appearance from ${chart.lagna.rasi} Lagna (lord ${chart.lagna.lord} H${chart.lagna.lordHouse}, ${chart.lagna.lordStatus}) — height tendency, build, skin tone, key facial features. Then describe the family background — what kind of home they grew up in, family's social position and values, from H4 (${chart.houses[4]?.join(',')||'Empty'}) and H9 (${chart.houses[9]?.join(',')||'Empty'}).
 
--- Core Personality ---
From Moon H${p.Moon?.house} ${p.Moon?.rasi} and ${chart.nakshatra.name} Nakshatra (${chart.nakshatra.gana} Gana, ${chart.nakshatra.nadi} Nadi): how this person thinks, feels, responds to stress and love. Their relationship with spirituality and God. The one or two characteristic mistakes they keep making in life.
 
--- Strengths ---
List the real strengths this chart gives — one short paragraph per major strength. What planet, what house, what real-life ability it produces.
 
--- Weaknesses ---
List the real weaknesses — one short paragraph per weakness. What planet, what house, what failure pattern it creates.`, 3000),
 
      // CALL 2 — Timeline: Past / Present / Near Future
      call(`Write ONLY this section. Start with the === header. Facts only — what happened, what is happening, what will happen. State the year or age for every event.
 
=== LIFE TIMELINE ===
 
--- Past: What Already Happened ---
Write one short paragraph per major Dasha period that has already passed. For each: state the Dasha lord, the years it ran, and 2-3 specific things that happened or were shaped during that period (childhood character, education outcome, key relationships, turning points). Keep each paragraph to 4-5 sentences.
 
--- Karma from Past Life ---
One paragraph: what Ketu H${p.Ketu?.house} ${p.Ketu?.rasi} and Rahu H${p.Rahu?.house} ${p.Rahu?.rasi} show about what this soul brought in and what it came to learn.
 
--- Present: What Is Happening Right Now ---
State the current Dasha: ${curM} Mahadasha, ${curA} Bhukti. Write 2 paragraphs. First: exactly what is active in this person's life right now — career situation, relationship status, financial state, mental state — based on ${curM} H${p[curM]?.house} and ${curA} H${p[curA]?.house}. Second: what is about to change in the next 6-12 months — which door is opening, which is closing, and what requires action now.
 
--- Good Things Happening or Coming ---
Write one paragraph listing specifically the good events or opportunities that are open right now or within the next 2 years. State what, when, and why.
 
--- Issues & Warnings Right Now ---
Write one paragraph listing specifically the problems, risks, or challenges active right now or within the next 2 years. State what, when, and what to do about it.`, 3500),
 
      // CALL 3 — Career & Money (facts and timeline)
      call(`Write ONLY this section. Start with === header. Facts and timeline only. State what happens and when.
 
=== CAREER & MONEY ===
 
--- Right Profession ---
From H10 (${chart.houses[10]?.join(',')||'Empty'}), Sun H${p.Sun?.house} ${p.Sun?.status}, Mercury H${p.Mercury?.house} ${p.Mercury?.status}, Saturn H${p.Saturn?.house} ${p.Saturn?.status}: state in 2 paragraphs what specific field or profession fits this chart and why. What work will this person naturally excel at.
 
--- Career Right Now (Age ${age}) ---
2 paragraphs. What is happening in career right now under ${curM}-${curA}. Is this a rise period, a slow period, or a transition? What specific action will move career forward in the next 12 months.
 
--- Career Events by Period ---
Write one paragraph per major career phase:
- Ages up to now: what career foundation was built
- Next 3-5 years: what changes, what to pursue
- Age 30-40: the main career growth period
- Age 40-50: peak or plateau
- After 50: what career looks like
 
--- Wealth Timeline ---
From H2 (${chart.houses[2]?.join(',')||'Empty'}), H11 (${chart.houses[11]?.join(',')||'Empty'}), Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}: write one paragraph per phase:
- Current financial state
- Best earning years (which Dasha, which age)
- Lean years to watch
- Property and savings picture long-term`, 3500),
 
      // CALL 4 — Marriage & Children
      call(`Write ONLY this section. Start with === header. Direct facts — what will happen, when, what kind of person.
 
=== MARRIAGE & CHILDREN ===
 
--- Your Partner ---
From H7 (${chart.houses[7]?.join(',')||'Empty'}), Venus H${p.Venus?.house} ${p.Venus?.status}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}: 2 paragraphs describing the actual partner — their nature, profession, background. Not abstract — what kind of person will this be in real life.
 
--- Love or Arranged? ---
1 paragraph. What the chart shows about how the meeting will happen. What parents' reaction will be — supporting or opposing and why. Will family approve and when.
 
--- Marriage Timing ---
1 paragraph. Which Dasha period, approximate year, best age window. If delays, explain why and for how long.
 
--- Married Life: Issues & Strengths ---
2 paragraphs. The recurring harmony and the recurring friction in this marriage. The most difficult periods and what causes them. Whether it is long-lasting or faces serious strain.
 
--- Children ---
2 paragraphs. From H5 (${chart.houses[5]?.join(',')||'Empty'}), Jupiter H${p.Jupiter?.house}: when children come, how many, timing of first child, what kind of children they will be. Any conception concerns.`, 3500),
 
      // CALL 5 — Health
      call(`Write ONLY this section. Start with === header. Medical facts — name specific conditions, organs, timing.
 
=== HEALTH ===
 
--- Constitution ---
2 paragraphs. Body type and immunity from ${chart.lagna.rasi} Lagna and ${chart.nakshatra.nadi} Nadi. Natural energy level. How fast this person recovers from illness.
 
--- Specific Disease Tendencies ---
From H6 (${chart.houses[6]?.join(',')||'Empty'}), H8 (${chart.houses[8]?.join(',')||'Empty'}), Sun H${p.Sun?.house}, Mars H${p.Mars?.house}, Saturn H${p.Saturn?.house}: write one paragraph per major health concern — name the specific organ or system, what can go wrong, what early signs to watch for. Be medically specific.
 
--- Mental Health ---
2 paragraphs. How this person's mind handles stress, whether anxiety or depression is a risk, what keeps them mentally stable. From Moon H${p.Moon?.house} ${p.Moon?.status}.
 
--- Health Danger Periods ---
One paragraph per danger period: which Dasha, which age range, what health issue is most likely, what to do to prepare.`, 3500),
 
      // CALL 6 — Future: next 20 years in clear phases
      call(`Write ONLY this section. Start with === header. Clear phases — what happens in each period. State the Dasha running, key events, good things, issues. Short factual paragraphs.
 
=== FUTURE: NEXT 20 YEARS ===
 
--- ${yr} to ${yr+3}: Current Phase ---
State which Dashas run. What are the 3-4 most important things that will happen in these years — in career, money, marriage, family, health. What is good, what needs caution.
 
--- ${yr+3} to ${yr+6}: Next Phase ---
State which Dashas begin. What major events are indicated — promotion, marriage, children, property, travel. What to pursue and what to avoid.
 
--- ${yr+6} to ${yr+10}: Growth Phase ---
What has been achieved by this point. What new challenges arrive. What rewards come from earlier effort. Key events.
 
--- ${yr+10} to ${yr+15}: Maturity Phase ---
Life at age ${age+10} to ${age+15}. Career position, family state, financial stability, health picture. Key events and transitions.
 
--- ${yr+15} to ${yr+20}: Settling Phase ---
What life looks like as this person moves toward their 40s or 50s. What has been built. What still needs to happen. Spiritual and personal turning points.`, 4000),
 
      // CALL 7 — Doshas & Remedies
      call(`Write ONLY this section. Start with === header. For each Dosha: one paragraph on status and impact, one paragraph on complete remedy. Be specific.
 
=== DOSHAS & PARIHARAMS ===
 
--- Dosha Analysis ---
Go through every Dosha in the YOGAS & DOSHAS list above. For each: state ACTIVE or NULLIFIED in the first sentence, explain the exact classical rule that applies, then state in plain terms what this means for this person's life — what problem it causes if active, or what protection it gives if nullified.
 
--- Remedies ---
For every ACTIVE Dosha: give the complete remedy — specific temple name and location in Tamil Nadu or Kerala, presiding deity, day of week, exact mantra in Sanskrit with exact count, gemstone with finger and metal, colour to wear, item to donate. One Dosha, one complete remedy block. Enough detail to act on immediately.`, 4000),
 
      // CALL 8 — Strengths + Old Age + Death + Question
      call(`Write ONLY these sections. Start each with its === header. Facts, no poetry.
 
=== SPECIAL STRENGTHS ===
3 paragraphs. What extraordinary yogas this chart has and what specific life advantages they give. Which is the strongest planet and what it promises. What level of achievement is genuinely possible.
 
=== LATER LIFE & LONGEVITY ===
3 paragraphs. What life looks like after 60. What the 8th house (${chart.houses[8]?.join(',')||'Empty'}) and Saturn H${p.Saturn?.house} indicate about lifespan and old age health. Which Dasha periods in old age are difficult. What kind of final years this chart shows — active or declining. What approximate age range the chart suggests for the natural end of life and what kind of passing is indicated. Be honest and respectful.${question ? `
 
=== YOUR QUESTION ===
3 paragraphs answering "${question}" — what the chart shows, which planets are involved, when it will resolve, what the clear answer is.` : ''}`, 3500),
 
    ]);
 
    const reading = [r0,r1,r2,r3,r4,r5,r6,r7,r8]
      .map(r => r.content.map(c => c.text || '').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
