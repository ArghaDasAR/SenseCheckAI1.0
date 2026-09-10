# 🛡️ SenseCheck AI

> **Think Before You Trust.**

**SenseCheck AI** is an AI-assisted cybersecurity platform that helps users evaluate suspicious digital content before they click, pay, share information, or respond.

Instead of relying on a single phishing indicator, SenseCheck combines **image ingestion, OCR, QR analysis, URL/entity extraction, deterministic security rules, reputation checks, and LLM-based classification** to generate an explainable risk assessment.

The system is designed around a simple principle:

```text
Suspicious Content
        ↓
   SenseCheck AI
        ↓
Threat Signal Extraction
        ↓
   Risk Evaluation
        ↓
Explainable Verdict
        ↓
Recommended Action
```

> **Human-in-the-loop:** SenseCheck AI provides evidence and risk context. It does not replace human judgment or official verification channels.

---

## ✨ Why SenseCheck AI?

Modern scams are increasingly designed around **social engineering** rather than purely technical exploitation.

Attackers may use:

* Fake banking messages
* KYC and account-verification requests
* UPI/payment scams
* Phishing pages
* Fake courier notifications
* QR-code fraud
* Impersonation
* Job/reward/refund scams
* Urgency and fear-based messaging

A user may receive a screenshot or image without knowing whether it is legitimate.

SenseCheck AI adds a security checkpoint:

```text
Receive → Analyze → Understand → Verify → Act
```

instead of:

```text
Receive → Panic → Click
```

---

# 🚀 Key Features

### 🔍 Multimodal Scam Analysis

Users can submit suspicious screenshots and images containing:

* Messages
* Emails
* Payment pages
* QR codes
* KYC notices
* Transaction screens
* Social-media messages
* Other suspicious digital content

The backend processes the uploaded asset through multiple analysis stages.

### 🧠 Explainable Risk Assessment

The platform does not only return a score.

It can surface the signals responsible for a verdict, including:

* Urgency
* Impersonation
* Sensitive-information requests
* Financial pressure
* Suspicious links
* Social-engineering patterns

The result is converted into a human-readable security recommendation.

### 📊 Risk Scoring

The backend combines deterministic security rules with LLM-based classification.

```text
                ┌──────────────────┐
                │  Rule Engine      │
                │     40%           │
                └────────┬─────────┘
                         │
                         ├──────────────┐
                         │              │
                         ▼              ▼
                  Deterministic      LLM
                    Signals       Classification
                         │              │
                         └──────┬───────┘
                                ▼
                         Unified Risk Score
```

Current scoring architecture:

```text
riskScore = (ruleScore × 0.4) + (llmScore × 0.6)
```

When an OpenAI API key is unavailable, the system gracefully falls back to the deterministic rule score.

### ☁️ Cloudinary Image Pipeline

Cloudinary is integrated as the image ingestion and transformation layer.

The backend:

1. Validates uploaded file signatures.
2. Uploads valid images to Cloudinary.
3. Generates optimized image transformations.
4. Uses transformed assets for downstream analysis.
5. Stores Cloudinary metadata for processing and cleanup.

The backend specifically uses transformations such as:

```text
f_auto
q_auto
e_improve
e_sharpen
e_enhance
```

to improve image quality before OCR and downstream processing.

### 🔳 QR & UPI Analysis

QR images can be routed into a dedicated QR pipeline.

Conceptually:

```text
QR Image
   ↓
QR Detection
   ↓
QR Decode
   ↓
UPI Intent Parsing
   ↓
Threat / Reputation Checks
   ↓
Risk Evaluation
```

The backend uses `jsQR` for QR processing and supports UPI-oriented entity extraction.

### 🌐 URL & Reputation Intelligence

Extracted URLs and entities can be evaluated using reputation-oriented services.

The backend supports:

* URL extraction
* UPI identifier extraction
* Phone/entity extraction
* Reputation lookups
* Threat blocklist access
* Redis-backed caching

This creates a separation between **content analysis** and **external threat intelligence**.

### ⚡ Asynchronous Processing

Long-running scans can be processed asynchronously using **BullMQ + Redis**.

```text
Client
  │
  ▼
POST /api/scan/analyze
  │
  ▼
Create Scan Job
  │
  ▼
BullMQ / Redis
  │
  ▼
Worker
  │
  ├── OCR
  ├── QR
  ├── Reputation
  ├── Rules
  ├── LLM
  └── Verdict
  │
  ▼
Persist Result
  │
  ▼
Client Polls Result
```

The application also supports graceful degradation to synchronous processing when Redis is unavailable.

### 🔐 Authentication & Security Controls

The backend includes:

* JWT access-token authentication
* Refresh-token rotation
* Password-reset workflow
* Zod request validation
* Rate limiting
* Helmet security headers
* Request IDs
* Centralized error handling
* Magic-byte file validation
* Sentry integration
* Environment-based secret management

These controls are implemented as backend middleware/services rather than being mixed into frontend presentation logic.

---

# 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                         USER                                  │
│                                                              │
│  Upload Screenshot / Suspicious Digital Content              │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                            │
│                                                              │
│  Upload UI → Processing State → Result UI                    │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXPRESS API LAYER                          │
│                                                              │
│  Auth • Validation • Rate Limiting • Scan Orchestration      │
└───────────────┬─────────────────────┬────────────────────────┘
                │                     │
                ▼                     ▼
        ┌───────────────┐      ┌────────────────┐
        │  Cloudinary   │      │  PostgreSQL    │
        │ Image Pipeline│      │    + Prisma    │
        └───────┬───────┘      └────────────────┘
                │
                ▼
        ┌──────────────────────┐
        │   Asset Router       │
        │                      │
        │ QR / Text / Payment  │
        │ Email / KYC / etc.   │
        └──────────┬───────────┘
                   │
          ┌────────┼─────────┐
          ▼        ▼         ▼
       OCR      QR Decode  Reputation
          │        │         │
          └────────┼─────────┘
                   ▼
          ┌─────────────────┐
          │  Risk Engine    │
          │                 │
          │ Rules + LLM     │
          └────────┬────────┘
                   ▼
          ┌─────────────────┐
          │ Verdict Engine  │
          └────────┬────────┘
                   ▼
          Explainable Result
                   │
                   ▼
              USER ACTION
```

---

# 🔄 Scan Processing Pipeline

The core backend workflow can be represented as:

```text
                USER UPLOAD
                     │
                     ▼
          Multipart File Reception
                     │
                     ▼
             Magic-Byte Validation
                     │
                     ▼
              Cloudinary Upload
                     │
                     ▼
             Image Optimization
                     │
                     ▼
              Asset Classification
                     │
       ┌─────────────┼──────────────┐
       ▼             ▼              ▼
     QR Path      Text Path     Payment/KYC Path
       │             │              │
       ▼             ▼              ▼
    QR Decode        OCR       OCR / Extraction
       │             │              │
       └─────────────┼──────────────┘
                     ▼
             Entity Extraction
                     │
                     ▼
          Reputation / Threat Intel
                     │
                     ▼
              Rules Engine
                     │
                     ▼
             LLM Classification
                     │
                     ▼
               Risk Scoring
                     │
                     ▼
              Verdict Shaping
                     │
                     ▼
       Explainable Security Result
```

---

# 🧮 Risk Scoring Architecture

SenseCheck AI uses a hybrid scoring model.

## Deterministic Layer

The rule engine evaluates security signals such as:

```text
Urgency
Threat / account pressure
OTP harvesting
Sensitive-data requests
Suspicious URLs
Financial requests
Impersonation patterns
Social-engineering indicators
```

## LLM Layer

The backend can use an LLM classifier to interpret the broader context of the extracted content, including Indian scam patterns.

Current implementation:

```text
Rule Score → 40%
LLM Score  → 60%

Final Risk Score
= Rule Score × 0.4
+ LLM Score × 0.6
```

The architecture also supports graceful degradation:

```text
             OpenAI Available?
                /        \
              YES        NO
               │          │
               ▼          ▼
          Rules + LLM   Rules Only
               │          │
               └────┬─────┘
                    ▼
              Final Risk Score
```

The scoring implementation is located in the backend scoring service.

---

# 🧠 Explainability Model

A key design goal is to avoid a black-box:

```text
"Risk = 91"
```

Instead, SenseCheck is designed around:

```text
Risk Score
    +
Detected Signals
    +
Evidence
    +
Explanation
    +
Recommended Action
```

Example:

```text
Input:
"Your account will be blocked today.
Verify immediately using this link."

Detected Signals:
✓ Urgency
✓ Account threat
✓ Verification pressure
✓ External link

Risk:
HIGH

Recommendation:
Do not interact immediately.
Verify through the organization's official website or app.
```

This makes the security result understandable to non-security users.

---

# 🖥️ Frontend Architecture

The frontend is built with **React + Vite**, with React Router handling application navigation.

Current routes include:

```text
/
├── Landing Page
│
├── /analyze
│   └── Upload → Processing → Result
│
└── /scroll-writing
    └── Architecture / product storytelling
```

The frontend also supports a demo mode when Cloudinary configuration is absent.

### Frontend State Machine

```text
         ┌────────────┐
         │    IDLE    │
         └─────┬──────┘
               │
               ▼
         ┌────────────┐
         │ UPLOADING  │
         └─────┬──────┘
               │
               ▼
         ┌────────────┐
         │ PROCESSING │
         └─────┬──────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   ┌─────────┐    ┌─────────┐
   │ RESULT  │    │  ERROR  │
   └─────────┘    └─────────┘
```

This state model prevents conflicting UI states and makes asynchronous processing predictable.

---

# 📁 Repository Structure

```text
SenseCheckAI/
│
├── SenseCheckAI/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LogoMark.jsx
│   │   │   └── Navbar.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── AnalyzePage.jsx
│   │   │   └── ScrollWritingPage.jsx
│   │   │
│   │   ├── hooks/
│   │   │   └── useAppearAnimation.js
│   │   │
│   │   ├── services/
│   │   │   └── cloudinary.js
│   │   │
│   │   ├── data/
│   │   │   ├── navLinks.js
│   │   │   └── demoAnalysis.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── queues/
│   │   └── services/
│   │
│   ├── __tests__/
│   │   ├── scoring.test.js
│   │   ├── ocr.entities.test.js
│   │   └── magic.bytes.test.js
│   │
│   ├── server.js
│   ├── worker.js
│   ├── .env.example
│   └── package.json
│
└── README.md
```

The directory structure reflects the current repository organization and separates UI, API orchestration, asynchronous jobs, security middleware, persistence, and analysis services.

---

# 🧰 Tech Stack

## Frontend

| Technology       | Role                            |
| ---------------- | ------------------------------- |
| React 19         | UI framework                    |
| Vite             | Build tooling / dev server      |
| React Router     | Client-side routing             |
| Tailwind CSS     | Utility-first styling           |
| Framer Motion    | UI animation                    |
| Cloudinary       | Client-facing image integration |
| JavaScript / JSX | Application code                |

## Backend

| Technology    | Role                             |
| ------------- | -------------------------------- |
| Node.js       | Runtime                          |
| Express       | REST API                         |
| Prisma        | ORM                              |
| PostgreSQL    | Persistent database              |
| Redis         | Queue/cache infrastructure       |
| BullMQ        | Asynchronous job processing      |
| Cloudinary    | Image ingestion + transformation |
| OpenAI API    | LLM-based scam classification    |
| Tesseract.js  | OCR fallback                     |
| Google Vision | OCR integration                  |
| jsQR          | QR decoding                      |
| Zod           | Schema validation                |
| JWT           | Authentication                   |
| Helmet        | HTTP security headers            |
| Sentry        | Error monitoring                 |
| Pino          | Structured logging               |

---

# 🔌 API Overview

## Authentication

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| `POST` | `/api/auth/signup`          | Register a user         |
| `POST` | `/api/auth/login`           | Authenticate user       |
| `POST` | `/api/auth/refresh`         | Rotate refresh token    |
| `POST` | `/api/auth/logout`          | Revoke refresh token    |
| `POST` | `/api/auth/forgot-password` | Start password reset    |
| `POST` | `/api/auth/reset-password`  | Complete password reset |
| `GET`  | `/api/auth/me`              | Retrieve current user   |

## Scan API

| Method  | Endpoint                 | Description                 |
| ------- | ------------------------ | --------------------------- |
| `POST`  | `/api/scan/upload`       | Upload image to Cloudinary  |
| `POST`  | `/api/scan/analyze`      | Create analysis job         |
| `GET`   | `/api/scan/:id`          | Retrieve scan status/result |
| `GET`   | `/api/scan/:id/public`   | Public verdict view         |
| `PATCH` | `/api/scan/:id/share`    | Toggle public sharing       |
| `GET`   | `/api/scan/history`      | User scan history           |
| `POST`  | `/api/scan/:id/feedback` | Submit verdict feedback     |

## Community / Intelligence

| Method | Endpoint                | Description                          |
| ------ | ----------------------- | ------------------------------------ |
| `POST` | `/api/report/scam`      | Report suspicious UPI/URL/phone data |
| `GET`  | `/api/report/blocklist` | Retrieve public threat blocklist     |
| `GET`  | `/api/stats?days=7`     | Aggregate platform statistics        |

---

# ⚙️ Local Development

## 1. Clone the repository

```bash
git clone https://github.com/ArghaDasAR/SenseCheckAI.git
cd SenseCheckAI
```

---

## 2. Start the frontend

```bash
cd SenseCheckAI
npm install
```

Create `.env` from `.env.example`:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run linting:

```bash
npm run lint
```

The frontend automatically supports demo mode when Cloudinary configuration is absent. In demo mode, uploads are simulated locally and the analysis result comes from mock data.

---

# 🖥️ Backend Setup

Open another terminal:

```bash
cd backend
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Configure the required services.

Example:

```env
DATABASE_URL=postgresql://...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

OPENAI_API_KEY=...
REDIS_URL=...

GOOGLE_VISION_API_KEY=...
VIRUSTOTAL_API_KEY=...

JWT_SECRET=...
```

The repository defines additional optional configuration for Sentry and email delivery.

---

# 🗄️ Database Setup

Initialize Prisma:

```bash
npx prisma db push
```

Seed initial threat data:

```bash
npm run db:seed
```

Open Prisma Studio:

```bash
npm run db:studio
```

For schema migrations:

```bash
npm run db:migrate
```

---

# ▶️ Run the Backend

Development server:

```bash
npm run dev
```

Default API:

```text
http://localhost:4000
```

Start the worker:

```bash
npm run worker
```

or:

```bash
node worker.js
```

The backend supports synchronous processing when Redis is unavailable, while Redis + BullMQ enables the intended asynchronous architecture.

---

# 🧪 Testing

Run backend tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Current test coverage includes:

```text
Scoring engine
        ↓
Entity extraction
        ↓
Magic-byte file validation
```

The repository contains dedicated tests for scoring, OCR/entity extraction, and file validation.

For a cybersecurity-oriented system, adversarial testing should additionally include:

```text
Malformed URLs
Obfuscated text
Mixed-language messages
Look-alike domains
Encoded URLs
Large inputs
Empty inputs
Unexpected characters
QR manipulation
False-positive scenarios
```

---

# 🔐 Security Architecture

Security is treated as a first-class concern.

### Untrusted Input

```text
User Input
   ↓
Validation
   ↓
Type / Signature Verification
   ↓
Safe Processing
```

Uploaded files are checked using file signatures/magic bytes before being processed.

### Secrets

Sensitive keys must remain server-side:

```text
❌ Frontend
OPENAI_API_KEY
CLOUDINARY_API_SECRET
JWT_SECRET

✅ Backend
Environment Variables / Secret Manager
```

Only public frontend configuration should use `VITE_` variables.

### API Protection

The backend includes:

```text
JWT Authentication
Rate Limiting
Zod Validation
Helmet
Request IDs
Centralized Error Handling
Structured Logging
```

---

# ☁️ Cloudinary Data Lifecycle

Sensitive screenshots should not be retained indefinitely.

The backend associates uploaded scans with an expiry timestamp and provides a cleanup service to remove expired Cloudinary assets. The current repository documents a **30-day image TTL** for originals.

Conceptually:

```text
Upload
  ↓
Cloudinary
  ↓
Scan Processing
  ↓
Result Stored
  ↓
TTL Reached
  ↓
Cloudinary Asset Deleted
```

The current implementation retains analysis information separately from the original image asset.

> For production environments, additional protection such as encryption of sensitive database fields should be considered because OCR-derived text may contain personally identifiable information.

---

# 📈 Scalability Model

The architecture is designed so expensive analysis tasks can be moved away from the synchronous HTTP request path.

```text
                ┌──────────────┐
                │  API Server  │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │    Redis     │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │    BullMQ    │
                └──────┬───────┘
                       │
                 ┌─────▼─────┐
                 │   Worker  │
                 └─────┬─────┘
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
      OCR           Reputation         LLM
       │               │                │
       └───────────────┼────────────────┘
                       ▼
                Verdict Service
                       │
                       ▼
                  PostgreSQL
```

This allows the API layer and analysis workers to scale independently.

---

# 🧩 Design Principles

### 1. Defence in Depth

No single signal is treated as absolute proof.

```text
Urgency
  +
Impersonation
  +
Suspicious URL
  +
Sensitive-data request
        ↓
   Higher Risk
```

### 2. Explainability

The objective is:

```text
Signal → Evidence → Explanation → Action
```

rather than merely returning a black-box prediction.

### 3. Human-in-the-Loop

SenseCheck AI assists the user instead of pretending to make an infallible security decision.

```text
AI
 ↓
Analyze
 ↓
Explain
 ↓
User
 ↓
Verify
 ↓
Decide
```

---

# ⚠️ Limitations

SenseCheck AI should be treated as a **decision-support and security-assistance system**, not as an infallible malware/scam detector.

Important limitations include:

* New scam patterns may not match current rules or models.
* Legitimate messages can produce false positives.
* Sophisticated attacks may intentionally avoid obvious indicators.
* A low-risk result does not prove legitimacy.
* High-impact actions should always be independently verified through official channels.

This is particularly important for:

```text
Money
Passwords
OTP / verification codes
Banking information
Identity information
Account recovery
Remote-access requests
```

---

# 🗺️ Roadmap

## Phase 1 — Core Scanner

```text
Screenshot
   ↓
OCR / QR
   ↓
Threat Signals
   ↓
Risk Score
   ↓
Explainable Verdict
```

## Phase 2 — Threat Intelligence

```text
URL Reputation
Domain Intelligence
Threat Feeds
Community Blocklists
Known Scam Patterns
```

## Phase 3 — Multimodal Detection

```text
        ┌── Text
        ├── Screenshot
        ├── QR
        └── URL
             │
             ▼
      Unified Threat Engine
```

## Phase 4 — Browser Protection

```text
Website Visit
      ↓
SenseCheck Protection Layer
      ↓
URL / Page Analysis
      ↓
Risk Warning
```

## Phase 5 — Personal Security Assistant

```text
Messages
    +
Links
    +
Screenshots
    +
QR Codes
    ↓
Unified Security Agent
    ↓
Personalized Guidance
```

---

# 🌐 Deployment

The frontend prototype is deployed on **Vercel**.

```text
Developer
    ↓
Git Repository
    ↓
Vercel Build
    ↓
Production Bundle
    ↓
Live Web Application
```

### Live Application

**ScamShield / SenseCheck AI**

https://scamshield-l0vl114ju-arghadasars-projects.vercel.app/

The repository's current frontend documentation identifies Vercel as the deployment environment.

---

# 📚 What This Project Demonstrates

This project combines concepts from:

```text
Cybersecurity
    +
Threat Detection
    +
Phishing Analysis
    +
Social Engineering Detection
    +
Computer Vision
    +
OCR
    +
QR Analysis
    +
LLM Classification
    +
Threat Intelligence
    +
Secure API Design
    +
Async Job Processing
    +
Cloud Infrastructure
    +
Security UX
```

Technically, the project demonstrates how a multimodal security workflow can be decomposed into independent services rather than embedding all detection logic inside a single frontend application.

---

# 🤝 Contributing

Contributions are welcome.

A typical workflow:

```text
Fork
 ↓
Create Branch
 ↓
Implement
 ↓
Test
 ↓
Commit
 ↓
Pull Request
 ↓
Review
 ↓
Merge
```

For security-sensitive changes, include appropriate validation and regression tests.

---

# 🛡️ Responsible Use

SenseCheck AI is intended for **defensive security and user-awareness purposes**.

Do not treat automated analysis as a substitute for:

* Official banking verification
* Security incident response
* Professional cybersecurity investigation
* Law-enforcement reporting

The safest action for suspicious high-impact requests is independent verification through an official channel.

---

# 👨‍💻 Project

**SenseCheck AI**

> **Detect the signal. Explain the risk. Think before you trust.**

Built with a focus on:

**Security • Explainability • Human-in-the-Loop • Developer-First Architecture**

---

## 📄 License

No license is asserted here unless a `LICENSE` file is added to the repository.

---

## ⭐ Support the Project

If this project is useful or interesting:

```text
⭐ Star the repository
🍴 Fork it
🐛 Open an issue
💡 Suggest improvements
🔐 Help improve the security pipeline
```

**Repository:**
https://github.com/ArghaDasAR/SenseCheckAI
