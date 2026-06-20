
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = 'You are a master Tamil Jyotish astrologer with 40+ years of experience. Give precise, chart-specific readings. Every statement must cite exact planetary positions and house numbers. Use === SECTION === headers. Be specific with years and ages. Never be vague or generic. Write the complete section fully — do not stop until the section is finished.';
 
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
 
    const yr   = new Date().getFullYear();
    const p    = chart.planets;
    const d    = chart.dasha;
    const curM = d.current?.lord;
    const curA = d.currentAntar?.lord;
 
    // Full chart context from prompts.js — strip the section instructions, keep only data
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender || 'not specified' }, question);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const ctx = fullPrompt.split(divider)[0].trimEnd();
 
    // One section per call — all run in parallel simultaneously
    const sec = (header, instruction, tokens = 2000) => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: tokens,
      system: SYSTEM,
      messages: [{ role: 'user', content: `${ctx}\n\nWrite ONLY this one section completely. Do not add any intro, summary, or other sections.\n\n${header}\n${instruction}` }],
    });
 
    const [s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11] = await Promise.all([
 
      sec('=== CHARACTER & PERSONALITY ===',
        `(Lagna lord position, Rasi nature, Nakshatra — physical appearance, personality, strengths, weaknesses, thinking style, emotional nature, what drives them. Cover all aspects fully.)`, 1500),
 
      sec('=== WHAT HAS HAPPENED IN LIFE (Past) ===',
        `(Go through every past Dasha period one by one. For each period state the lord, house placement, dates, ages, and what events likely happened — childhood, education, family, relationships, turning points. Be thorough and specific.)`, 1500),
 
      sec(`=== CURRENT PERIOD — ${curM} DASHA, ${curM}-${curA} BHUKTI ===`,
        `(Analyse exactly what is happening RIGHT NOW in their life. Career situation, relationship status, health, finances, mindset, challenges, opportunities. Cite the Dasha lord's exact house placement and what it activates. Include the current Antardasha sub-periods and their effects.)`, 1500),
 
      sec('=== CAREER & EDUCATION ===',
        `(10th house: ${chart.houses[10]?.join(',')||'Empty'}, 10th lord, Sun H${p.Sun?.house} ${p.Sun?.status}, Mercury H${p.Mercury?.house} ${p.Mercury?.status}, Saturn H${p.Saturn?.house}. What profession suits them? Education timeline. Career peak years. Which Dasha periods bring advancement. Cover the full career picture completely.)`, 1500),
 
      sec('=== WEALTH & FINANCES ===',
        `(H2: ${chart.houses[2]?.join(',')||'Empty'}, H11: ${chart.houses[11]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}, 2nd and 11th lords. How does wealth come? Year-by-year financial timeline through Dashas. Best wealth periods, lean periods. Long-term financial picture. Complete fully.)`, 1500),
 
      sec('=== PROPERTY & VEHICLES ===',
        `(H4: ${chart.houses[4]?.join(',')||'Empty'}, 4th lord, Venus H${p.Venus?.house} ${p.Venus?.status}. Land, home ownership, vehicles, material comforts. When is property likely? Timing from Dasha. Nature of home. Complete fully.)`, 1000),
 
      sec('=== SIBLINGS & FATHER ===',
        `(H3: ${chart.houses[3]?.join(',')||'Empty'} for siblings, Mars H${p.Mars?.house} ${p.Mars?.status} — sibling relationships, courage. H9: ${chart.houses[9]?.join(',')||'Empty'} for father, Jupiter H${p.Jupiter?.house}, Sun H${p.Sun?.house} — father's nature, influence, luck, dharma, long travel. Complete fully.)`, 1000),
 
      sec('=== MARRIAGE & RELATIONSHIPS ===',
        `(H7: ${chart.houses[7]?.join(',')||'Empty'}, 7th lord, Venus H${p.Venus?.house} ${p.Venus?.status}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}. What kind of partner? Love or arranged? Marriage timing — which exact Dasha and year. What married life looks like. Delays if any. Complete fully.)`, 1500),
 
      sec('=== CHILDREN ===',
        `(H5: ${chart.houses[5]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}, 5th lord. Prospects for children, timing of first child, nature of children, any concerns with Rahu/Ketu involvement. Complete fully.)`, 1000),
 
      sec('=== HEALTH ===',
        `(H1, H6: ${chart.houses[6]?.join(',')||'Empty'}, H8: ${chart.houses[8]?.join(',')||'Empty'}, Lagna lord H${chart.lagna.lordHouse}. Physical constitution, every disease tendency, all body parts to watch. Mental health from Moon H${p.Moon?.house}. Which Dasha periods need health care. Preventive advice. Complete fully.)`, 1500),
 
      sec(`=== NEXT 5 YEARS — YEAR BY YEAR (${yr} to ${yr+5}) ===`,
        `(Write one full paragraph for EACH year from ${yr} to ${yr+5}. For each year state: exact Antardasha running with dates, what it activates in the chart, career outlook, financial picture, relationship events, health matters, what to do and what to avoid. Do not skip any year. Complete all ${yr+5} fully.)`, 2000),
 
    ]);
 
    // Second batch — also all parallel
    const sections12to16 = await Promise.all([
 
      sec('=== FOREIGN TRAVEL & ABROAD ===',
        `(H12: ${chart.houses[12]?.join(',')||'Empty'}, Rahu H${p.Rahu?.house} ${p.Rahu?.status}, 9th lord, 12th lord. Foreign opportunities, overseas life possibility, when foreign travel or settlement is likely from Dasha. What type of foreign experience. Complete fully.)`, 1000),
 
      sec('=== ENEMIES & OBSTACLES ===',
        `(H6: ${chart.houses[6]?.join(',')||'Empty'}, 6th lord H${p[chart.lagna.lord]?.house}. Nature of enemies, court cases, competition, debts. How they overcome obstacles. Saturn H${p.Saturn?.house} ${p.Saturn?.status} and Mars H${p.Mars?.house} role. Complete fully.)`, 1000),
 
      sec('=== SPIRITUALITY & DHARMA ===',
        `(H9: ${chart.houses[9]?.join(',')||'Empty'}, H12: ${chart.houses[12]?.join(',')||'Empty'}, Ketu H${p.Ketu?.house}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}. Spiritual inclinations, past life karma, dharmic path, moksha indicators. Religious practices suited to this chart. Complete fully.)`, 1000),
 
      sec('=== SPECIAL STRENGTHS OF THIS CHART ===',
        `(Every Yoga present and what gift it gives. Every strong planet and what it promises in life. What makes this chart exceptional. Specific life outcomes guaranteed by the chart. Complete fully.)`, 1000),
 
      sec('=== DOSHAS & PARIHARAMS (Remedies) ===',
        `(Go through EVERY Dosha listed in YOGAS & DOSHAS above. For EACH one: state clearly ACTIVE or NULLIFIED. If NULLIFIED — explain exactly which classical rule cancels it and what that means positively for this person. If ACTIVE — give: specific temple name in Tamil Nadu or Kerala, presiding deity, day of week, exact mantra with number of repetitions, gemstone with which finger and which metal, colour to wear, food to donate. Do not stop until every Dosha is addressed.)${question ? `\n\n=== ANSWER TO YOUR QUESTION ===\n(${question} — full astrological reasoning with specific timing and clear answer.)` : ''}`, 2000),
 
    ]);
 
    const reading = [...[s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,s11], ...sections12to16]
      .map(r => r.content.map(c => c.text || '').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
