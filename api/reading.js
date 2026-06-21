
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM = `You are Jothida Pandithar — the most respected Tamil Jyotish astrologer alive, with 40 years of practice. Families travel from distant villages to sit before you. Your reputation rests entirely on accuracy and depth.
 
HOW YOU WRITE:
- Speak directly to the person as "you" — warm, personal, like a trusted elder who knows them deeply
- Every paragraph must be at least 100 words — rich, detailed, specific
- Weave astrological reasons naturally into insights — do not say "because Sun is in H10" mechanically. Instead say "Your career carries a quiet authority that others sense before you even speak — this comes from the Sun's placement in your 10th house of public life." The planet and house are mentioned but the INSIGHT comes first
- Never write vague statements. If you say something will happen, say when, why, and what it will feel like
- Write in flowing paragraphs — no bullet points anywhere
- Use === SECTION === for main headings and --- Sub Heading --- for sub-topics inside sections
- Do not introduce sections with "In this section I will..." — just begin the content directly
- CRITICAL: Always complete every sentence and paragraph fully. If approaching the token limit, finish the current thought cleanly at a natural paragraph boundary. Never stop mid-sentence or mid-word.`;
 
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
 
      // CALL 1 — Who You Are
      call(`Write ONLY this section. Start directly with === header. No intro. Every paragraph must be at least 100 words — rich, detailed, giving real insights not mechanical statements.
 
=== WHO YOU ARE ===
 
--- Physical Appearance ---
Write 2 paragraphs describing how this person looks and carries themselves — height, build, skin tone, facial features, hair, eyes, posture, the impression they make. Draw from ${chart.lagna.rasi} Lagna with lord ${chart.lagna.lord} in H${chart.lagna.lordHouse} (${chart.lagna.lordStatus}). In the second paragraph describe the family background, home environment they grew up in, social class and values of their family, based on H4 (${chart.houses[4]?.join(',')||'Empty'}) and H9 (${chart.houses[9]?.join(',')||'Empty'}).
 
--- Emotional Nature & Personality ---
Write 3 paragraphs. First: how this person loves, reacts to conflict, handles loneliness and stress, what they need to feel secure — from Moon H${p.Moon?.house} ${p.Moon?.rasi} and ${chart.nakshatra.name} Nakshatra. Second: their spiritual nature — are they drawn to God and temples naturally or does spirituality come later? How deep is their faith and dharmic sense? Third: the characteristic mistakes this person makes repeatedly in life — the patterns they fall into, what they need to consciously work against.
 
--- Strengths & Weaknesses ---
Write 2 paragraphs. First: every genuine strength this person has — what they can achieve that others cannot, what gifts the planets have placed in their hands, what real-life outcomes these strengths produce. Second: every genuine weakness — the recurring failure patterns, the blind spots that keep creating the same problems, where they self-sabotage. Be honest and specific without being harsh.`, 4000),
 
      // CALL 2 — Past & Present
      call(`Write ONLY this section. Start directly with === header. No intro. Every paragraph must be at least 100 words.
 
=== PAST — WHAT LIFE HAS GIVEN SO FAR ===
 
--- Childhood & Growing Years ---
Write 2 paragraphs summarising the past Dasha periods quickly. What kind of childhood was this — secure or turbulent, academically strong or difficult, emotionally warm or distant? What were the school and college years like? What shaped this person most deeply in their first 20 years? Give real texture and turning points with approximate years and ages.
 
--- Karma & What This Life Is For ---
Write 1 paragraph on what Ketu H${p.Ketu?.house} ${p.Ketu?.rasi} and Rahu H${p.Rahu?.house} ${p.Rahu?.rasi} reveal. What did this soul master in past lives and what has it come to learn and achieve in this one? What is the central karmic theme of this lifetime?
 
=== PRESENT — WHAT IS HAPPENING RIGHT NOW ===
 
--- The ${curM} Mahadasha, ${curA} Bhukti ---
Write 3 paragraphs. First: what ${curM} in H${p[curM]?.house} ${p[curM]?.rasi} (${p[curM]?.status}) means as the ruling Dasha lord — what areas of life it is activating, what themes it brings, what it is asking of this person. Second: what ${curA} in H${p[curA]?.house} ${p[curA]?.rasi} (${p[curA]?.status}) adds as the Bhukti lord right now — how it interacts with the Mahadasha, what it specifically opens or closes. Third: a precise picture of what is actually happening in this person's life at this exact moment — career, relationships, finances, inner state.
 
--- Changes Coming in the Next 12 Months ---
Write 3 paragraphs covering what is shifting in this person's life right now and in the coming year. What good things are opening — which doors, which opportunities, which relationships. What needs caution — what risks exist, what could go wrong, what to avoid. Cover career, money, relationships, and health signals.`, 4000),
 
      // CALL 3 — Career & Money
      call(`Write ONLY this section. Start directly with === header. No intro. Every paragraph must be at least 100 words.
 
=== CAREER & MONEY ===
 
--- Natural Profession & Talents ---
Write 2 paragraphs. What profession is genuinely written in this chart — not a generic list but the actual field that suits this person's planetary makeup. What talents come so naturally they feel effortless? What kind of work makes this person feel alive? Draw from H10 (${chart.houses[10]?.join(',')||'Empty'}), Sun H${p.Sun?.house} ${p.Sun?.status}, Mercury H${p.Mercury?.house} ${p.Mercury?.status}, Saturn H${p.Saturn?.house} ${p.Saturn?.status}.
 
--- Career Right Now (Age ${age}) ---
Write 2 paragraphs on what is happening in this person's career at this exact age under the ${curM}-${curA} Dasha. Is this a growth period or a consolidation period or a difficult patch? What should this person be doing right now to move forward? What specific actions will yield results in the next 6-12 months?
 
--- Career Through the Decades ---
Write 3 paragraphs covering career decade by decade. When does career genuinely take off — which Dasha, which age? When does the big breakthrough arrive? What does the peak career period look like — what position, what income, what recognition? What does career look like after 50 — still active or winding down?
 
--- Wealth & Property ---
Write 3 paragraphs. How wealth comes to this person based on H2 (${chart.houses[2]?.join(',')||'Empty'}), H11 (${chart.houses[11]?.join(',')||'Empty'}), Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}. When are the best financial years and why? When are lean periods and how lean? What about property — when does home or land ownership happen, what kind of property? What is the overall financial arc of this life?`, 4000),
 
      // CALL 4 — Marriage & Children
      call(`Write ONLY this section. Start directly with === header. No intro. Every paragraph must be at least 100 words.
 
=== MARRIAGE & CHILDREN ===
 
--- Your Life Partner ---
Write 3 paragraphs describing the destined life partner in real terms — not abstract qualities but what kind of person they will actually be. What is their nature, their character, their profession? What will they look like? What family background will they come from? How will they complement this person and where will they create friction? Draw from H7 (${chart.houses[7]?.join(',')||'Empty'}), Venus H${p.Venus?.house} ${p.Venus?.status}, Jupiter H${p.Jupiter?.house} ${p.Jupiter?.status}.
 
--- Love or Arranged? What Will Parents Say? ---
Write 2 paragraphs. Will this be a love marriage or an arranged one — what does the chart show about how the meeting will happen? What will parents' attitude be — supportive or resistant? If resistance, from which side and what will the specific concern be? Will it eventually get family blessing and what will make that happen?
 
--- Marriage Timing ---
Write 2 paragraphs. Exactly which Dasha period and approximate year is most likely for marriage. What is the best age window? If there are delays, why exactly and until what point? What would trigger the delay to resolve?
 
--- Married Life: Will It Last? ---
Write 2 paragraphs. What will married life actually feel like — the daily harmony, the recurring friction points, the way this couple handles conflict and love over time. Will this marriage grow stronger with years or will pressure build? What are the most challenging periods within the marriage and what would cause them?
 
--- Children ---
Write 2 paragraphs. When will children come, how many are indicated, and what is the timing of the first child? What kind of children — their nature, their intelligence, their life path? Any concerns around conception or pregnancy from H5 (${chart.houses[5]?.join(',')||'Empty'}) and Jupiter H${p.Jupiter?.house}?`, 4000),
 
      // CALL 5 — Health
      call(`Write ONLY this section. Start directly with === header. No intro. Every paragraph must be at least 100 words.
 
=== HEALTH ===
 
--- Physical Constitution ---
Write 2 paragraphs. What is this person's fundamental body type and constitution from ${chart.lagna.rasi} Lagna and ${chart.nakshatra.nadi} Nadi? Is their immunity naturally strong or fragile? What is their typical energy level — consistently high, moderate, or prone to crashes? How do they recover from illness — fast or slow? What lifestyle suits them physically?
 
--- Disease Tendencies & What to Watch ---
Write 3 paragraphs. Name every specific disease tendency and every organ system that is vulnerable based on H6 (${chart.houses[6]?.join(',')||'Empty'}), H8 (${chart.houses[8]?.join(',')||'Empty'}), Sun H${p.Sun?.house}, Mars H${p.Mars?.house}, Saturn H${p.Saturn?.house}. Do not be vague — name actual conditions, actual body parts, actual medical concerns this person should be monitoring. What are the early warning signs they should never ignore?
 
--- Mental & Emotional Health ---
Write 2 paragraphs. What is this person's mind like under sustained stress — do they shut down, explode, or internalize? Is anxiety or depression a genuine risk in this chart? How does their emotional state affect their physical body? What specific practices or routines will keep their mental health stable?
 
--- Health Danger Periods ---
Write 2 paragraphs. Which Dasha periods in the past have already been health challenges and which ones coming up need the most care? What exact ages are most vulnerable? What preventive action should be taken now to prepare for the difficult periods ahead?`, 4000),
 
      // CALL 6 — Future 20 years
      call(`Write ONLY this section. Start directly with === header. No intro. Every paragraph must be at least 100 words. Complete every period — do not stop before ${yr+20}.
 
=== THE NEXT 20 YEARS ===
 
--- ${yr} to ${yr+3} ---
Write 3 paragraphs. Which Dashas and Bhuktis run during this window? What are the major life events indicated — in career, relationships, finances, health, family? What decisions made now will shape the next decade? What is opening and what needs caution?
 
--- ${yr+3} to ${yr+6} ---
Write 3 paragraphs. What shifts in this period? Which new Dashas begin and what do they activate? Key milestones — promotion, marriage, first child, property, travel abroad — where do they fall in this window? What should be built and pursued during these years?
 
--- ${yr+6} to ${yr+10} ---
Write 3 paragraphs. How does life look by this point — career position, family situation, financial stability, personal growth? What major challenges arrive in this phase and why astrologically? What rewards from earlier hard work finally arrive?
 
--- ${yr+10} to ${yr+15} ---
Write 2 paragraphs. Life at age ${age+10} to ${age+15} — what has been achieved by now, what remains to be done, what new phase begins? How do career, relationships, children, and health each look at this stage?
 
--- ${yr+15} to ${yr+20} ---
Write 2 paragraphs. The later stage of this 20-year window — what does life look like as this person moves toward their 40s or 50s? Is this a period of harvest and stability or continued challenge? What spiritual and personal transformation happens here?`, 4000),
 
      // CALL 7 — Doshas & Remedies
      call(`Write ONLY this section. Start directly with === header. No intro. Go through every Dosha in the YOGAS & DOSHAS list completely. Every paragraph at least 100 words.
 
=== DOSHAS & PARIHARAMS ===
 
--- Dosha Status: Active or Nullified ---
Go through every single Dosha listed in the chart above. For each one write at least 2 sentences: state clearly whether it is ACTIVE or NULLIFIED, then explain exactly why — which classical rule applies, what it means in this person's real life. If ACTIVE, write a full paragraph on what problem it actually creates — not in abstract but in daily lived experience.
 
--- Complete Remedies ---
For every ACTIVE Dosha give the full remedy: the specific temple name and town in Tamil Nadu or Kerala, the presiding deity, the exact day of the week, the exact Sanskrit mantra with the precise number of repetitions, the gemstone with exact finger and metal, the colour to wear, and the food or item to donate. Write enough detail that this person can begin the remedy this week without any further questions.`, 4000),
 
      // CALL 8 — Special Strengths + Later Life + Death + Question
      call(`Write ONLY these sections. Start each directly with its === header. No intro. Every paragraph at least 100 words.
 
=== SPECIAL STRENGTHS OF THIS CHART ===
Write 3 paragraphs. What extraordinary yogas are present and what specific real-life gifts do they give this person — not in abstract but in concrete terms of career, relationships, wealth, recognition. Which is the single most powerful planet in this chart and what does it promise over this lifetime? What level of success, recognition, or spiritual attainment is genuinely possible for this person based on the chart?
 
=== LATER YEARS & LONGEVITY ===
Write 3 paragraphs. What does life look like after age 60 for this person — health, family, finances, spiritual life? What does the 8th house (${chart.houses[8]?.join(',')||'Empty'}), 8th lord, and Saturn H${p.Saturn?.house} indicate about the length and quality of life? Which Dasha periods in old age carry risk and which bring peace? What kind of final years does this chart indicate — active and connected, or withdrawn and reflective? What approximate age range does the chart suggest for the natural weakening of the life force, and what kind of passing is indicated? Speak honestly and with care.${question ? `
 
=== YOUR QUESTION ANSWERED ===
Write 3 paragraphs answering "${question}" — give the astrological reasoning clearly, name the planets and houses involved, state when exactly things will shift, and give a clear direct answer this person can act on.` : ''}`, 3500),
 
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
