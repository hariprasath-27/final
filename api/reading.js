
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
 
    // Build the full prompt from prompts.js — same as before
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender || 'not specified' }, question);
 
    const yr = new Date().getFullYear();
    const p  = chart.planets;
    const d  = chart.dasha;
    const curM = d.current?.lord;
    const curA = d.currentAntar?.lord;
 
    // Split into 5 focused prompts — each uses the full chart context from buildReadingPrompt
    // but asks only for specific sections so nothing is cut off
    const makePrompt = (sections) =>
      fullPrompt.replace(
        /━+[\s\S]*$/,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nWrite ONLY these sections now with full detail. Two paragraphs minimum per section. No bullet points.\n\n${sections}`
      );
 
    const [r1, r2, r3, r4, r5] = await Promise.all([
 
      // CALL 1 — Character + Past + Current Period
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: makePrompt(
          `=== CHARACTER & PERSONALITY ===\n(Lagna, Rasi, Nakshatra — appearance, personality, strengths, weaknesses, emotional nature. Very specific.)\n\n=== WHAT HAS HAPPENED IN LIFE (Past) ===\n(Each past Dasha period — childhood, education, family events, turning points with years/ages.)\n\n=== CURRENT PERIOD — ${curM} DASHA, ${curM}-${curA} BHUKTI ===\n(RIGHT NOW — career, relationships, health, mindset, challenges, opportunities. Specific to current Dasha lord house position.)`
        )}]
      }),
 
      // CALL 2 — Career + Wealth + Property + Siblings/Father
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: makePrompt(
          `=== CAREER & EDUCATION ===\n(H10, 10th lord, Sun, Mercury, Saturn — what career suits them? When does career peak? Key years from Dashas.)\n\n=== WEALTH & FINANCES ===\n(H2, H11, their lords, Jupiter — when does money come? Lean periods? Long-term financial picture.)\n\n=== PROPERTY & VEHICLES ===\n(H4, 4th lord, Venus — land, home, vehicles, comforts. Timing from Dasha.)\n\n=== SIBLINGS & FATHER ===\n(H3 for siblings, Mars — relationship with siblings. H9 for father, Jupiter, Sun — father's influence, luck, dharma.)`
        )}]
      }),
 
      // CALL 3 — Marriage + Children + Health
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: makePrompt(
          `=== MARRIAGE & RELATIONSHIPS ===\n(H7: ${chart.houses[7]?.join(', ')||'Empty'}, 7th lord, Venus H${p.Venus?.house} — when is marriage likely? What kind of partner? Love or arranged? Mangal Dosha? Any delays?)\n\n=== CHILDREN ===\n(H5: ${chart.houses[5]?.join(', ')||'Empty'}, Jupiter H${p.Jupiter?.house} — prospects, timing, any concerns.)\n\n=== HEALTH ===\n(H1, H6, H8 — constitution, disease tendencies, body parts to watch, which Dasha periods need health care. Mental health from Moon.)`
        )}]
      }),
 
      // CALL 4 — Next 5 Years + Foreign + Enemies + Spirituality
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: makePrompt(
          `=== NEXT 5 YEARS — YEAR BY YEAR (${yr} to ${yr+5}) ===\n(Each year: which Antardasha is running, what it means for career/money/relationships/health. Specific and practical.)\n\n=== FOREIGN TRAVEL & ABROAD ===\n(H12: ${chart.houses[12]?.join(', ')||'Empty'}, Rahu H${p.Rahu?.house} — foreign opportunities, overseas life, when travel likely.)\n\n=== ENEMIES & OBSTACLES ===\n(H6: ${chart.houses[6]?.join(', ')||'Empty'} — enemies, court cases, competition, debts. How they overcome challenges.)\n\n=== SPIRITUALITY & DHARMA ===\n(H9, H12, Ketu H${p.Ketu?.house}, Jupiter — spiritual inclinations, past life karma, dharmic path, moksha.)`
        )}]
      }),
 
      // CALL 5 — Special Strengths + Doshas & Remedies + Question
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: makePrompt(
          `=== SPECIAL STRENGTHS OF THIS CHART ===\n(Which yogas give special gifts? The strongest planet and what it promises. What makes this chart exceptional.)\n\n=== DOSHAS & PARIHARAMS (Remedies) ===\n(Every Dosha — ACTIVE or NULLIFIED, exact reason. For every ACTIVE Dosha: specific temple name, deity, day, mantra with count, gemstone with finger and metal, colour to wear, food to donate.)${question ? `\n\n=== ANSWER TO YOUR QUESTION ===\n(${question} — address with full astrological reasoning and specific timing.)` : ''}`
        )}]
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
