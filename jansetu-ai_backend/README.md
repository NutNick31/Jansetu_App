# JanSetu AI — Backend

Node.js + TypeScript backend for the JanSetu AI Digital Public Good platform. Serves the React frontend, ingests citizen requests across WhatsApp/SMS/IVR/web, and proxies Google AI calls.

## Prerequisites

- Node.js 20+ (Node 22 recommended)
- A Firebase project on the Spark (free) plan
- A `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey)

## Setup

1. Copy `.env.example` → `.env` and fill in the values.
2. Place the Firebase service-account JSON at `secrets/firebase-service-account.json`.
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Start the dev server:
   ```powershell
   npm run dev
   ```
5. Verify:
   ```powershell
   curl http://localhost:8080/health
   ```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Watch mode via `tsx` |
| `npm run build` | Emit `dist/` via `tsc` |
| `npm start` | Run `dist/index.js` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest single run |
| `npm run test:watch` | Vitest watch |

## Structure

```
src/
├── index.ts             # Express bootstrap
├── config/              # env loader, Firebase/BigQuery/Storage clients
├── middleware/          # auth, error, logger, rate limit
├── modules/             # feature modules (citizen, whatsapp, districts, ...)
├── services/            # external API wrappers (gemini, twilio, h3, ingest, ...)
├── jobs/                # seed & ingest scripts
├── openapi/             # OpenAPI 3.0 spec
└── types/               # shared TS interfaces
```

## Firestore composite indexes

`firestore.indexes.json` declares the composite indexes used by phased queries. Local dev works without deploying them (Firestore falls back to slow, unindexed scans). Deploy them before production:

```powershell
npm install -g firebase-tools
firebase login
firebase use jansetu-ai-afa77
firebase deploy --only firestore:indexes
```

## Exposing the local backend to Twilio / Meta (live webhooks)

Twilio (WhatsApp Sandbox + SMS) and Meta (WhatsApp Cloud API) need a public HTTPS URL that reaches your local `:8080`. Two free options:

### Cloudflare Tunnel (recommended, no signup)

```powershell
# One-time install (winget), then run in a separate terminal:
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:8080
```

The command prints a URL like `https://random-name.trycloudflare.com` that stays alive as long as the process runs. No account needed.

### ngrok (needs a free account)

```powershell
winget install --id Ngrok.Ngrok
ngrok config add-authtoken <YOUR_TOKEN>   # from dashboard.ngrok.com
ngrok http 8080
```

The free tier gives you `https://random-slug.ngrok-free.app` and sessions up to ~2 hours before the URL rotates.

### Wire the tunnel URL into Twilio / Meta

| Service | Where | Value |
| --- | --- | --- |
| Twilio WhatsApp Sandbox | Console → Messaging → Try it out → Send a WhatsApp message → "Sandbox Configuration" → **When a message comes in** | `https://<tunnel>/api/whatsapp/twilio` (`POST`) |
| Twilio SMS | Console → Phone Numbers → your trial number → **A message comes in** | `https://<tunnel>/api/sms/twilio` (`POST`) |
| Meta WhatsApp | developers.facebook.com → your app → WhatsApp → Configuration → **Callback URL** | `https://<tunnel>/api/whatsapp/webhook` + your `META_VERIFY_TOKEN` |

Keep the tunnel command running while you test. Kill it when done — no charges either way.

See `../plan.md` (or the session plan) for the full phased delivery roadmap.
