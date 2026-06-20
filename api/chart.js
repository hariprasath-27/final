'use strict';
const { buildFullChart } = require('./ephemeris');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { dob, tob, place, lagna, rasi, nakshatra } = req.body;
    if (!dob || !tob || !place) return res.status(400).json({ error: 'dob, tob, place required' });
    const chart = buildFullChart(dob, tob, place, { lagna, rasi, nakshatra });
    res.status(200).json({ ok: true, chart });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
