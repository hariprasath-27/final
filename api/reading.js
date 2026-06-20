'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { buildFullChart } = require('./ephemeris');
const { buildReadingPrompt } = require('./prompts');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: 'POST only' });

  try {
    const { dob, tob, place, name, gender, question, lagna, rasi, nakshatra } = req.body;
    if (!dob || !tob || !place || !name)
      return res.status(400).json({ error: 'dob, tob, place, name required' });

    const chart = buildFullChart(dob, tob, place, {
      lagna: lagna || undefined,
      rasi:  rasi  || undefined,
      nakshatra: nakshatra || undefined,
    });

    const prompt = buildReadingPrompt(chart, { name, gender: gender || 'not specified' }, question);

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: 'You are a master Tamil Jyotish astrologer with 40+ years of experience. Give precise, chart-specific readings. Every statement must cite exact planetary positions and house numbers. Use === SECTION === headers. Be specific with years and ages. Never be vague or generic.',
      messages: [{ role: 'user', content: prompt }],
    });

    const reading = message.content.map(c => c.text || '').join('');
    res.status(200).json({ ok: true, chart, reading });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
