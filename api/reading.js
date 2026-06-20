'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = 'You are a master Tamil Jyotish astrologer with 40+ years of experience. Give precise, chart-specific readings. Every statement must cite exact planetary positions and house numbers. Use === SECTION === headers and --- Sub Heading --- for sub-topics. Be specific with years and ages. Never be vague or generic. Complete every section fully without stopping.';
 
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
 
    const fullPrompt = buildReadingPrompt(chart, { name, gender: gender || 'not specified' }, question);
    const divider = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    const ctx = fullPrompt.split(divider)[0].trimEnd();
 
    const sec = (instruction, tokens = 8000) => anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: tokens,
      system: SYSTEM,
      messages: [{ role: 'user', content: `${ctx}\n\n${instruction}` }],
    });
 
    // Batch 1 — all run simultaneously
    const batch1 = await Promise.all([
 
      // S1 — Character (focused, not too long)
      sec(`Write ONLY this section. Start directly with the header. No intro.
 
=== CHARACTER & PERSONALITY ===
--- Physical Appearance & Presence ---
(1 paragraphs: Lagna sign, Lagna lord H${chart.lagna.lordHouse} ${chart.lagna.lordStatus} — what they look like, how they carry themselves)
--- Core Nature & Emotional World ---
(1 paragraphs: Rasi ${chart.rasi.name}, Moon H${p.Moon?.house} ${p.Moon?.status}, ${chart.nakshatra.name} Nakshatra — inner personality, emotional nature)
--- Strengths & Blind Spots ---
(2 paragraphs: key strengths from strong planets, key weaknesses and challenges to overcome)`),
 
      // S2 — Brief past, detailed current
      sec(`Write ONLY this section. Start directly with the header. No intro.
 
=== LIFE SO FAR & RIGHT NOW ===
--- Brief Past (keep this short — 2 paragraphs only) ---
(Summarise the past Dasha periods quickly: what kind of childhood, education, early adult years. Key turning points only. Do NOT go into detail for each sub-period.)
--- Current Period: ${curM} Mahadasha, ${curA} Bhukti (THIS IS THE MAIN FOCUS) ---
(4 paragraphs: What ${curM} in H${p[curM]?.house} ${p[curM]?.status} activates. What ${curA} in H${p[curA]?.house} ${p[curA]?.status} adds right now. What is happening TODAY in career, relationships, finances, mental state. What opportunities are open right now and what dangers to avoid.)`),
 
      // S3 — Career (present and future focused)
      sec(`Write ONLY this section. Start directly with the header. No intro.
 
=== CAREER & EDUCATION ===
--- Natural Talents & Right Profession ---
(2 paragraphs: H10 ${chart.houses[10]?.join(',')||'Empty'}, Sun H${p.Sun?.house}, Mercury H${p.Mercury?.house} ${p.Mercury?.status} — what profession suits them and why astrologically)
--- Career Right Now (Age ${Math.floor((Date.now()-new Date(chart.input.dob))/(365.25*24*3600*1000))}) ---
(2 paragraphs: current Dasha impact on career, what is happening in career right now, immediate next steps)
--- Career Timeline: Next 10 Years ---
(3 paragraphs: year by year which Dasha brings what career milestone, when is the peak, what to work toward)`),
 
      // S4 — Wealth
      sec(`Write ONLY this section. Start directly with the header. No intro.
 
=== WEALTH & FINANCES ===
--- How Wealth Comes ---
(2 paragraphs: H2 ${chart.houses[2]?.join(',')||'Empty'}, H11 ${chart.houses[11]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status} — the fundamental source of wealth in this chart)
--- Financial Picture Right Now ---
(2 paragraphs: current Dasha impact on finances, is this a lean or strong period, what to do now)
--- Wealth Timeline: Next 10 Years ---
(2 paragraphs: which years bring money, which are lean, when does real wealth accumulate)`),
 
      // S5 — Marriage (present and future focused)
      sec(`Write ONLY this section. Start directly with the header. No intro.
 
=== MARRIAGE & RELATIONSHIPS ===
--- Life Partner: Who They Will Be ---
(2 paragraphs: H7 ${chart.houses[7]?.join(',')||'Empty'}, Venus H${p.Venus?.house} ${p.Venus?.status}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status} — nature, qualities, background of the destined partner)
--- Marriage Timing: When & How ---
(2 paragraphs: which exact Dasha period, approximate year, love or arranged, how they will meet)
--- Married Life ---
(2 paragraphs: what married life looks like, areas of harmony, areas of challenge, long-term partnership quality)`),
 
    ]);
 
    // Batch 2 — all run simultaneously
    const batch2 = await Promise.all([
 
      // S6 — Children + Property + Siblings/Father (shorter sections)
      sec(`Write ONLY these 3 sections. Start each directly with its header. No intro.
 
=== CHILDREN ===
(3 paragraphs total: H5 ${chart.houses[5]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house}, timing of children, nature of children, concerns if any)
 
=== PROPERTY & VEHICLES ===
(2 paragraphs total: H4 ${chart.houses[4]?.join(',')||'Empty'}, Venus H${p.Venus?.house} ${p.Venus?.status}, when property comes, what kind of home)
 
=== SIBLINGS & FATHER ===
(2 paragraphs total: H3 ${chart.houses[3]?.join(',')||'Empty'} siblings, H9 ${chart.houses[9]?.join(',')||'Empty'} father — relationships, influence, key events)`),
 
      // S7 — Health
      sec(`Write ONLY this section. Start directly with the header. No intro.
 
=== HEALTH ===
--- Physical Constitution ---
(2 paragraphs: Lagna, Lagna lord H${chart.lagna.lordHouse}, ${chart.nakshatra.nadi} Nadi body type, natural strengths, vulnerable body parts)
--- Disease Tendencies & Warnings ---
(2 paragraphs: H6 ${chart.houses[6]?.join(',')||'Empty'}, H8 ${chart.houses[8]?.join(',')||'Empty'}, specific ailments to watch, which Dasha periods need health care)
--- Mental Health ---
(2 paragraphs: Moon H${p.Moon?.house} ${p.Moon?.status}, mental and emotional wellbeing, how to maintain balance)`),
 
      // S8 — Next 5 years (the most important section — biggest token budget)
      sec(`Write ONLY this section. Start directly with the header. No intro. This is the most important section. Be very specific. Do NOT stop before completing ALL years through ${yr+5}.
 
=== NEXT 5 YEARS — YEAR BY YEAR ===
--- ${yr} ---
(Which Antardasha is running with exact dates. Career, money, relationships, health this year. Key advice.)
--- ${yr+1} ---
(Which Antardasha. What changes. Key opportunities and warnings.)
--- ${yr+2} ---
(Which Antardasha. Major events. What to focus on.)
--- ${yr+3} ---
(Which Antardasha. Themes and predictions. Best actions.)
--- ${yr+4} ---
(Which Antardasha. What this year holds. How to prepare.)
--- ${yr+5} ---
(Which Antardasha. What opens up. Long-term outlook.)`, 6000),
 
      // S9 — Foreign + Enemies + Spirituality
      sec(`Write ONLY these 3 sections. Start each directly with its header. No intro.
 
=== FOREIGN TRAVEL & ABROAD ===
(3 paragraphs: H12 ${chart.houses[12]?.join(',')||'Empty'}, Rahu H${p.Rahu?.house} — foreign potential, when it comes, what type of overseas opportunity)
 
=== ENEMIES & OBSTACLES ===
(2 paragraphs: H6 ${chart.houses[6]?.join(',')||'Empty'}, 6th lord — nature of obstacles, how they overcome them, current challenges)
 
=== SPIRITUALITY & DHARMA ===
(2 paragraphs: H9 ${chart.houses[9]?.join(',')||'Empty'}, Ketu H${p.Ketu?.house}, Jupiter — spiritual path, karmic purpose, what dharma means for this person)`),
 
      // S10 — Special Strengths + Doshas (biggest token budget — never cuts off)
      sec(`Write ONLY these 2 sections. Start each directly with its header. No intro. Complete EVERY dosha fully before stopping.
 
=== SPECIAL STRENGTHS OF THIS CHART ===
(3 paragraphs: every yoga present and its specific life gift, the single strongest planet and what it promises, what makes this chart exceptional)
 
=== DOSHAS & PARIHARAMS ===
(For EVERY Dosha in the YOGAS & DOSHAS list above: state ACTIVE or NULLIFIED. If NULLIFIED — explain exactly which rule cancels it and what it means positively. If ACTIVE — give: specific temple name in Tamil Nadu or Kerala, deity, day, exact mantra with count, gemstone with finger and metal, colour to wear, food to donate. Work through every single Dosha completely.)${question ? `
 
=== ANSWER TO YOUR QUESTION ===
(${question} — specific astrological answer with exact timing.)` : ''}`, 3000),
 
    ]);
 
    const reading = [...batch1, ...batch2]
      .map(r => r.content.map(c => c.text || '').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
