# Jothidam — Tamil Astrology Web App

## Deploy to Vercel (5 minutes)

### Option A: Vercel CLI (fastest)
```bash
npm install -g vercel
cd jothidam-vercel
vercel login          # login with GitHub/Google
vercel deploy --prod
```
When prompted, add environment variable:
- Name:  ANTHROPIC_API_KEY
- Value: your_anthropic_api_key

### Option B: Vercel Dashboard (no CLI needed)
1. Upload this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Framework Preset: Other
4. Root Directory: ./
5. Add Environment Variable:
   - ANTHROPIC_API_KEY = your_anthropic_api_key
6. Click Deploy

### Get your Anthropic API key
https://console.anthropic.com/

## Features
- Full Tamil Jyotish chart from date + time + place
- Swiss Ephemeris calculations (Lahiri Ayanamsha)
- All 9 planet positions with house, degree, status
- Vimshottari Dasha with Antardashas
- Yoga & Dosha detection
- AI reading: character, past, present, career, wealth,
  marriage, children, health, next 5 years, remedies
- Marriage matching: all 10 Poruthams scored + AI analysis
- South Indian square chart
- Works for any city in India

## Project Structure
```
/api/
  chart.js      - Calculate chart (no AI)
  reading.js    - Full personal reading (AI)
  match.js      - Marriage compatibility (AI)
  ephemeris.js  - Planet calculations engine
  matching.js   - 10 Porutham calculator
  prompts.js    - AI prompt builder
/public/
  index.html    - Complete frontend
vercel.json     - Vercel configuration
package.json    - Dependencies
```
