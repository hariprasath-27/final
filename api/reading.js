
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
 
    // Build the full prompt exactly as before — untouched
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender || 'not specified' }, question);
 
    const yr  = new Date().getFullYear();
    const p   = chart.planets;
    const d   = chart.dasha;
    const curM = d.current?.lord;
    const curA = d.currentAntar?.lord;
 
    // Split the prompt at the divider line — keep chart context, swap section instructions
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const chartContext = fullPrompt.split(divider)[0] + divider;
 
    const [r1, r2, r3, r4, r5] = await Promise.all([
 
      // CALL 1 — Character + Past + Current Period
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: chartContext + `
 
=== CHARACTER & PERSONALITY ===
(Based on Lagna lord position, Rasi, Nakshatra nature — describe their appearance, personality, strengths, weaknesses, thinking style, emotional nature. Be very specific.)
 
=== WHAT HAS HAPPENED IN LIFE (Past) ===
(Read each past Dasha period. What happened during each — childhood, education, family events, turning points. Connect planet significations to life events with years/ages.)
 
=== CURRENT PERIOD — ${curM} DASHA, ${curM}-${curA} BHUKTI ===
(What is happening RIGHT NOW in their life — career, relationships, health, mindset, challenges, opportunities. Very specific to current Dasha lord's house position and nature.)` }]
      }),
 
      // CALL 2 — Career + Wealth + Property + Siblings/Father
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: chartContext + `
 
=== CAREER & EDUCATION ===
(10th house, 10th lord, planets in 10th, Sun position, Mercury, Saturn — what career suits them? When does career peak? Key career years based on Dashas.)
 
=== WEALTH & FINANCES ===
(2nd house, 11th house, their lords, Jupiter's role — financial prospects, when wealth comes, any financial challenges.)
 
=== PROPERTY & VEHICLES ===
(4th house, 4th lord, Venus — land, home ownership, vehicles, material comforts. When property is likely from Dasha.)
 
=== SIBLINGS & FATHER ===
(3rd house for siblings, Mars — relationship with siblings, courage. 9th house for father, Jupiter, Sun — father's influence, luck, dharma, long travel.)` }]
      }),
 
      // CALL 3 — Marriage + Children + Health
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: chartContext + `
 
=== MARRIAGE & RELATIONSHIPS ===
(7th house: ${chart.houses[7]?.join(', ')||'Empty'}, 7th lord: ${p[chart.rasi.lord]?.house}, Venus position — when is marriage likely? What kind of partner? Love or arranged? Mangal Dosha present? Any delays?)
 
=== CHILDREN ===
(5th house: ${chart.houses[5]?.join(', ')||'Empty'}, Jupiter, 5th lord — prospects for children, timing, any concerns.)
 
=== HEALTH ===
(1st house, 6th house, 8th house, their lords — constitution, disease tendencies, which body parts to watch, which periods need health care. Mental health from Moon position.)` }]
      }),
 
      // CALL 4 — Next 5 Years + Foreign + Enemies + Spirituality
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: chartContext + `
 
=== NEXT 5 YEARS — YEAR BY YEAR (${yr} to ${yr+5}) ===
(Go year by year. For each year state: which Antardasha is running, what it means for career/money/relationships/health. Be specific and practical.)
 
=== FOREIGN TRAVEL & ABROAD ===
(12th house: ${chart.houses[12]?.join(', ')||'Empty'}, Rahu H${p.Rahu?.house}, 9th lord — foreign opportunities, overseas life, when foreign travel or settlement is likely based on Dasha.)
 
=== ENEMIES & OBSTACLES ===
(6th house: ${chart.houses[6]?.join(', ')||'Empty'}, 6th lord — enemies, court cases, competition, debts. How they overcome challenges and opposition.)
 
=== SPIRITUALITY & DHARMA ===
(9th house, 12th house, Ketu H${p.Ketu?.house}, Jupiter — spiritual inclinations, past life karma, dharmic path, moksha indicators.)` }]
      }),
 
      // CALL 5 — Special Strengths + Doshas & Remedies + Question
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: chartContext + `
 
=== SPECIAL STRENGTHS OF THIS CHART ===
(What makes this chart exceptional — which yogas, which placements give special gifts or protection.)
 
=== DOSHAS & PARIHARAMS (Remedies) ===
(Go through every Dosha listed in YOGAS & DOSHAS above. For EACH one state clearly: ACTIVE or NULLIFIED. If NULLIFIED — explain exactly which rule cancels it and what that means for this person. If ACTIVE — give the complete remedy: specific temple name in Tamil Nadu or Kerala, presiding deity, day of week, exact mantra with number of repetitions, gemstone with which finger and which metal, colour to wear, food to donate.)${question ? `
 
=== ANSWER TO YOUR QUESTION ===
(Address the specific question with full astrological reasoning.)` : ''}` }]
      }),
 
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
