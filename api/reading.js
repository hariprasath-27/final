
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = `You are Jothida Pandithar — the most respected Tamil Jyotish astrologer alive, with 40 years of practice. Families travel from distant villages to sit before you. Your reputation rests on one thing: accuracy. Every single sentence you write must name the exact planet, exact house number, and exact astrological reason. You speak directly to the person as "you". You never write vague statements. You never leave a section incomplete. You write in flowing paragraphs — no bullet points anywhere. Use === SECTION === for main headings and --- Sub Heading --- for sub-topics inside sections. CRITICAL: Always complete every sentence fully. If you are approaching the token limit, finish the current sentence and wrap up the current paragraph cleanly. Never stop mid-sentence, mid-word, or mid-thought. End at a natural paragraph boundary.`;
 
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
 
    // All 8 calls run in parallel simultaneously
    const [r1,r2,r3,r4,r5,r6,r7,r8] = await Promise.all([
 
      // CALL 1 — Appearance + Character + Emotional Nature
      call(`Write ONLY this section. Start directly with === header. No intro.
 
=== WHO YOU ARE ===
 
--- Physical Appearance ---
Write 2 paragraphs. State exact height tendency, body build, skin tone, facial features, hair, eyes, and physical bearing — all derived from ${chart.lagna.rasi} Lagna at ${chart.lagna.degInRasi.toFixed(1)}° with lord ${chart.lagna.lord} in H${chart.lagna.lordHouse} (${chart.lagna.lordStatus}). Also state the family background and social environment you were born into based on the 4th house (${chart.houses[4]?.join(',')||'Empty'}) and 9th house (${chart.houses[9]?.join(',')||'Empty'}).
 
--- Emotional Nature & Personality Traits ---
Write 3 paragraphs. Cover Moon in H${p.Moon?.house} ${p.Moon?.rasi} (${p.Moon?.status}) and ${chart.nakshatra.name} Nakshatra ruled by ${chart.nakshatra.lord} — what kind of person you are emotionally, how you respond to love, conflict, stress, loneliness. Cover the spiritual side — are you naturally drawn to God, temples, service? Cover the characteristic mistakes this person tends to make in life repeatedly due to their planetary nature.
 
--- Strengths & Weaknesses ---
Write 2 paragraphs. First paragraph: every real strength in this chart — which planet in which house gives what strength, and what this allows you to achieve in life. Second paragraph: every genuine weakness — which planet in which house creates what blind spot, weakness, or recurring failure pattern. Be honest and specific.`, 3000),
 
      // CALL 2 — Past life summary + Present life in detail
      call(`Write ONLY this section. Start directly with === header. No intro.
 
=== PAST LIFE & WHAT HAS HAPPENED ===
 
--- Past Dasha Periods (brief summary) ---
Write 2 paragraphs covering all past Dasha periods as a quick summary. What kind of childhood, what education years were like, what early adult years brought. Key turning points only — do not go into every sub-period. State the years and ages clearly.
 
--- Karma & Past Life Indicators ---
Write 1 paragraph on what Ketu in H${p.Ketu?.house} ${p.Ketu?.rasi} and Rahu in H${p.Rahu?.house} ${p.Rahu?.rasi} reveal about past life karma and what this life is meant to resolve or achieve.
 
=== PRESENT LIFE — WHAT IS HAPPENING RIGHT NOW ===
 
--- The Current Dasha Period: ${curM} Mahadasha, ${curA} Bhukti ---
Write 3 paragraphs. Explain ${curM} in H${p[curM]?.house} ${p[curM]?.rasi} (${p[curM]?.status}) and what it activates as Mahadasha lord. Then explain ${curA} in H${p[curA]?.house} ${p[curA]?.rasi} (${p[curA]?.status}) and what the Bhukti is specifically adding right now. Be very precise about what is happening in this person's life at this exact moment.
 
--- What To Expect Right Now: Changes, Good & Bad ---
Write 3 paragraphs. What changes are happening or about to happen in the next 12 months. What good things are opening up right now and what bad things need to be navigated carefully. Cover career changes, relationship shifts, financial movements, health signals — all based on the current Dasha combination and transits.`, 3500),
 
      // CALL 3 — Career + Wealth
      call(`Write ONLY this section. Start directly with === header. No intro.
 
=== CAREER & MONEY ===
 
--- Natural Profession & Talents ---
Write 2 paragraphs. Based on H10 (${chart.houses[10]?.join(',')||'Empty'}), 10th lord in H${p[chart.rasi.lord]?.house}, Sun H${p.Sun?.house} ${p.Sun?.status}, Mercury H${p.Mercury?.house} ${p.Mercury?.status}, and Saturn H${p.Saturn?.house} ${p.Saturn?.status} — what exact profession is written in this chart, what talents come naturally, what fields will always suit this person.
 
--- Career Right Now (Age ${age}) ---
Write 2 paragraphs on what is happening in career at this exact age, what the current Dasha (${curM}-${curA}) is doing to career, whether this is a growth period or a slow period, and what immediate actions will yield results.
 
--- Career Timeline ---
Write 3 paragraphs covering career decade by decade — when career starts moving, when the big breakthrough comes (which Dasha, which year, approximate age), what the peak career years look like, and what career looks like after age 50.
 
--- Wealth & Finances ---
Write 3 paragraphs. How wealth comes to this person based on H2 (${chart.houses[2]?.join(',')||'Empty'}), H11 (${chart.houses[11]?.join(',')||'Empty'}), Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}. When the best financial years come. When lean periods hit. Whether this person accumulates wealth steadily or in sudden bursts. Property, savings, and investment picture.`, 3500),
 
      // CALL 4 — Marriage & Children (detailed)
      call(`Write ONLY this section. Start directly with === header. No intro.
 
=== MARRIAGE & CHILDREN ===
 
--- Your Life Partner: Who They Will Be ---
Write 3 paragraphs. Based on H7 (${chart.houses[7]?.join(',')||'Empty'}), 7th lord position, Venus H${p.Venus?.house} ${p.Venus?.status}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status} — describe the nature, character, profession, physical appearance, and family background of the destined life partner. What qualities they will have. How they will complement or challenge this person.
 
--- Love or Arranged? What Parents Will Say ---
Write 2 paragraphs. Will this be a love marriage or arranged? What does the chart show about how the meeting will happen? What will parents' attitude be — will they support it or oppose it? If there is opposition, from which side and why? Will the marriage eventually get family blessing?
 
--- Marriage Timing ---
Write 2 paragraphs. Exactly which Dasha period and approximate year marriage will happen. What the best window is. If there are delays, explain why and until when. Any specific age range that is most auspicious.
 
--- Will It Last? Compatibility & Issues ---
Write 2 paragraphs. What the married life will actually be like — the harmony, the friction points, the recurring disagreements. Will this marriage be long and stable or will there be serious issues? What periods within the marriage will be most challenging and why.
 
--- Children: When, How Many, What Kind ---
Write 2 paragraphs. Based on H5 (${chart.houses[5]?.join(',')||'Empty'}), Jupiter H${p.Jupiter?.house}, Mars H${p.Mars?.house} — when children will come, how many, timing of first child, nature of children (their personality, their success in life). Any concerns about conception or pregnancy.`, 4000),
 
      // CALL 5 — Health
      call(`Write ONLY this section. Start directly with === header. No intro.
 
=== HEALTH ===
 
--- Physical Constitution ---
Write 2 paragraphs. Body type and fundamental constitution from ${chart.lagna.rasi} Lagna and ${chart.nakshatra.nadi} Nadi. Natural immunity level. What this person's energy is like — high, medium, or fragile. How they recover from illness.
 
--- Disease Tendencies & Body Parts to Watch ---
Write 3 paragraphs. Based on H6 (${chart.houses[6]?.join(',')||'Empty'}), H8 (${chart.houses[8]?.join(',')||'Empty'}), and the positions of Sun H${p.Sun?.house}, Mars H${p.Mars?.house}, Saturn H${p.Saturn?.house} — name every specific disease tendency, every body part that is vulnerable, every organ system that needs monitoring. Be medically specific — name actual diseases, not vague categories.
 
--- Mental & Emotional Health ---
Write 2 paragraphs. Moon in H${p.Moon?.house} ${p.Moon?.status} — what the mind is like under stress, whether anxiety or depression is a risk, how this person's emotional state affects physical health, and what they need to do to maintain mental balance.
 
--- Health Timeline: Danger Periods ---
Write 2 paragraphs. Which Dasha periods historically and coming up need health care. What ages are most vulnerable. What preventive actions to take now.`, 3000),
 
      // CALL 6 — Future 10-20 years by groups of 3 years
      call(`Write ONLY this section. Start directly with === header. No intro. This is the most important section. Complete every period fully without stopping.
 
=== FUTURE: NEXT 20 YEARS — GROUPED BY MAJOR LIFE PHASES ===
 
--- ${yr} to ${yr+3}: What These Years Mean ---
Write 3 paragraphs. Which Dashas run during this period, what major life events are indicated, what changes in career, money, relationships, and health. What decisions made in this window will shape the next decade. Good things coming and things to be careful about.
 
--- ${yr+3} to ${yr+6}: What These Years Mean ---
Write 3 paragraphs. Which Dashas, what major shifts, what opens up, what gets tested. Key events — promotion, marriage, children, property, travel — that belong in this window. What to build toward.
 
--- ${yr+6} to ${yr+10}: The Mid-Phase ---
Write 3 paragraphs. How life looks by this point — career position, family situation, financial stability. What challenges come in this phase. What rewards from earlier hard work arrive. Which area of life dominates this period.
 
--- ${yr+10} to ${yr+15}: Maturity Phase ---
Write 2 paragraphs. What life looks like at age ${age+10} to ${age+15}. Career peak or transition. Children growing. Relationship depth or strain. Health beginning to need attention. Financial position by this point.
 
--- ${yr+15} to ${yr+20}: Later Stages ---
Write 2 paragraphs. What the later years look like — retirement picture, grandchildren, spiritual turning, health concerns. Whether this person ages with peace and stability or with struggle. What legacy they leave.`, 4000),
 
      // CALL 7 — Doshas & Remedies
      call(`Write ONLY this section. Start directly with === header. No intro. Go through EVERY single Dosha in the YOGAS & DOSHAS list. Do not stop until every one is addressed completely.
 
=== DOSHAS & PARIHARAMS ===
 
--- Each Dosha: ACTIVE or NULLIFIED ---
For every Dosha listed above: state clearly whether it is ACTIVE or NULLIFIED. If NULLIFIED — explain in 2 sentences exactly which classical rule cancels it and what that means positively for this person's life. If ACTIVE — write a full paragraph explaining what problem it creates in real life terms.
 
--- Complete Remedies for Every Active Dosha ---
For every ACTIVE Dosha give the complete remedy in full detail: the specific temple name and location in Tamil Nadu or Kerala, the presiding deity, the exact day of the week, the exact mantra in Sanskrit with the number of times to chant it, the gemstone to wear with exact finger and metal, the colour to wear on that day, and the food or item to donate. Make each remedy so specific and complete that the person can do it this week without asking any further questions.`, 3500),
 
      // CALL 8 — Special strengths + Later ages + Death possibility + Question
      call(`Write ONLY these sections. Start each directly with its === header. No intro.
 
=== SPECIAL STRENGTHS OF THIS CHART ===
Write 3 paragraphs. What extraordinary yogas are present and what specific gifts they give in real life. Which is the single most powerful planet in this chart and what promise it makes. What makes this chart exceptional — what level of success, recognition, or spiritual attainment is possible for this person.
 
=== LATER YEARS & LONGEVITY ===
Write 3 paragraphs. Based on the 8th house (${chart.houses[8]?.join(',')||'Empty'}), 8th lord position, Saturn H${p.Saturn?.house} ${p.Saturn?.status}, and the overall chart strength — what does life look like after age 60? What is the health picture in old age? What does this chart indicate about longevity — is this a long life, average, or are there risk periods? Which ages or Dasha periods need the most care for health preservation? What kind of death is indicated — peaceful, sudden, after illness — and in what approximate age range does the chart suggest the life force weakens? Speak honestly but with sensitivity.${question ? `
 
=== ANSWER TO YOUR QUESTION ===
Write 3 paragraphs answering "${question}" with specific astrological reasoning, exact planetary positions causing the answer, and clear timing of when things will resolve or unfold.` : ''}`, 3000),
 
    ]);
 
    const reading = [r1,r2,r3,r4,r5,r6,r7,r8]
      .map(r => r.content.map(c => c.text || '').join(''))
      .join('\n\n');
 
    res.status(200).json({ ok: true, chart, reading });
 
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
