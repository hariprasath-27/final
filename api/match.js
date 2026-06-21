
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart, computeMatchScore } = require('./ephemeris');
const { calcPorutham } = require('./matching');
 
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 
const SYSTEM_TRADITIONAL = `You are a traditional Vedic marriage matching expert. Analyze only classical porutham compatibility. Use Nakshatra, Pada, Rasi, Gana, Nadi, Yoni, Rajju, Vedha, Mahendra, Sthree Deergha, Vasya, Graha Maitri and Manglik compatibility. Do not use psychology or modern interpretation. State facts clearly. No bullet points — short paragraphs. Use === SECTION === headers.`;
 
const SYSTEM_DEEP = `You are an advanced Jyotish compatibility analyst. Analyze emotional compatibility, chemistry, karmic alignment, marriage stability, conflict risk and timing using weighted multi-layer analysis. If positive and negative factors conflict, explain both sides — never choose one. State confidence level (HIGH/MEDIUM/LOW) for each finding based on how many layers confirm it. No bullet points — short paragraphs. Use === SECTION === headers. PROBABILITY LANGUAGE: Never say "will" — say "strongly suggests", "high tendency", "the chart indicates." Complete every sentence.`;
 
function buildMatchFactSheet(chart1, chart2, matchResult, matchScore, p1name, p2name) {
  const d1 = chart1.dasha, d2 = chart2.dasha;
  const mw1 = chart1.refinedMarriage?.windows||[], mw2 = chart2.refinedMarriage?.windows||[];
 
  return `
╔══════════════════════════════════════════════════════════
MATCH FACT SHEET — ALL SECTIONS MUST ALIGN WITH THESE FACTS
╚══════════════════════════════════════════════════════════
 
SCORES:
Overall: ${matchScore.overall}/100 (${matchScore.verdict})
Emotional: ${matchScore.emotional}% | Physical: ${matchScore.physical}% | Stability: ${matchScore.stability}%
Karmic: ${matchScore.karmic}% | Conflict risk: ${matchScore.conflict}% | Long-term: ${matchScore.longterm}%
 
10 PORUTHAM RESULTS:
Total: ${matchResult.totalScore}/${matchResult.maxScore} (${matchResult.pct}%) — ${matchResult.verdict}
Critical fails: ${matchResult.criticalFails?.join(', ')||'None'}
${Object.entries(matchResult.results||{}).map(([k,v])=>`${k}: ${v.score}/${v.max} ${v.pass?'PASS':'FAIL'}${v.nullified?' [NULLIFIED]':''} — ${v.note}`).join('\n')}
Mangal Dosha: ${matchScore.mangalOk?'Matched — both charts aligned':'MISMATCH — one has active Dosha, other does not'}
Chovva/Mangal notes: ${matchResult.chovvaNotes?.map(c=>c.note).join(' | ')||'none'}
 
LAYER ANALYSIS:
${Object.entries(matchScore.scores||{}).map(([k,s])=>`${k}: ${s.score}/100 — ${s.desc}`).join('\n')}
 
TOP STRENGTHS: ${matchScore.topStrengths?.join(' | ')||'none'}
TOP CONCERNS: ${matchScore.topConcerns?.join(' | ')||'none'}
 
RISK FLAGS:
Saturn-Mars clash: ${matchScore.satMarsClash?'YES':'No'}
${p1name} divorce risk: ${chart1.divorceIndicators?.level} | ${p2name} divorce risk: ${chart2.divorceIndicators?.level}
${p1name} Venus affliction: ${chart1.venusAffliction?.level} (${chart1.venusAffliction?.score}/100)
${p2name} Venus affliction: ${chart2.venusAffliction?.level} (${chart2.venusAffliction?.score}/100)
${p1name} second marriage: ${chart1.secondMarriage?.summary?.slice(0,80)||'not indicated'}
${p2name} second marriage: ${chart2.secondMarriage?.summary?.slice(0,80)||'not indicated'}
 
MARRIAGE TIMING:
${p1name}: ${mw1.slice(0,2).map(w=>`${w.period} (${w.dates}) ${w.strength}`).join(', ')||'check next Mahadasha'}
${p2name}: ${mw2.slice(0,2).map(w=>`${w.period} (${w.dates}) ${w.strength}`).join(', ')||'check next Mahadasha'}
Timing overlap: ${matchScore.timingOverlap?'YES — windows align':'Windows may not overlap'}
 
INDIVIDUAL CHARTS:
${p1name}: Lagna ${chart1.lagna.rasi} | Rasi ${chart1.rasi.name} | Nak ${chart1.nakshatra.name} Pada ${chart1.nakshatra.pada} | Nadi ${chart1.nakshatra.nadi}
  H7: ${chart1.houses[7]?.join(',')||'Empty'} | Venus: ${chart1.planets.Venus?.rasi} H${chart1.planets.Venus?.house} ${chart1.planets.Venus?.status?.split(' ')[0]}
  Upapada: ${chart1.upapadaLagna?.rasi} (${chart1.upapadaLordAnalysis?.quality?.split('—')[0]?.trim()||'?'})
  A7: ${chart1.a7?.rasi} | DK: ${chart1.karakas?.Darakaraka} | AK: ${chart1.karakas?.Atmakaraka}
  D9 Venus: ${chart1.navamsa?.planets?.Venus?.rasi} H${chart1.navamsa?.planets?.Venus?.house} ${chart1.navamsa?.planets?.Venus?.status?.split(' ')[0]}
  Dasha: ${d1.current?.lord} → ${d1.currentAntar?.lord} (ends ${d1.currentAntar?.endDate?.slice(0,7)})
 
${p2name}: Lagna ${chart2.lagna.rasi} | Rasi ${chart2.rasi.name} | Nak ${chart2.nakshatra.name} Pada ${chart2.nakshatra.pada} | Nadi ${chart2.nakshatra.nadi}
  H7: ${chart2.houses[7]?.join(',')||'Empty'} | Venus: ${chart2.planets.Venus?.rasi} H${chart2.planets.Venus?.house} ${chart2.planets.Venus?.status?.split(' ')[0]}
  Upapada: ${chart2.upapadaLagna?.rasi} (${chart2.upapadaLordAnalysis?.quality?.split('—')[0]?.trim()||'?'})
  A7: ${chart2.a7?.rasi} | DK: ${chart2.karakas?.Darakaraka} | AK: ${chart2.karakas?.Atmakaraka}
  D9 Venus: ${chart2.navamsa?.planets?.Venus?.rasi} H${chart2.navamsa?.planets?.Venus?.house} ${chart2.navamsa?.planets?.Venus?.status?.split(' ')[0]}
  Dasha: ${d2.current?.lord} → ${d2.currentAntar?.lord} (ends ${d2.currentAntar?.endDate?.slice(0,7)})
`;
}
 
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
 
  try {
    const { person1, person2 } = req.body;
    if (!person1?.dob || !person2?.dob)
      return res.status(400).json({ error: 'Both persons data required' });
 
    const chart1 = buildFullChart(person1.dob, person1.tob||'06:00', person1.place, {
      lagna:person1.lagna, rasi:person1.rasi, nakshatra:person1.nakshatra });
    const chart2 = buildFullChart(person2.dob, person2.tob||'06:00', person2.place, {
      lagna:person2.lagna, rasi:person2.rasi, nakshatra:person2.nakshatra });
 
    const matchResult = calcPorutham(chart1, chart2, person1.name, person2.name);
    const matchScore  = computeMatchScore(chart1, chart2, matchResult);
    const today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
    const mfs = buildMatchFactSheet(chart1, chart2, matchResult, matchScore, person1.name, person2.name);
 
    const ctx = `TODAY: ${today}\nBoy: ${person1.name} (DOB: ${person1.dob}, Place: ${person1.place})\nGirl: ${person2.name} (DOB: ${person2.dob}, Place: ${person2.place})\n${mfs}`;
 
    // 4 parallel calls — traditional (2 calls) + deep (2 calls)
    const [trad1, trad2, deep1, deep2] = await Promise.all([
 
      // TRADITIONAL CALL 1 — Porutham scores + dosha analysis
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM_TRADITIONAL,
        messages: [{ role: 'user', content: `${ctx}
 
=== TRADITIONAL PORUTHAM ANALYSIS ===
 
--- Score Summary ---
State: "${matchResult.totalScore} out of ${matchResult.maxScore} Poruthams match (${matchResult.pct}%)". Then state the overall traditional verdict clearly. Cite which are critical passes and which are critical fails.
 
--- Poruthams That Match ---
Go through every PASS from the 10 Porutham results. For each: name, score, and what it gives this couple in traditional terms.
 
--- Poruthams That Fail ---
Go through every FAIL. For each: name, whether it is ACTIVE or NULLIFIED, the classical reason, and the traditional impact on married life.
 
--- Rajju & Nadi (Most Critical) ---
State Rajju result: ${matchResult.results?.Rajju?.note}. State Nadi result: ${matchResult.results?.Nadi?.note}. Explain the classical significance of each and whether this match is safe from a traditional longevity standpoint.` }],
      }),
 
      // TRADITIONAL CALL 2 — Mangal + final traditional verdict
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM_TRADITIONAL,
        messages: [{ role: 'user', content: `${ctx}
 
--- Mangal Dosha (Chovva Dosham) ---
${matchScore.mangalOk?`Both charts are aligned on Mangal Dosha. Explain what this means traditionally and why this is acceptable.`:`There is a Mangal Dosha mismatch. State which person has the active Dosha, what the classical risk is, what remedies are required before marriage.`}
 
--- Nadi Dosha ---
${matchResult.results?.Nadi?.nullified?`Nadi Dosha is present but NULLIFIED. Explain the nullification rule and what it means.`:`${matchResult.results?.Nadi?.pass?'Different Nadi — good. Explain the traditional benefits of this.':'Same Nadi — state the traditional concern and whether any nullification applies.'}`}
 
--- Traditional Verdict for Family ---
State clearly: is this match traditionally acceptable by classical Tamil/Kerala Jyotish standards? What conditions must be met? What pariharams (remedies) are required if any? What the elders and traditional astrologers would say about this match.` }],
      }),
 
      // DEEP CALL 1 — Emotional + Chemistry + Karmic
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM_DEEP,
        messages: [{ role: 'user', content: `${ctx}
 
=== DEEP COMPATIBILITY ANALYSIS ===
 
--- Emotional Compatibility (${matchScore.emotional}%) ---
From Moon sign relationship, Moon-Venus sync. How will these two feel together on a daily basis? Where does natural emotional understanding exist? Where will emotional friction arise? State confidence level.
 
--- Physical Chemistry (${matchScore.physical}%) ---
From Venus-Mars cross analysis. How strong is the initial attraction? Will it deepen or fluctuate? If conflicting indicators exist, state both sides.
 
--- Karmic Bond (${matchScore.karmic}%) ---
From Darakaraka cross-match, Atmakaraka compatibility, D9 Navamsa. What is the soul-level connection between these two? Does this feel like a karmic/destined meeting or a practical union? State confidence level.
 
--- Navamsa (D9) Compatibility ---
D9 Lagna relation, D9 Venus comparison. What the soul chart says about this match beyond surface indicators.` }],
      }),
 
      // DEEP CALL 2 — Stability + Risk + Timing + Verdict
      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        system: SYSTEM_DEEP,
        messages: [{ role: 'user', content: `${ctx}
 
--- Marriage Stability (${matchScore.stability}%) ---
From 7th house cross-match, Upapada compatibility, A7. What is the structural foundation of this marriage? Will it strengthen over years or face increasing strain? Cite both positive and negative factors.
 
--- Conflict Risk (${matchScore.conflict}%) ---
From Saturn-Mars clash (${matchScore.satMarsClash?'YES':'No'}), Venus affliction, divorce indicators. Where will arguments arise? How serious is the conflict tendency? Can it be managed and how?
 
--- Individual Marriage Karma ---
${person1.name}'s marriage potential from their own chart (H7, Venus, UL, D9 Venus). ${person2.name}'s marriage potential. Are their individual karmas compatible with each other?
 
--- Marriage Timing ---
${person1.name}'s windows: ${chart1.refinedMarriage?.windows?.slice(0,2).map(w=>`${w.period} (${w.dates})`).join(', ')||'check Mahadasha'}
${person2.name}'s windows: ${chart2.refinedMarriage?.windows?.slice(0,2).map(w=>`${w.period} (${w.dates})`).join(', ')||'check Mahadasha'}
${matchScore.timingOverlap?'Windows overlap — state the ideal joint marriage window.':'Windows may not overlap — how should they plan the timing?'}
 
--- Doshas & Remedies ---
Every active Dosha affecting this marriage. ACTIVE or NULLIFIED with reason. For every ACTIVE: specific temple in Tamil Nadu or Kerala, deity, day, mantra with count, gemstone.
 
--- Final Verdict ---
Overall ${matchScore.overall}/100. Long-term potential ${matchScore.longterm}%. What this match truly offers and what it truly demands. Should they proceed and under what conditions. What the next 5, 15, and 30 years of this marriage look like.` }],
      }),
 
    ]);
 
    // Separate traditional and deep readings
    const traditionalReading = [trad1,trad2]
      .map(r=>r.content.map(c=>c.text||'').join('')).join('\n\n');
    const deepReading = [deep1,deep2]
      .map(r=>r.content.map(c=>c.text||'').join('')).join('\n\n');
 
    res.status(200).json({
      ok: true, chart1, chart2, matchResult, matchScore,
      traditionalReading, deepReading,
      // Combined for backward compat
      reading: traditionalReading + '\n\n' + deepReading
    });
 
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
