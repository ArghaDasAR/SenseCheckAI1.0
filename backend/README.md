# SenseCheck AI Backend API

> Node.js + Express backend for SenseCheck AI — OCR, QR decode, LLM scam scoring, async job queue.

---

## Quick Start

### 1. Setup environment
```bash
cd backend
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Setup database
```bash
npm install
npx prisma db push
npm run db:seed
```

### 3. Run (two terminals)

**Terminal 1 — API server:**
```bash
npm run dev   # → http://localhost:4000
```

**Terminal 2 — Job worker (requires Redis):**
```bash
node worker.js
```

> Without Redis: server automatically falls back to synchronous processing.

---

## ☁️ Cloudinary — The Backbone of SenseCheck AI's Image Pipeline

> **Cloudinary is not just a storage bucket here. It is the single most critical infrastructure piece in the entire SenseCheck AI backend.** Every image that a user uploads — a WhatsApp screenshot, a UPI QR code, a fake bank SMS, a phishing email — flows through Cloudinary before anything else happens. Without Cloudinary, there is no image ingestion, no OCR, no QR decode, and no scam detection for image-based inputs.

---

### 🔵 What Cloudinary Does in SenseCheck AI (Step by Step)

#### Step 1 — Secure Ingestion & Storage

When a user uploads a screenshot, the backend receives the raw image buffer (after validating it with **magic bytes** to ensure it's a real image, not a disguised executable). The buffer is streamed directly to Cloudinary via the **Upload API** using server-side credentials — the user never touches Cloudinary directly in the secure flow.

```
User → POST /api/scan/upload (multipart)
     → Magic bytes validation (JPEG/PNG/WEBP confirmed)
     → Cloudinary Upload API (server SDK stream upload)
     → Stored at: sensecheck-ai/uploads/{userId}/{filename}
     ← Returns: { secure_url, public_id, tags, width, height }
```

Cloudinary stores the original image securely and returns:
- `secure_url` — HTTPS CDN URL to the original
- `public_id` — unique identifier stored in the DB for later cleanup
- `tags` — used for intelligent pipeline routing (see Step 3)

Every upload is scoped to a per-user folder (`sensecheck-ai/uploads/{userId}`) so assets are isolated per user. Guest uploads go into `sensecheck-ai/uploads/guest`.

---

#### Step 2 — On-the-Fly Image Transformation for OCR Accuracy

This is where Cloudinary's transformation engine becomes a game-changer. Raw screenshots are often low-contrast, blurry, compressed by WhatsApp, or poorly lit phone photos. Running OCR on a raw WhatsApp-compressed screenshot gives terrible text extraction results.

**The backend never runs OCR on the raw upload.** Instead, it constructs a specially transformed Cloudinary URL that applies a chain of image enhancement operations **at the CDN edge, with zero extra storage**:

```
Original URL:
https://res.cloudinary.com/{cloud}/image/upload/sensecheck-ai/uploads/.../abc.jpg

OCR-Optimised URL (injected automatically by upload.service.js):
https://res.cloudinary.com/{cloud}/image/upload/f_auto,q_auto,e_improve,e_sharpen,e_enhance/sensecheck-ai/uploads/.../abc.jpg
```

| Transformation | What it does | Why it matters for SenseCheck AI |
|---|---|---|
| `f_auto` | Auto-selects best format (WebP/AVIF/JPEG) | Reduces bandwidth, faster delivery to OCR API |
| `q_auto` | Auto-optimises quality | Keeps image sharp without bloating size |
| `e_improve` | Contrast + brightness correction | Fixes dark WhatsApp screenshots |
| `e_sharpen` | Edge sharpening | Makes text edges crisper for OCR |
| `e_enhance` | AI-powered overall enhancement | General quality uplift for phone photos |

The result: Google Vision API and Tesseract.js receive a **clean, high-contrast, sharpened image** instead of a blurry WhatsApp-compressed photo — dramatically improving OCR text accuracy, especially for Hindi, Bengali, and Tamil text in scam messages.

This transformation URL is computed in `upload.service.js → buildOcrUrl()` by simply injecting the transformation string into the URL path — **no extra API call, no extra storage, billed at zero additional cost**.

---

#### Step 3 — Auto-Tagging → Intelligent Pipeline Routing

Cloudinary's **Auto-Tagging add-on** (powered by Google Vision under the hood) analyses the uploaded image and returns semantic tags describing what it sees. SenseCheck AI uses these tags to automatically route the image to the correct detection pipeline — without the user having to tell us what kind of scam it is.

```
Cloudinary tags returned on upload
         ↓
assetRouter.service.js reads the tags
         ↓
┌─────────────────────────────────────────────────────────────┐
│  "qr code", "barcode"          →  QR Pipeline               │
│  "screenshot", "chat", "sms"   →  Text Thread Pipeline      │
│  "payment", "website", "form"  →  Payment Page Pipeline     │
│  "document", "email", "kyc"    →  Email/KYC Pipeline        │
│  (no confident match)          →  Text Thread (safe default) │
└─────────────────────────────────────────────────────────────┘
```

**Example:** A user uploads a QR code image without telling us it's a QR code. Cloudinary auto-tags it as `["qr code", "barcode"]`. The asset router reads those tags and sends it directly to the **QR decode pipeline** (jsQR → UPI intent parse → reputation check) instead of wasting time on OCR.

> ⚠️ **Important:** Auto-Tagging requires the **Google Auto Tagging add-on** enabled on your Cloudinary account (available on paid plans). Without it, tags will be empty and routing will fall back to `text_thread` by default — this is handled gracefully in the code.

---

#### Step 4 — Privacy-First TTL & Auto-Expiry

Users upload highly sensitive images — bank alerts, KYC notices, Aadhaar-linked messages. Storing these indefinitely is a privacy and security risk.

SenseCheck AI sets an `expiresAt` timestamp (30 days from upload) on every `Scan` row in the database. A scheduled `cleanup.service.js` job runs daily and:

1. Queries all scans where `expiresAt <= now` and `cloudinaryPublicId IS NOT NULL`
2. Calls `cloudinary.uploader.destroy(publicId)` to permanently delete the original from Cloudinary's CDN
3. Nullifies `cloudinaryPublicId` and `cloudinaryUrl` in the DB row

The **OCR-extracted text** and **verdict** are retained in the database for the user's history, but the sensitive original image is gone.

```bash
# This should run daily via cron:
node -e "require('./src/services/cleanup.service').cleanupExpiredScans()"
```

---

#### Step 5 — Public Share Thumbnails

When a user toggles `isPublicShare = true` on a scan (`PATCH /api/scan/:id/share`), a public shareable link is generated. The frontend can use the Cloudinary URL with a thumbnail transformation to display a preview — again, no extra storage or API calls needed:

```
# Thumbnail for share cards (200×200, cropped, auto quality):
https://res.cloudinary.com/{cloud}/image/upload/w_200,h_200,c_fill,q_auto/sensecheck-ai/uploads/...
```

---

### 🔑 Cloudinary Credentials You Need

Set these three in your `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name     # from cloudinary.com/console
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

The backend checks these at startup and logs whether Cloudinary is active:

```
🔧  Active integrations:
    Cloudinary: ✅      ← configured and ready
    Cloudinary: ❌      ← missing credentials — upload endpoint will throw
```

### 📋 Cloudinary Account Setup Checklist

```
[ ] Create free Cloudinary account at cloudinary.com
[ ] Copy Cloud Name, API Key, API Secret into .env
[ ] Go to Settings → Upload → Add upload preset (not needed for server-side)
[ ] (Optional) Enable "Google Auto Tagging" add-on for intelligent routing
[ ] (Optional) Set CORS allowed origins if using direct browser uploads
```

### 🆓 Is it free?

Yes — Cloudinary's free tier gives you:
- **25 GB** storage
- **25 GB** monthly bandwidth
- **25,000** transformations/month

For a hackathon or early-stage project, the free tier is more than enough. Auto-Tagging add-on requires a paid plan.

---

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login → `{ accessToken, refreshToken }` |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke refresh token |
| POST | `/api/auth/forgot-password` | Send reset link |
| POST | `/api/auth/reset-password` | Consume reset token |
| GET | `/api/auth/me` | Current user info |

### Scans (Async)
| Method | Route | Description |
|---|---|---|
| POST | `/api/scan/upload` | Upload image → Cloudinary |
| POST | `/api/scan/analyze` | Submit scan → `{ scanId, status: "pending" }` |
| GET | `/api/scan/:id` | **Poll** for result |
| GET | `/api/scan/:id/public` | Public shareable verdict (PII stripped) |
| PATCH | `/api/scan/:id/share` | Toggle public sharing |
| GET | `/api/scan/history` | User's past scans |
| POST | `/api/scan/:id/feedback` | Mark verdict correct/incorrect |

### Community & Stats
| Method | Route | Description |
|---|---|---|
| POST | `/api/report/scam` | Report a UPI/URL/phone number |
| GET | `/api/report/blocklist` | Public threat blocklist |
| GET | `/api/stats?days=7` | Aggregate dashboard stats |

---

## Async Scan Flow

```
1. POST /api/scan/analyze → { scanId, status: "pending" }
2. GET  /api/scan/:id     → { status: "processing" }   (poll every 1s)
3. GET  /api/scan/:id     → { status: "completed", verdict, riskScore, ... }
```

The frontend `scamAnalyzer.js` handles polling automatically with a 30-second timeout.

---

## Scoring System

| Component | Weight | Description |
|---|---|---|
| `ruleScore` | 40% | Deterministic rules engine (11 rules: urgency, threats, OTP harvest, phishing URLs, etc.) |
| `llmScore` | 60% | GPT-4o-mini classification with Indian scam context |
| `riskScore` | — | `ruleScore × 0.4 + llmScore × 0.6` |

**Degrades gracefully:** if `OPENAI_API_KEY` is missing, `riskScore = ruleScore` only.

---

## Required API Keys

| Key | Required | Free Tier | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Neon / Supabase | PostgreSQL |
| `CLOUDINARY_CLOUD_NAME` | ✅ | ✅ Yes | Image ingestion + CDN |
| `CLOUDINARY_API_KEY` | ✅ | ✅ Yes | Server-side upload auth |
| `CLOUDINARY_API_SECRET` | ✅ | ✅ Yes | Server-side upload auth |
| `OPENAI_API_KEY` | ⚠️ | ❌ Pay-per-use | LLM scam classification |
| `REDIS_URL` | ⚠️ | ✅ Upstash free | Async job queue + caching |
| `GOOGLE_VISION_API_KEY` | ⚠️ | ✅ 1000/mo free | OCR (Tesseract fallback if missing) |
| `VIRUSTOTAL_API_KEY` | ⚠️ | ✅ Yes | URL reputation |
| `SENTRY_DSN` | ❌ | ✅ Yes | Error tracking |
| `SMTP_*` | ❌ | ✅ Mailtrap | Password reset emails |

> ✅ = Required &nbsp;&nbsp; ⚠️ = Optional but recommended &nbsp;&nbsp; ❌ = Fully optional

---

## Project Structure

```
backend/
├── server.js                    ← Express entry point (pino + Sentry + Redis)
├── worker.js                    ← BullMQ worker (run separately)
├── README.md
├── prisma/
│   ├── schema.prisma            ← DB schema (v2 normalized)
│   └── seed.js                  ← Seeds known scam threats
├── src/
│   ├── config/
│   │   ├── cloudinary.js        ← Cloudinary SDK init
│   │   ├── db.js                ← Prisma client singleton
│   │   ├── redis.js             ← Redis + BullMQ (graceful degradation)
│   │   └── sentry.js            ← Error tracking (graceful degradation)
│   ├── middleware/
│   │   ├── auth.js              ← JWT access token verify
│   │   ├── rateLimit.js         ← Per-endpoint rate limiters
│   │   ├── requestId.js         ← UUID request ID injection
│   │   ├── validate.js          ← Zod validation wrapper
│   │   └── errorHandler.js      ← Global error handler
│   ├── schemas/
│   │   ├── auth.schema.js       ← Zod schemas for auth endpoints
│   │   └── scan.schema.js       ← Zod schemas for scan endpoints
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── scan.routes.js
│   │   ├── report.routes.js
│   │   └── stats.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js   ← signup/login/refresh/forgot/reset
│   │   ├── scan.controller.js   ← async pipeline orchestration
│   │   ├── report.controller.js ← community scam reporting
│   │   └── stats.controller.js  ← aggregate dashboard data
│   ├── queues/
│   │   ├── scan.queue.js        ← BullMQ queue definition
│   │   └── scan.processor.js    ← Job processor (full pipeline)
│   └── services/
│       ├── upload.service.js    ← ☁️ Cloudinary upload + magic bytes + OCR URL
│       ├── assetRouter.service.js ← Cloudinary tags → pipeline routing
│       ├── ocr.service.js       ← Multi-language OCR (en/hi/bn/ta/te/mr)
│       ├── qr.service.js        ← QR decode + UPI intent parse
│       ├── reputation.service.js ← URL/UPI threat checks (Redis cached)
│       ├── scoring.service.js   ← Rules engine + GPT-4o-mini LLM
│       ├── verdict.service.js   ← Response shaping
│       └── cleanup.service.js   ← Cloudinary TTL + token cleanup
└── __tests__/
    ├── scoring.test.js
    ├── ocr.entities.test.js
    └── magic.bytes.test.js
```

---

## Running Tests

```bash
npm test
```

Covers: scoring engine, entity extraction (UPI IDs, URLs, phones), magic bytes validation.

---

## Notes

- **Cloudinary Auto-Tagging add-on** requires a paid Cloudinary plan. Without it, pipeline routing defaults to `text_thread` — this is handled gracefully.
- **Image TTL:** Originals auto-expire after 30 days. Schedule `cleanup.service.cleanupExpiredScans()` as a daily cron job to delete from Cloudinary storage.
- **Privacy:** Raw OCR text and Cloudinary URLs are stored in PostgreSQL. In production, consider field-level encryption for PII columns.
- **Low-bandwidth support:** Cloudinary's `q_auto` + `f_auto` transformations ensure images are delivered optimally even on 2G/3G networks — don't add client-side compression that conflicts with this.
