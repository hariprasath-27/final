
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = `You are Jothida Pandithar — a master Tamil Jyotish astrologer with 40+ years of practice. You give precise, deeply personal readings. Every single statement MUST cite the exact planet, house number, and astrological reason. Be specific with years and ages. Never give generic statements. Use === SECTION === for main headers and --- Sub Heading --- for sub-topics. Write flowing paragraphs — never bullet points. Speak directly to the person as "you".`;
 
function buildBase(chart, person, age, today) {
  const p = chart.planets;
  const d = chart.dasha;
 
  const planetLines = Object.entries(p).map(([n, x]) =>
    `${n}: ${x.rasi} H${x.house} ${x.degInRasi.toFixed(2)}° | ${x.status} | Nak: ${x.nakshatra} P${x.pada}`
  ).join('\n');
 
  const houseLines = Object.entries(chart.houses).map(([h, pl]) => {
    const names = {1:'Self',2:'Wealth',3:'Siblings',4:'Home/Mother',5:'Children',6:'Enemies',7:'Marriage',8:'Longevity',9:'Luck/Father',10:'Career',11:'Gains',12:'Loss/Foreign'};
    return `H${h}(${names[h]||''}): ${pl.length ? pl.join(',') : 'Empty'}`;
  }).join(' | ');
 
  const yogaLines = chart.yogas.map(y =>
    `[${y.type.toUpperCase()}${y.nullified?' NULLIFIED':''}] ${y.name}: ${y.desc}`
  ).join('\n');
 
  const pastDashas = d.dashaSequence
    .filter(ds => new Date(ds.endDate) < new Date()).slice(-5)
    .map(ds => `${ds.lord}: ${ds.startDate.slice(0,7)} to ${ds.endDate.slice(0,7)}`).join(' | ');
 
  const antarLines = d.antardashas.map(a =>
    `${d.current?.lord}-${a.lord}: ${a.startDate.slice(0,7)} to ${a.endDate.slice(0,7)}${a === d.currentAntar ? ' ← NOW' : ''}`
  ).join('\n');
 
  const futureDashas = d.dashaSequence
    .filter(ds => new Date(ds.startDate) > new Date()).slice(0, 4)
    .map(ds => `${ds.lord}: ${ds.startDate.slice(0,7)} to ${ds.endDate.slice(0,7)}`).join(' | ');
 
  return `TODAY: ${today} | Name: ${person.name} | Age: ${age} | Gender: ${person.gender||''} | DOB: ${chart.input.dob} | Time: ${chart.input.tob} | Place: ${chart.input.place}
 
LAGNA: ${chart.lagna.rasi} (${chart.lagna.rasiEn}) ${chart.lagna.degInRasi.toFixed(2)}° | Lord: ${chart.lagna.lord} H${chart.lagna.lordHouse}
RASI: ${chart.rasi.name} (${chart.rasi.en}) | Lord: ${chart.rasi.lord} H${p[chart.rasi.lord]?.house}
NAKSHATRA: ${chart.nakshatra.name} Pada ${chart.nakshatra.pada} | Lord: ${chart.nakshatra.lord} | Gana: ${chart.nakshatra.gana} | Nadi: ${chart.nakshatra.nadi} | Yoni: ${chart.nakshatra.yoni} | Deity: ${chart.nakshatra.deity||''}
 
PLANETS:
${planetLines}
 
HOUSES: ${houseLines}
 
YOGAS & DOSHAS:
${yogaLines}
 
PAST DASHAS: ${pastDashas}
CURRENT: ${d.current?.lord} Mahadasha H${p[d.current?.lord]?.house} (${d.current?.startDate?.slice(0,7)} to ${d.current?.endDate?.slice(0,7)})
ANTARDASHA: ${d.currentAntar?.lord} H${p[d.currentAntar?.lord]?.house} (ends ${d.currentAntar?.endDate?.slice(0,7)})
ALL ANTARDASHAS:
${antarLines}
UPCOMING: ${futureDashas}`;
}
 
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
 
  try {
    const { dob, tob, place, name, gender, question, lagna, rasi, nakshatra } = req.body;
    if (!dob || !tob || !place || !name)
      return res.status(400).json({ error: 'dob, tob, place, name required' });
 
    const chart = buildFullChart(dob, tob, place, {
      lagna: lagna || undefined,
      rasi:  rasi  || undefined,
      nakshatra: nakshatra || undefined,
    });
 
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const age   = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
    const yr    = new Date().getFullYear();
    const p     = chart.planets;
    const d     = chart.dasha;
    const curM  = d.current?.lord;
    const curA  = d.currentAntar?.lord;
    const base  = buildBase(chart, { name, gender }, age, today);
 
    // ── 5 parallel Haiku calls ──
    const [r1, r2, r3, r4, r5] = await Promise.all([
 
      // CALL 1 — Character + Life History + Current Period
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: `${base}
 
Write these sections for ${name}. Two paragraphs per sub-heading. No bullet points.
 
=== CHARACTER & PERSONALITY ===
--- Physical Appearance & First Impression (from ${chart.lagna.rasi} Lagna, lord ${chart.lagna.lord} H${chart.lagna.lordHouse}) ---
--- Emotional Nature & Inner World (Moon H${p.Moon?.house}, ${chart.nakshatra.name} Nakshatra, ${chart.nakshatra.gana} Gana) ---
--- Core Strengths, Weaknesses & What Truly Drives ${name} ---
 
=== WHAT HAS HAPPENED IN LIFE ===
--- Childhood & Early Years (first Dashas, birth to age 12) ---
--- Teenage & Education Years (age 12 to 20, which Dasha, what events) ---
--- Recent Past (last Dasha before current — what changed, what was gained or lost) ---
 
=== CURRENT PERIOD — ${curM} DASHA ${curA} BHUKTI ===
--- What ${curM} in H${p[curM]?.house} Is Activating For ${name} Right Now ---
--- What ${curA} in H${p[curA]?.house} Bhukti Is Adding — Opportunities & Warnings ---` }]
      }),
 
      // CALL 2 — Career + Wealth + Property + Siblings
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: `${base}
 
Write these sections for ${name}. Two paragraphs per sub-heading. No bullet points.
 
=== CAREER & EDUCATION ===
--- Natural Talents & Right Profession (H10: ${chart.houses[10]?.join(',')||'Empty'}, Sun H${p.Sun?.house}, Mercury H${p.Mercury?.house}) ---
--- Career Timeline — When It Peaks & Key Dasha Years ---
 
=== WEALTH & FINANCES ===
--- How Wealth Comes & Financial Personality (H2: ${chart.houses[2]?.join(',')||'Empty'}, H11: ${chart.houses[11]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}) ---
--- Best Financial Years & Lean Periods Based on Dasha ---
 
=== PROPERTY & VEHICLES ===
--- Property, Land & Home (H4: ${chart.houses[4]?.join(',')||'Empty'}, 4th lord H${p[chart.lagna.lord]?.house}) ---
--- Vehicles & Material Comforts (Venus H${p.Venus?.house} ${p.Venus?.status}) ---
 
=== SIBLINGS & FAMILY BONDS ===
--- Siblings & Relationship With Them (H3: ${chart.houses[3]?.join(',')||'Empty'}, Mars H${p.Mars?.house}) ---
--- Father & Luck (H9: ${chart.houses[9]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house}, Sun H${p.Sun?.house}) ---` }]
      }),
 
      // CALL 3 — Marriage + Children + Health
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: `${base}
 
Write these sections for ${name}. Two paragraphs per sub-heading. No bullet points.
 
=== MARRIAGE & RELATIONSHIPS ===
--- Life Partner — Nature, Qualities, Love or Arranged (H7: ${chart.houses[7]?.join(',')||'Empty'}, Venus H${p.Venus?.house} ${p.Venus?.status}, Jupiter H${p.Jupiter?.house}) ---
--- Marriage Timing — Which Exact Dasha Period & Approximate Year ---
--- Married Life — Harmony, Challenges & What ${name} Needs in a Partner ---
 
=== CHILDREN ===
--- Children Prospects & Timing (H5: ${chart.houses[5]?.join(',')||'Empty'}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}) ---
--- Relationship With Children & Their Nature ---
 
=== HEALTH ===
--- Physical Constitution & Vulnerable Body Parts (${chart.nakshatra.nadi} Nadi, Lagna H${chart.lagna.lordHouse}) ---
--- Disease Tendencies & Which Dasha Periods Need Care (H6: ${chart.houses[6]?.join(',')||'Empty'}, H8: ${chart.houses[8]?.join(',')||'Empty'}) ---
--- Mental Health & Emotional Wellbeing (Moon H${p.Moon?.house}) ---` }]
      }),
 
      // CALL 4 — Next 5 Years + Foreign/Spiritual + Enemies
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: 'user', content: `${base}
 
Write these sections for ${name}. Two paragraphs per sub-heading. No bullet points.
 
=== NEXT 5 YEARS — YEAR BY YEAR ===
--- ${yr} — Antardasha running, career/money/relationships/health outlook ---
--- ${yr+1} — What opens, what to avoid ---
--- ${yr+2} — Major turning points ---
--- ${yr+3} — Themes and key events ---
--- ${yr+4} — What this year holds ---
 
=== FOREIGN TRAVEL & ABROAD ===
--- Foreign Opportunities & Overseas Life (H12: ${chart.houses[12]?.join(',')||'Empty'}, Rahu H${p.Rahu?.house}, 9th lord) ---
--- When Foreign Travel or Settlement Is Likely (which Dasha periods) ---
 
=== ENEMIES, OBSTACLES & COMPETITION ===
--- Enemies, Court Cases & Competition (H6: ${chart.houses[6]?.join(',')||'Empty'}, 6th lord, Saturn H${p.Saturn?.house}) ---
--- How ${name} Overcomes Obstacles — Their Inner Strength ---` }]
      }),
 
      // CALL 5 — Special Strengths + Doshas & Remedies + Question
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: `${base}
 
Write these sections for ${name}. Two paragraphs per sub-heading. No bullet points.
 
=== SPIRITUALITY & DHARMA ===
--- Spiritual Nature & Past Life Karma (H9: ${chart.houses[9]?.join(',')||'Empty'}, Ketu H${p.Ketu?.house}, Jupiter H${p.Jupiter?.house}) ---
--- Moksha & Liberation Path (H12: ${chart.houses[12]?.join(',')||'Empty'}, spiritual inclinations) ---
 
=== SPECIAL STRENGTHS OF THIS CHART ===
--- Exceptional Yogas & What They Give ${name} in Life ---
--- The Most Powerful Planet in This Chart & Its Specific Promise ---
 
=== DOSHAS & PARIHARAMS ===
--- Every Dosha Present: ACTIVE or NULLIFIED — Exact Reason for Each ---
--- Complete Remedies: Specific temple name in Tamil Nadu or Kerala, deity, day of week, exact mantra with count, gemstone with finger and metal, colour, food to donate ---
${question ? `\n=== ANSWER TO YOUR QUESTION ===\n--- ${question} — Specific Astrological Answer with Timing ---` : ''}` }]
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
