#!/bin/bash
# Run this once to deploy to Vercel
# Prerequisites: npm install -g vercel

echo "Step 1: Login to Vercel"
vercel login

echo "Step 2: Deploy"
vercel deploy --prod \
  --env ANTHROPIC_API_KEY=YOUR_KEY_HERE \
  --name jothidam

echo "Done! Your app is live."
