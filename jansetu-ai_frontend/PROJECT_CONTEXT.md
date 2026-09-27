# Project Context & AI Handover Specification: JanSetu AI

> **System Overview**: JanSetu AI is a Digital Public Good (DPG) and Digital Public Infrastructure (DPI) platform built for India. It aggregates citizen infrastructure development requests across 22+ official Indian languages via voice, text, WhatsApp, IVR, and SMS, cross-references them with national demographic data, PM Gati Shakti GIS baselines, and PFMS public financial budgets, and surfaces AI-recommended projects to NITI Aayog and state policymakers.

---

## 1. 📁 Repository & Directory Structure

* **Root Path**: `c:\Users\sagala\Downloads\tech_projects\jansetu-ai`
* **Technology Stack**: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide React, Canvas Confetti, Leaflet.js, `@google/genai` (Gemini API), Express.js backend.

```
jansetu-ai/
├── src/
│   ├── types/
│   │   └── index.ts                 # All TypeScript interfaces (CitizenRequest, DistrictMetric, Scheme, etc.)
│   ├── utils/
│   │   └── priorityEngine.ts        # Priority Index math formula (PI = w1*D + w2*I + w3*V) & H3 hex math
│   ├── services/
│   │   ├── geminiService.ts         # @google/genai SDK (Gemini 2.5 Flash Vision & Policy Copilot)
│   │   └── bhashiniService.ts       # Bhashini ASR, TTS, Neural Machine Translation & Entity Extraction
│   ├── data/
│   │   └── mockData.ts              # Fused dataset of 10+ Indian districts, 8 schemes, requests, projects
│   ├── components/
│   │   ├── Navbar.tsx               # DPI branding header, language selector (11 languages), portal tabs
│   │   ├── CitizenPortal.tsx        # Voice recorder (Web Speech API), WhatsApp simulator, Gemini photo audit
│   │   ├── PolicymakerDashboard.tsx # Heatmap map, Priority Index sliders, Scheme Matcher, Policy Copilot
│   │   ├── DataFusionPortal.tsx     # Tabular cross-referencing of 8 national open datasets + GeoJSON export
│   │   ├── VerificationPortal.tsx   # Automated WhatsApp citizen nudges, Satellite audit, DPG Open APIs
│   │   ├── PitchDeckPortal.tsx      # Built-in 11-slide presentation carousel for hackathon judges
│   │   ├── ApiKeyModal.tsx          # Optional Gemini API Key configuration modal
│   │   └── WhatsAppModal.tsx        # Real Phone QR Code scanning & Twilio Sandbox modal
│   ├── App.tsx                      # Main app shell & global state management
│   ├── index.css                    # Tailwind CSS v4 imports & Leaflet map styling
│   └── main.tsx                     # React entry point
├── server.js                        # Express backend server hosting Meta & Twilio WhatsApp webhooks
├── package.json                     # Dependencies & build scripts
├── vite.config.ts                   # Vite bundler configuration
└── PROJECT_CONTEXT.md               # This context specification file
```

---

## 2. 🧮 Mathematical Formulas & Spatial AI Logic

### Composite Priority Index ($PI$)
Calculated in `src/utils/priorityEngine.ts` for every district/spatial hexagonal unit:

$$PI = w_1 \cdot (\text{Demand Volume}) + w_2 \cdot (\text{Infra Deficit}) + w_3 \cdot (\text{Socio-Economic Vulnerability})$$

* **$w_1$ (Demand Volume Weight)**: Default `0.40`
* **$w_2$ (Infra Deficit Weight)**: Default `0.35` (Derived from PM Gati Shakti road, water, health, school deficits)
* **$w_3$ (SECC Vulnerability Weight)**: Default `0.25` (Derived from SECC Census BPL & marginal population index $V \in [0.0, 1.0]$)

---

## 3. 🤖 AI Integrations Architecture

### A. Google Gemini AI (`src/services/geminiService.ts`)
* **SDK**: `@google/genai`
* **Model**: `gemini-2.5-flash`
* **Multimodal Vision Diagnostics (`analyzeInfrastructurePhoto`)**: Accepts base64 images of citizen complaints (damaged roads, broken pipes, school roofs) and returns structured JSON with issue summary, severity (`Critical`/`High`/`Medium`/`Low`), estimated cost (in ₹ Cr), category, and confidence score.
* **Executive Policy Copilot (`queryPolicyCopilot`)**: Conversational AI assistant for NITI Aayog planners answering queries on budget allocation, scheme matching, and beneficiary reach.
* **Offline Fallback**: Includes a heuristic civil diagnostic engine so the prototype runs offline without an API key.

### B. Bhashini AI Platform (`src/services/bhashiniService.ts`)
* **Automatic Speech Recognition (ASR)**: Transcribes citizen voice notes in 22+ official Indian languages using browser Web Speech API (`SpeechRecognition`).
* **Neural Machine Translation (NMT)**: Translates native voice transcripts into standard English planning schemas.
* **Conversational 3-Point Entity Extractor**: Extracts the mandatory 3 parameters from unstructured voice notes:
  1. *What infrastructure is missing?*
  2. *Where is it located?* (Landmark, pincode, GPS)
  3. *How many citizens are affected?*
* **Text-to-Speech (TTS)**: Speaks back audio prompts in the citizen's native language.

---

## 4. 🌐 Integrated Datasets & Regional Coverage

### Sourced Datasets Modeled in `src/data/mockData.ts`:
1. **PM Gati Shakti Master Plan** (`data.gov.in` / BISAG-N) — Road km, tap water %, PHC counts.
2. **Public Financial Management System (PFMS)** (`pfms.nic.in`) — Unspent regional capital expenditure (₹ Cr).
3. **Census & SECC Data** (`censusindia.gov.in`) — Vulnerability index & population density.
4. **NITI Aayog Aspirational Districts Program** — Development lag benchmarks.
5. **ISRO Bhuvan / Sentinel-2** — Post-completion multispectral satellite verification images.
6. **IMD Meteorological Services** — Monsoon & flood climate risk indices.
7. **BharatNet & USOF** — Gram Panchayat digital fiber connectivity.

### Geographic Districts Covered:
* **Varanasi (Sewapuri Block)** — Uttar Pradesh
* **Wayanad (Mananthavady)** — Kerala
* **Kalahandi (Lanjigarh)** — Odisha
* **Purnia (Dhamdaha)** — Bihar
* **Bastar (Jagdalpur)** — Chhattisgarh
* **Barmer (Chohtan Desert)** — Rajasthan
* **Majuli Island (Garamur)** — Assam
* **Kupwara (Handwara)** — Jammu & Kashmir
* **Sundarbans (Gosaba)** — West Bengal
* **Chamarajanagar (Bandipur)** — Karnataka

---

## 5. 📱 Access Channels & Webhooks

1. **Interactive Web Form**: Conversational 3-question flow with photo upload & speech recording.
2. **WhatsApp API Bot Simulator**: Interactive WhatsApp chat interface with verified bot badge and quick reply chips.
3. **Real Phone WhatsApp Connection**:
   - Meta Cloud API Webhook: `GET/POST /api/whatsapp/webhook`
   - Twilio WhatsApp Sandbox: `POST /api/whatsapp/twilio`
   - External testers can scan the QR code in `WhatsAppModal.tsx` or text `join brave-tiger` to `+1 415 523 8886`.

---

## 6. ⚙️ Execution Commands

* **Production Build Verification**:
  ```bash
  npm run build
  ```
* **Launch React Frontend**:
  ```bash
  npm run dev
  ```
  *(Access at `http://localhost:5173`)*
* **Launch Express WhatsApp Webhook Server**:
  ```bash
  node server.js
  ```
  *(Access at `http://localhost:3001`)*

---

## 🚀 Suggested Next Tasks for the Next AI Agent

1. **Database Persistence**: Replace in-memory array in `server.js` with PostgreSQL / Prisma or Firebase Firestore.
2. **Live Map Rendering**: Integrate `@react-leaflet` Leaflet vector map tile layers for full GeoJSON polygon bounding boxes.
3. **WhatsApp Audio Media Ingestion**: Expand `server.js` Meta Webhook to download incoming voice note `.ogg` files directly from Meta Graph API media endpoints and send them to Google Cloud Speech-to-Text / Bhashini API.
