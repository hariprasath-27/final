
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = 'You are a master Tamil Jyotish astrologer with 40+ years of experience. Give precise, chart-specific readings. Every statement must cite exact planetary positions and house numbers. Use === SECTION === headers. Be specific with years and ages. Never be vague or generic.';
 
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
 
    const call = (sections) => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      system: SYSTEM,
      messages: [{ role: 'user', content: ctx + '\n\n' + sections }],
    });
 
    const [r1, r2, r3, r4, r5] = await Promise.all([
 
      call(`Write ONLY these sections. Start each with === header. No intro paragraph. No chart summary. No repeating other sections.
 
=== CHARACTER & PERSONALITY ===
(Lagna lord, Rasi, Nakshatra — appearance, personality, strengths, weaknesses, thinking style, emotional nature. Very specific.)
 
=== WHAT HAS HAPPENED IN LIFE (Past) ===
(Each past Dasha period — childhood, education, family events, turning points with years and ages.)
 
=== CURRENT PERIOD — ${curM} DASHA, ${curM}-${curA} BHUKTI ===
(RIGHT NOW — career, relationships, health, mindset, challenges, opportunities. Specific to current Dasha lord house position.)`),
 
      call(`Write ONLY these sections. Start each with === header. No intro. No repeating other sections.
 
=== CAREER & EDUCATION ===
(10th house, 10th lord, Sun H${p.Sun?.house}, Mercury H${p.Mercury?.house}, Saturn H${p.Saturn?.house} — what career suits them? When does career peak? Key years from Dashas.)
 
=== WEALTH & FINANCES ===
(H2: ${chart.houses[2]?.join(',')||'Empty'}, H11: ${chart.houses[11]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status} — when does money come? Lean periods? Long-term picture.)
 
=== PROPERTY & VEHICLES ===
(H4: ${chart.houses[4]?.join(',')||'Empty'}, 4th lord, Venus H${p.Venus?.house} ${p.Venus?.status} — land, home, vehicles, comforts. Timing from Dasha.)
 
=== SIBLINGS & FATHER ===
(H3: ${chart.houses[3]?.join(',')||'Empty'} for siblings. H9: ${chart.houses[9]?.join(',')||'Empty'} for father, luck, dharma, long travel.)`),
 
      call(`Write ONLY these sections. Start each with === header. No intro. No repeating other sections.
 
=== MARRIAGE & RELATIONSHIPS ===
(H7: ${chart.houses[7]?.join(',')||'Empty'}, Venus H${p.Venus?.house}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status} — when is marriage likely? What kind of partner? Love or arranged? Delays?)
 
=== CHILDREN ===
(H5: ${chart.houses[5]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} — prospects, timing, concerns.)
 
=== HEALTH ===
(H1, H6: ${chart.houses[6]?.join(',')||'Empty'}, H8: ${chart.houses[8]?.join(',')||'Empty'} — constitution, disease tendencies, body parts to watch, which Dasha periods need care. Mental health from Moon H${p.Moon?.house}.)`),
 
      call(`Write ONLY these sections. Start each with === header. No intro. No repeating other sections.
 
=== NEXT 5 YEARS — YEAR BY YEAR (${yr} to ${yr+5}) ===
(Each year: which Antardasha is running, what it means for career, money, relationships, health. Specific and practical.)
 
=== FOREIGN TRAVEL & ABROAD ===
(H12: ${chart.houses[12]?.join(',')||'Empty'}, Rahu H${p.Rahu?.house} — foreign opportunities, overseas life, when likely from Dasha.)
 
=== ENEMIES & OBSTACLES ===
(H6: ${chart.houses[6]?.join(',')||'Empty'}, 6th lord — enemies, court cases, competition, debts. How they overcome.)
 
=== SPIRITUALITY & DHARMA ===
(H9: ${chart.houses[9]?.join(',')||'Empty'}, H12: ${chart.houses[12]?.join(',')||'Empty'}, Ketu H${p.Ketu?.house} — spiritual path, past karma, dharma, moksha.)`),
 
      call(`Write ONLY these sections. Start each with === header. No intro. No chart overview. No repeating other sections.
 
=== SPECIAL STRENGTHS OF THIS CHART ===
(Which yogas give special gifts. The strongest planets and what they promise. What makes this chart exceptional.)
 
=== DOSHAS & PARIHARAMS (Remedies) ===
(Every Dosha in the YOGAS & DOSHAS list above — for each state ACTIVE or NULLIFIED. If NULLIFIED state exactly which rule cancels it and what that means. If ACTIVE give complete remedy: specific temple in Tamil Nadu or Kerala, deity, day, exact mantra with count, gemstone with finger and metal, colour to wear, food to donate.)${question ? `
 
=== ANSWER TO YOUR QUESTION ===
(${question} — full astrological reasoning with timing.)` : ''}`),
 
    ]);
 
    const reading = [r1, r2, r3, r4, r5]
      .map(r => r.content.map(c => c.text || '').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
