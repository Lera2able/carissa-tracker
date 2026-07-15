# Carissa Tracker AI (`/api/ai`)

This Worker enables the **Admin → 🤖 TRAE Assistant** panel to respond with real AI answers.

## What it does

- Adds a secure server-side endpoint: `POST /api/ai`
- Keeps the `OPENAI_API_KEY` on Cloudflare (never exposed in the browser)
- Returns JSON: `{ "answer": "..." }`

## Deploy (Cloudflare Worker)

1. Install Wrangler
   - `npm i -g wrangler`
2. Log in
   - `wrangler login`
3. From this folder (`cloudflare-ai-worker`), publish:
   - `wrangler deploy`
4. Set the secret:
   - `wrangler secret put OPENAI_API_KEY`
5. In Cloudflare Dashboard → Workers → Routes, add:
   - `tracker.carissaprimary.co.za/api/ai*` → `carissa-tracker-ai`

## Test

Use curl:

```bash
curl -X POST 'https://tracker.carissaprimary.co.za/api/ai' ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Hello\"}"
```

