
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = 'You are a master Tamil Jyotish astrologer with 40+ years of experience. Give precise, chart-specific readings. Every statement must cite exact planetary positions and house numbers. Use === SECTION === headers. Be specific with years and ages. Never be vague or generic. Always complete every section fully — never leave a section unfinished.';
 
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
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
 
    const yr  = new Date().getFullYear();
    const p   = chart.planets;
    const d   = chart.dasha;
    const curM = d.current?.lord;
    const curA = d.currentAntar?.lord;
 
    // Build full prompt from prompts.js — extract only the chart data part (before the divider)
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender || 'not specified' }, question);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const ctx = fullPrompt.split(divider)[0].trimEnd();
 
    const call = (sections, tokens = 2000) => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: tokens,
      system: SYSTEM,
      messages: [{ role: 'user', content: ctx + '\n\n' + sections }],
    });
 
    const [r1, r2, r3, r4, r5, r6] = await Promise.all([
 
      // CALL 1 — Character + Past Life + Current Period
      call(`Write ONLY these 3 sections. Start each directly with === header. No intro paragraph. No chart summary.
 
=== CHARACTER & PERSONALITY ===
(Lagna lord position, Rasi, Nakshatra — appearance, personality, strengths, weaknesses, thinking style, emotional nature. Cover everything completely.)
 
=== WHAT HAS HAPPENED IN LIFE (Past) ===
(Every past Dasha period — childhood, education, family events, turning points with years and ages. Cover each period completely.)
 
=== CURRENT PERIOD — ${curM} DASHA, ${curM}-${curA} BHUKTI ===
(RIGHT NOW — career, relationships, health, mindset, challenges, opportunities. Specific to current Dasha lord house position. Complete this section fully.)`),
 
      // CALL 2 — Career + Wealth
      call(`Write ONLY these 2 sections. Start each directly with === header. No intro. Cover each section completely with full detail.
 
=== CAREER & EDUCATION ===
(10th house, 10th lord, Sun H${p.Sun?.house}, Mercury H${p.Mercury?.house} ${p.Mercury?.status}, Saturn H${p.Saturn?.house} — what career suits them? Timeline from education to peak. Every Dasha period's career impact. Key years. Complete the full career picture.)
 
=== WEALTH & FINANCES ===
(H2: ${chart.houses[2]?.join(',')||'Empty'}, H11: ${chart.houses[11]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status} — how wealth comes, timeline year by year through Dashas, best periods, lean periods, long-term financial picture. Complete fully.)`),
 
      // CALL 3 — Property + Siblings + Marriage + Children
      call(`Write ONLY these 4 sections. Start each directly with === header. No intro. Complete each section fully.
 
=== PROPERTY & VEHICLES ===
(H4: ${chart.houses[4]?.join(',')||'Empty'}, 4th lord, Venus H${p.Venus?.house} ${p.Venus?.status} — land, home ownership, vehicles, comforts. Timing from Dasha. Complete fully.)
 
=== SIBLINGS & FATHER ===
(H3: ${chart.houses[3]?.join(',')||'Empty'} for siblings, Mars H${p.Mars?.house}. H9: ${chart.houses[9]?.join(',')||'Empty'} for father, Jupiter H${p.Jupiter?.house}, Sun H${p.Sun?.house} — complete analysis.)
 
=== MARRIAGE & RELATIONSHIPS ===
(H7: ${chart.houses[7]?.join(',')||'Empty'}, Venus H${p.Venus?.house} ${p.Venus?.status}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status} — when is marriage likely? What kind of partner? Love or arranged? Timing from each Antardasha. Complete fully.)
 
=== CHILDREN ===
(H5: ${chart.houses[5]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house}, 5th lord — prospects, timing, nature of children, any concerns. Complete fully.)`),
 
      // CALL 4 — Health + Next 5 Years
      call(`Write ONLY these 2 sections. Start each directly with === header. No intro. Complete each section fully without cutting off.
 
=== HEALTH ===
(H1, H6: ${chart.houses[6]?.join(',')||'Empty'}, H8: ${chart.houses[8]?.join(',')||'Empty'} — constitution, every disease tendency, all body parts to watch, which Dasha periods need care. Mental health from Moon H${p.Moon?.house}. Complete the full health picture.)
 
=== NEXT 5 YEARS — YEAR BY YEAR (${yr} to ${yr+5}) ===
(Each year from ${yr} to ${yr+5}: which Antardasha is running, exact dates, what it means for career, money, relationships, health. For each year be specific and complete. Do not cut off before reaching ${yr+5}.)`),
 
      // CALL 5 — Foreign + Enemies + Spirituality + Special Strengths
      call(`Write ONLY these 4 sections. Start each directly with === header. No intro. Complete each section fully.
 
=== FOREIGN TRAVEL & ABROAD ===
(H12: ${chart.houses[12]?.join(',')||'Empty'}, Rahu H${p.Rahu?.house}, 9th lord — foreign opportunities, overseas life, when likely from Dasha. Complete fully.)
 
=== ENEMIES & OBSTACLES ===
(H6: ${chart.houses[6]?.join(',')||'Empty'}, 6th lord — enemies, court cases, competition, debts. How they overcome. Complete fully.)
 
=== SPIRITUALITY & DHARMA ===
(H9: ${chart.houses[9]?.join(',')||'Empty'}, H12: ${chart.houses[12]?.join(',')||'Empty'}, Ketu H${p.Ketu?.house} — spiritual path, past karma, dharma, moksha inclinations. Complete fully.)
 
=== SPECIAL STRENGTHS OF THIS CHART ===
(Every yoga that gives special gifts. Every strong planet and what it promises. What makes this chart exceptional. Be thorough and complete.)`),
 
      // CALL 6 — Doshas & Remedies + Question
      call(`Write ONLY these sections. Start each directly with === header. No intro. This is the most important section — complete every single Dosha without cutting off.
 
=== DOSHAS & PARIHARAMS (Remedies) ===
(Go through EVERY Dosha listed in the YOGAS & DOSHAS section above. For each one:
- State clearly: ACTIVE or NULLIFIED
- If NULLIFIED: explain exactly which rule cancels it, what that means for this person's life
- If ACTIVE: give the complete remedy — specific temple name in Tamil Nadu or Kerala, presiding deity, day of week, exact mantra with number of repetitions, gemstone with which finger and which metal, colour to wear, food to donate
Do not stop until every single Dosha has been addressed completely.)${question ? `
 
=== ANSWER TO YOUR QUESTION ===
(${question} — full astrological reasoning with specific timing. Complete this section fully.)` : ''}`),
 
    ]);
 
    const reading = [r1, r2, r3, r4, r5, r6]
      .map(r => r.content.map(c => c.text || '').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
