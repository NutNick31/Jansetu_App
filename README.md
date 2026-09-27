# JanSetu AI · Digital Public Good for India

> Multilingual, voice-first AI platform that aligns citizen infrastructure demand with government capital — from a Hindi voice note on Telegram to a ₹8 Cr sanction letter, in one closed loop.

**Live app:** https://jansetu-ai-afa77.web.app

**Live API:** https://jansetu-backend-klv2alsjfa-el.a.run.app

**API docs (Swagger):** https://jansetu-backend-klv2alsjfa-el.a.run.app/api/docs/

**Citizen bot:** [@jansetu_ai_bot](https://t.me/jansetu_ai_bot) on Telegram

---

## What it does

Every ₹ of PFMS money can be traced back to a citizen who asked for it — in the language they speak, on the channel they already use.

1. **Ingest anywhere** — WhatsApp, Telegram, SMS, IVR (missed call), USSD, Web. Voice or text. Any of 22 Indian languages.
2. **Understand with Gemini** — translate → classify category → extract district → score urgency → resolve location via India Post PIN + OpenStreetMap Nominatim + Wikipedia enrichment.
3. **Rank with a Priority Index** — transparent weighted formula (`w₁·Demand + w₂·Deficit + w₃·Vulnerability`) computed identically on frontend and backend, guaranteed by 50/50 vitest parity cases.
4. **Recommend + sanction** — AI matches districts to schemes (PMGSY-III, JJM, etc.) with estimated budget, beneficiary reach, matched-scheme rationale. Policymaker approves in one click.
5. **Nudge the citizen** — the exact person who reported the issue gets a Telegram DM: *"🎉 Your ₹8 Cr JJM project has been sanctioned."*
6. **Verify by satellite** — pre / post-construction imagery + AI verification score close the accountability loop.

---

## Live URLs

| Surface | URL |
|---|---|
| Web app (React SPA) | https://jansetu-ai-afa77.web.app |
| Backend API (Cloud Run) | https://jansetu-backend-klv2alsjfa-el.a.run.app |
| Swagger UI | https://jansetu-backend-klv2alsjfa-el.a.run.app/api/docs/ |
| OpenAPI 3.0.3 JSON | https://jansetu-backend-klv2alsjfa-el.a.run.app/api/docs/openapi.json |
| Telegram bot | https://t.me/jansetu_ai_bot |

---

## Architecture

```
┌─────────────────┐        ┌──────────────────────────┐        ┌───────────────────┐
│   Citizen       │        │      Cloud Run           │        │  Firebase Hosting │
│                 │        │  Node 22 + Express 5     │        │  React 19 + Vite  │
│ • WhatsApp      │──HTTP──▶  Firebase Auth guard     │◀──HTTPS─│  Tailwind v4      │
│ • Telegram      │        │  Swagger UI + OpenAPI    │        │  role-aware UI    │
│ • SMS · IVR     │        │  Priority Index engine   │        └───────────────────┘
│ • USSD · Web    │        │  Nudge dispatcher        │                  ▲
└─────────────────┘        └──────────────────────────┘                  │
                                        │                                │
                          ┌─────────────┼─────────────┐                  │
                          ▼             ▼             ▼                  │
                    ┌──────────┐  ┌──────────┐  ┌──────────┐            │
                    │ Gemini   │  │ Firestore│  │ Telegram │            │
                    │ Text·ASR │  │ Native   │  │ Bot API  │────────────┘
                    │ Vision·TTS│  │ 5 cols   │  │ WhatsApp │
                    └──────────┘  └──────────┘  │ Twilio   │
                                                └──────────┘
```

Every ingest → translated → classified → geo-located → PI recomputed → visible to policymaker in real time. Every sanction → nudge fanout to all linked citizens → satellite verification queued.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 · Vite 8 · TypeScript 5.7 · Tailwind CSS v4 · Leaflet · Recharts · react-markdown |
| Backend | Node 22 · Express 5 · TypeScript · zod · pino · Firebase Admin SDK · H3 |
| Database | Firestore (Native mode) — 5 collections, 60+ live docs |
| AI | Google Gemini `flash-lite-latest` (text) + `gemini-3.8-flash` (multimodal) + `gemini-2.5-flash-preview-tts` |
| Auth | Firebase Authentication (Google + Email/Password) with role-based access via allow-list |
| Messaging | Telegram Bot API (`@jansetu_ai_bot`) · Twilio WhatsApp / SMS / Voice |
| Spatial | H3 hex grid · Leaflet map · Nominatim reverse-geocoder |
| Live data | India Post PIN lookup · OpenStreetMap Nominatim · Wikipedia REST API |
| Docs | Swagger UI + OpenAPI 3.0.3 hand-written spec |
| Container | Multi-stage Dockerfile (Node 22 Alpine, ~150 MB image) |
| CI/CD | Cloud Build (Docker layer caching) → Cloud Run · Firebase Hosting via CLI |

---

## Features shipped

| Phase | Delivered |
|---|---|
| 0 | Node 22 + TS + Express scaffold, service account wired |
| 1 | 5 Firestore collections seeded (28 docs) · 11 CRUD endpoints · React shell |
| 2 | 6 Gemini AI endpoints (photo analyze, copilot, translate, ASR, TTS, entity extract) with 429/503 retry-with-backoff |
| 3 | Multi-channel ingest routers (WhatsApp, SMS, IVR, USSD, Telegram) sharing one `ingestCitizenRequest()` pipeline |
| 4 | Priority Index engine (frontend + backend) · 50/50 vitest parity · `/simulate` endpoint · auto-recompute in Firestore transaction |
| 5 | Nudge dispatch + sanction fanout + satellite audit endpoint |
| 6 | Firebase Auth (Google + email/password) · role gates via `POLICYMAKER_EMAILS` · Swagger UI at `/api/docs` |
| 7 | Cloud Run backend + Firebase Hosting frontend + one-command redeploy scripts |

**Beyond spec:** Wikipedia enrichment for 13/15 districts · auto-provisioning missing districts via Nominatim · AI Recommender with 6 sector filters · AI-suggested Target Priority Sector · trade-off simulator · searchable Telegram contact directory · UI role gating with optimistic-revert on rejection.

---

## Repository layout

```
Jansetu_App/
├── jansetu-ai_backend/          # Node 22 + Express 5 API server
│   ├── src/
│   │   ├── config/              #  env schema · firebase admin init · OpenAPI spec
│   │   ├── middleware/          #  auth · error handler · pino logger
│   │   ├── modules/             #  one folder per feature (requests, projects, telegram, ...)
│   │   ├── services/            #  gemini · firestore · ingest · priority · recommend · ...
│   │   └── types/               #  domain types + zod schemas (single source of truth)
│   ├── test/                    #  50 priority-index parity tests (vitest)
│   ├── Dockerfile               #  multi-stage build
│   └── package.json
│
├── jansetu-ai_frontend/         # React 19 + Vite 8 SPA
│   ├── src/
│   │   ├── components/          #  CitizenPortal · PolicymakerDashboard · VerificationPortal · ...
│   │   ├── services/            #  apiClient · firebaseAuth · gemini · bhashini
│   │   ├── data/                #  offline fallback mock data
│   │   └── utils/               #  priorityEngine (mirrors backend math)
│   └── package.json
│
├── scripts/                     # PowerShell deploy scripts
│   ├── deploy-backend.ps1       #  Cloud Run (gcloud run deploy --source)
│   ├── deploy-frontend.ps1      #  vite build + firebase deploy
│   ├── deploy-all.ps1           #  both in sequence
│   └── build_pptx.py            #  regenerate JanSetu_AI_Presentation.pptx from source
│
├── presentation.html            # Self-contained Reveal.js slide deck (16 slides)
├── JanSetu_AI_Presentation.pptx # Native editable PowerPoint version
├── firebase.json                # Firebase Hosting config (SPA rewrites, cache headers)
├── .firebaserc                  # Pinned Firebase project id
└── .gitignore                   # Aggressively ignores .env, secrets/, service accounts
```

---

## Local development

### Prerequisites

- **Node.js 22+** (`node --version`)
- **npm 10+**
- **Python 3.10+** (only if you want to regenerate the PPTX)
- A **Firebase project** on the Blaze plan
- A **Google Gemini API key** (https://ai.google.dev/)
- Optional: **Twilio credentials** (WhatsApp / SMS / IVR sandbox) and **Telegram Bot token** (from BotFather)

### Backend

```bash
cd jansetu-ai_backend
npm install
```

Create `.env`:

```env
GEMINI_API_KEY=AIza...your key
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-service-account.json
SESSION_SECRET=<64+ random hex chars>

# Optional messaging channels
TELEGRAM_BOT_TOKEN=<botfather token>
TELEGRAM_BOT_USERNAME=your_bot
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Role-based access
POLICYMAKER_EMAILS=you@yourdomain.com

PORT=8080
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
```

Download your Firebase service account key from Firebase Console → Project Settings → Service Accounts → Generate new private key → save to `secrets/firebase-service-account.json`.

```bash
npm run seed        # populate Firestore with 15 districts + 8 schemes + sample requests
npm run dev         # tsx watch on port 8080
```

Verify:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/docs/     # Swagger UI
```

### Frontend

```bash
cd jansetu-ai_frontend
npm install
```

Create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080

# Firebase Web SDK config (Firebase Console → Project settings → General → Your apps → Web app)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<numeric>
VITE_FIREBASE_APP_ID=1:<numeric>:web:<hash>
```

```bash
npm run dev         # Vite dev server on http://localhost:5173
```

Sign in with any email/password, or Google. To become a policymaker, add your email to `POLICYMAKER_EMAILS` in the backend `.env` and restart.

---

## Deployment

### Prerequisites

- **Google Cloud SDK (`gcloud`)** — https://cloud.google.com/sdk/docs/install
- **Firebase CLI** — `npm install -g firebase-tools`
- Firebase project on the **Blaze plan** (Cloud Run requires billing enabled)
- Enable APIs: `gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com`

### Deploy

```powershell
cd Jansetu_App

# First-time login (both CLIs)
gcloud auth login
gcloud config set project jansetu-ai-afa77
firebase login

# Deploy everything in ~1 minute
.\scripts\deploy-all.ps1

# Or one side at a time
.\scripts\deploy-backend.ps1     # gcloud run deploy --source
.\scripts\deploy-frontend.ps1    # vite build + firebase deploy --only hosting
```

The backend script generates a temporary YAML env-vars file from your local `.env`, deploys via Cloud Build, and caches the resulting URL for the frontend script to auto-consume.

### Register the Telegram webhook (once, after backend URL is known)

```powershell
$backend = (Get-Content .\scripts\.backend-url -Raw).Trim()
& "C:\Windows\System32\curl.exe" -s "https://api.telegram.org/bot<TOKEN>/setWebhook?url=$backend/api/telegram/webhook"
```

---

## API surface

Fully documented at `/api/docs/`. Highlights:

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/me` | Bearer | Signed-in identity + resolved role |
| `GET /api/requests` | open | List citizen requests |
| `POST /api/requests` | Bearer | Submit new request (webapp channel) |
| `GET /api/districts` | open | 15 districts with priority index |
| `GET /api/schemes` | open | 8 government schemes |
| `POST /api/projects/recommend` | open | Gemini-driven top-N project recommendations |
| `POST /api/projects/:id/sanction` | **policymaker** | Sanction + fan out Telegram nudges |
| `POST /api/nudges/send` | **policymaker** | Nudge a specific citizen request |
| `POST /api/telegram/send` | **policymaker** | Ad-hoc Telegram DM by chat_id |
| `POST /api/vision/analyze-photo` | open | Gemini multimodal photo analysis |
| `POST /api/copilot/query` | open | NL Q&A over selected districts |
| `POST /api/translate` | open | Indian-language → English |
| `POST /api/asr` | open | Voice note → transcript |
| `POST /api/tts/synthesize` | open | Text → audio (base64) |
| `POST /api/priority/simulate` | open | Re-rank districts with custom weights (no writes) |
| `GET /api/verification/projects/:id/satellite-audit` | open | Pre/post satellite imagery |
| `POST /api/{whatsapp,telegram,sms,ivr}/webhook` | open | External-system ingest webhooks |

Auth pattern: `Authorization: Bearer <Firebase ID token>` on every write endpoint. Get an ID token in the browser console:

```js
(await import('/src/services/firebaseAuth.ts')).getIdToken().then(console.log)
```

---

## Testing

```bash
cd jansetu-ai_backend
npm test                    # 50/50 vitest cases (priority-index parity)
```

The parity tests guarantee that the frontend `utils/priorityEngine.ts` and backend `services/priority.ts` produce identical PI values for every combination of weights, deficits, and demand counts.

---

## Security notes

- Firebase Web SDK config values are **public identifiers**, not credentials — safe to commit in `.env.production`. Real security comes from Firestore Security Rules + Firebase Auth verification.
- Backend uses **Firebase Admin SDK** with either a mounted service-account JSON (local dev) or Application Default Credentials (Cloud Run's attached service account).
- Every mutation route calls `requirePolicymaker`, which verifies the Firebase ID token and checks the resolved role against `POLICYMAKER_EMAILS`. Frontend also hides restricted UI + reverts optimistic state on 403.
- Twilio and Telegram tokens are **never committed** — kept in `.env` (local) or Cloud Run env vars (production). See `.gitignore` for the full ignore list.

---

## Screenshots & demo

- **`presentation.html`** — self-contained Reveal.js slide deck (16 slides). Open in any browser, press `F` for full-screen, arrow keys to navigate. Add `?print-pdf` to the URL to export a PDF.
- **`JanSetu_AI_Presentation.pptx`** — native editable PowerPoint version of the same deck.

To regenerate the PPTX from source (e.g. after updating stats):

```bash
pip install python-pptx
python scripts/build_pptx.py
```

---
