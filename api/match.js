'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { calcPorutham } = require('./matching');
const { buildMatchPrompt } = require('./prompts');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { person1, person2 } = req.body;
    if (!person1?.dob || !person2?.dob)
      return res.status(400).json({ error: 'Both persons data required' });

    const chart1 = buildFullChart(person1.dob, person1.tob || '06:00', person1.place, {
      lagna: person1.lagna, rasi: person1.rasi, nakshatra: person1.nakshatra,
    });
    const chart2 = buildFullChart(person2.dob, person2.tob || '06:00', person2.place, {
      lagna: person2.lagna, rasi: person2.rasi, nakshatra: person2.nakshatra,
    });

    const matchResult = calcPorutham(chart1, chart2);

    // Build full context for prompts
    const porLines = Object.entries(matchResult.results).map(([name,r])=>
      `${name} (${r.max} marks): ${r.score}/${r.max} [${r.pass?'PASS':'FAIL'}${r.critical?' ⚠CRITICAL':''}${r.nullified?' NULLIFIED':''}] — ${r.note} | Measures: ${r.meaning}`
    ).join('\n');

    const mangalStr = matchResult.mangalNotes?.map(m=>`[${m.type.toUpperCase()}] ${m.note}`).join('\n') || 'No Mangal Dosha issues';
    const today = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
    const p1 = chart1.planets, p2 = chart2.planets;

    const ctx = `TODAY: ${today}

${person1.name}: DOB ${chart1.input.dob} | Place ${chart1.input.place}
  Lagna: ${chart1.lagna.rasi} (Lord ${chart1.lagna.lord} H${chart1.lagna.lordHouse}) | Rasi: ${chart1.rasi.name} | Nak: ${chart1.nakshatra.name} P${chart1.nakshatra.pada}
  Gana: ${chart1.nakshatra.gana} | Nadi: ${chart1.nakshatra.nadi} | Yoni: ${chart1.nakshatra.yoni}
  H7: ${chart1.houses[7]?.join(',')||'Empty'} | Venus: ${p1.Venus?.rasi} H${p1.Venus?.house} | Jupiter: ${p1.Jupiter?.rasi} H${p1.Jupiter?.house} ${p1.Jupiter?.status||''}
  Mars: ${p1.Mars?.rasi} H${p1.Mars?.house} ${p1.Mars?.status||''}
  Dasha: ${chart1.dasha.current?.lord} → ${chart1.dasha.currentAntar?.lord} Bhukti (ends ${chart1.dasha.currentAntar?.endDate?.slice(0,7)||''})

${person2.name}: DOB ${chart2.input.dob} | Place ${chart2.input.place}
  Lagna: ${chart2.lagna.rasi} (Lord ${chart2.lagna.lord} H${chart2.lagna.lordHouse}) | Rasi: ${chart2.rasi.name} | Nak: ${chart2.nakshatra.name} P${chart2.nakshatra.pada}
  Gana: ${chart2.nakshatra.gana} | Nadi: ${chart2.nakshatra.nadi} | Yoni: ${chart2.nakshatra.yoni}
  H7: ${chart2.houses[7]?.join(',')||'Empty'} | Venus: ${p2.Venus?.rasi} H${p2.Venus?.house} | Jupiter: ${p2.Jupiter?.rasi} H${p2.Jupiter?.house} ${p2.Jupiter?.status||''}
  Mars: ${p2.Mars?.rasi} H${p2.Mars?.house} ${p2.Mars?.status||''}
  Dasha: ${chart2.dasha.current?.lord} → ${chart2.dasha.currentAntar?.lord} Bhukti (ends ${chart2.dasha.currentAntar?.endDate?.slice(0,7)||''})

10 PORUTHAM:
${porLines}

TOTAL: ${matchResult.totalScore}/${matchResult.maxScore} (${matchResult.pct}%) — ${matchResult.verdict}
CRITICAL FAILS: ${matchResult.criticalFails.length?matchResult.criticalFails.join(', '):'None'}
MANGAL DOSHA: ${mangalStr}`;

    const sys = `You are Jothida Pandithar, master Tamil Jyotish astrologer 40 years experience. Give a deep, accurate marriage compatibility reading. Cite exact porutham scores in every statement. Use === SECTION === headers. No bullet points — flowing paragraphs. State every Dosha as ACTIVE or NULLIFIED with exact reason. Be warm but honest — parents are reading this.`;

    // Two parallel calls — together under 30s, well within Vercel 60s limit
    const [r1, r2] = await Promise.all([

      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: sys,
        messages: [{ role: 'user', content: `${ctx}

Write Part 1 with these sections. Flowing paragraphs, no bullets, cite scores always.

=== OVERALL COMPATIBILITY ===
(${matchResult.totalScore}/${matchResult.maxScore} = ${matchResult.pct}% — explain what this means for this specific couple, their strengths and concerns)

=== 10 PORUTHAM — DETAILED ANALYSIS ===
(Go through ALL 10 poruthams. For each: state the score, what it means in daily married life for THIS couple. Rajju and Nadi first as most critical. Every Dosha state ACTIVE or NULLIFIED with exact reason.)

=== EMOTIONAL & MENTAL COMPATIBILITY ===
(Ganam, Rasi relationship, Nadi temperament — how will they think and feel together daily?)

=== PHYSICAL COMPATIBILITY ===
(Yoni porutham result and what it means. Mangal Dosha analysis for both: ${mangalStr})

=== FINANCIAL COMPATIBILITY ===
(Both charts' 2nd house, 11th house, Jupiter — combined financial strength and management style)` }]
      }),

      anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: sys,
        messages: [{ role: 'user', content: `${ctx}

Write Part 2 with these sections. Flowing paragraphs, no bullets.

=== CHILDREN & FAMILY LIFE ===
(Nadi Dosha impact on children — ACTIVE or NULLIFIED, exact reason, exact risk if active. H5 from both charts. Family harmony.)

=== BEST TIME TO MARRY ===
(Based on both Dasha timelines — which year and period is most auspicious for both? Give specific window with astrological reason.)

=== DOSHAS & PARIHARAMS ===
(Every active Dosha: name it, state ACTIVE or NULLIFIED, exact reason. For every ACTIVE Dosha give complete remedy — specific temple name in Tamil Nadu or Kerala, deity, day, mantra with count, gemstone with finger and metal.)

=== FINAL RECOMMENDATION ===
(Clear verdict for the families. Should they proceed? Under what conditions? What does long-term married life look like for this couple? Be honest and warm.)` }]
      }),
    ]);

    const reading = [r1,r2].map(r=>r.content.map(c=>c.text||'').join('')).join('\n\n');
    res.status(200).json({ ok: true, chart1, chart2, matchResult, reading });

  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
