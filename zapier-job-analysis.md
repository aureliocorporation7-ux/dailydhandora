# DailyDhandora → Zapier Sr. Applied AI Engineer — Skill Mapping

## 📌 Job: Sr. Applied AI Engineer @ Zapier (AI Platform Team)
## 📌 Project: DailyDhandora — Fully Automated AI News Platform

---

## 🔴 1. LLM Ops — Model Management, Access, Reliability, Failover

### Zapier Requires:
> "Improve our LLM Ops capabilities — model access, inference reliability, evaluations, deployment workflows, operational guardrails"
> "You have at least 2 years of LLM Ops / ML Ops experience"

### DailyDhandora Implements (MATCH ✅):

**Multi-Layer Model Fallback Architecture:**
- **Layer 1** — Gemini Primary (gemini-2.5-flash → 2.5-flash-lite → 3.1-flash-lite → 3-flash) with 2 retries × 15s timeout
- **Layer 2** — Gemini Fallback Key (same model list, different API key for quota exhaustion) with 2 retries × 1.5s backoff
- **Layer 3** — Groq (7 models: openai/gpt-oss-120b → llama-3.3-70b → qwen3-32b → gpt-oss-20b → llama-4-scout → groq/compound → llama-3.1-8b) with 2 retries × 2s backoff, JSON mode enforced
- **Total:** 3 providers × ~18 models × 2 retries = **36 possible inference attempts** before failure

**Rate Limit Management:**
- RateLimitTracker class persists state to disk (.rate-limit-state.json)
- Per-model rate limit tracking with midnight UTC reset calculation
- 90-second cooldowns after rate limit hits in PDF processor
- Graceful degradation when all providers exhausted

**Prompt Engineering & Management:**
- Hybrid DB > Cache > Code prompt strategy (Firestore → 10-min memory → hardcoded defaults)
- Admin PromptEditor UI for live prompt modification without redeploy
- Fill-template system (injects headline, body, recentHeadlines into prompts)
- System prompt defines strict persona rules (Senior Editor-in-Chief, zero source mention, JSON-only)

**Structured Output:**
- All LLM calls enforce `response_format: { type: "json_object" }` (Groq) or parsing from markdown code blocks (Gemini)
- AI category validation with fuzzy matching + safety overrides
- Semantic duplicate detection in prompt context (passes recent headlines, asks AI to compare)

---

## 🔴 2. ML Pipeline — Full Data Lifecycle

### Zapier Requires:
> "Experience working through full lifecycle of building, testing, deploying, and scaling ML/LLM architectures"

### DailyDhandora Implements (MATCH ✅):

**End-to-End Pipeline:**
```
Scraping (Cheerio/Jina) → Mandi Detection → GIST Diversity Algorithm → AI Processing → Image Gen → Card Gen → Audio Gen → Push Notifications → Firestore
```

**Data Acquisition (Plan A/B Fallback):**
- Plan A: Cheerio with browser-like headers, content detection via max <p>-tag div
- Plan B: Jina Reader API for cleaner extraction when Plan A fails
- Strict date filtering (today + yesterday only)
- URL deduplication via Firestore sourceUrl query

**Mandi Detection — Rule-Based Classifier:**
- Price pattern detection (number + rupee + quintal)
- Strict mandi keyword matching
- Blacklist filtering (sports, crime, politics, entertainment)
- URL-based detection
- Routes to specialized Mandi Bot; if rejected → falls back to general news

**GIST Algorithm — Diversity Selection (arXiv:2405.18754):**
- Tokenized word sets with stop-word filtering (Hindi + English)
- Jaccard similarity for near-duplicate detection (threshold: 0.3)
- Utility scoring (base=5, +2 local relevance, +2 hot topics, +1 urgency, -2 generic, capped 1-10)
- Category-wise selection with per-category quotas

**Three-Layer Duplicate Detection:**
1. **Database** — Exact sourceUrl match (O(1))
2. **Topic Cache** — Jaccard similarity with entity boost (+0.2 shared location+incident, +0.1 single entity), threshold 0.40
3. **AI Semantic** — LLM compares against past 6 hours of headlines in prompt context

**Multi-Modal Output Pipeline:**
- Text → Structured article with headline, content, tags, category
- Image → AI (FLUX.1-schnell) → Stock → Card → Default fallback
- Audio → Gemini TTS → ElevenLabs (10 key fallback) → Cloudinary
- Video → Satori (JSX→SVG) → Resvg (SVG→PNG) → Sharp (compositing)
- Push → FCM with category targeting + dual delivery

---

## 🔴 3. Platform Engineering / Infrastructure

### Zapier Requires:
> "Building shared services, internal platforms, or reusable developer tooling"
> "Creating strong abstractions, reducing duplication, improving standards"
> "Experience with cloud infrastructure technologies"

### DailyDhandora Implements (MATCH ✅):

**Shared Service Abstractions:**
- `db-service.js` — Unified CRUD layer with retry logic, batch operations, duplicate check
- `ai-writer.js` — Single entry point for ALL LLM calls with transparent multi-model routing
- `push-notification.js` — Category-filtered push with stale token cleanup
- `logger.js` — Structured logging with 5 severity levels, 9 error categories, API timing
- `image-gen.js` — Smart fallback pipeline (AI → Stock → Card → Default)

**Developer Tooling:**
- Admin Dashboard with AI Brain (PromptEditor), Bot Controls, Analytics
- Quick Actions: Publish All Drafts, Generate Audio, Clear Old Drafts, Force Bot Run
- Bot Status Panel with live heartbeat monitoring
- 3-state Bot Mode: auto / manual / off
- Toggle switches: Image Gen, AI Images, Audio Gen, Paid Audio

**Platform Standards:**
- Consistent error handling pattern (graceful degradation, return null on failure)
- Non-blocking design (image/audio failure doesn't block article save)
- Exponential backoff retry (1s → 2s → 4s)
- API timeouts via Promise.race with setTimeout

**Cloud Infrastructure:**
- Firebase/Firestore (NoSQL document DB, real-time listeners, batched writes)
- Firebase Admin SDK (server-side, service account auth)
- Firebase Cloud Messaging (push notification delivery)
- Cloudinary (audio file hosting, CDN)
- Gemini API / Groq API (multi-provider LLM access)
- HuggingFace Inference API (image generation)
- ImgBB (image hosting)
- Render (deployment, auto-deploy on git push)

**Configuration Management:**
- Environment variable-based config (.env.local for dev, Render env vars for prod)
- Firestore-based settings (bot mode, toggle switches)
- Firestore-based prompts (editable without redeploy)
- Graceful Firebase init with null fallback

---

## 🔴 4. Developer Experience

### Zapier Requires:
> "Building reusable developer tooling that enables other teams to move faster"
> "Strong abstractions that are both powerful and easy to adopt"
> "You think deeply about developer experience"

### DailyDhandora Implements (MATCH ✅):

**Clean Abstractions:**
```javascript
// Single function — 3 providers, 18 models, 36 attempts transparently handled
const article = await aiWriter.writeArticle(prompt);

// Single function — 5 fallback strategies transparently handled
const image = await getImageWithFallback(category, headline, content);

// Single function — category routing, push, token management, stale cleanup
await notifyNewArticle({ headline, id, imageUrl, category });
```

**Self-Healing Systems:**
- Mutex lock prevents concurrent bot execution on limited RAM
- Watchdog force-restarts stuck bots (tolerance = interval + 15 min)
- try/finally guarantees mutex release even on crash
- Garbage collection hint before each bot run

**Observability Built-In:**
- Structured JSON logger with 9 error categories
- API call timing (start time, duration, success/failure)
- Retry logging (operation, attempt, max, delay)
- Memory usage tracking (RSS, heap, external)
- Service-specific loggers via `getLogger(serviceName)`

**Developer Guardrails:**
- Category validation with fuzzy matching + safety overrides
- Content sanitization (removes rival source names)
- Audio text sanitization (removes HTML, emoji, URLs, caps at 5000 chars)
- IP-based rate limiting for admin operations
- Constant-time password comparison for master operations
- 30-minute block after 5 failed master auth attempts

---

## 🔴 5. Observability / Monitoring

### Zapier Requires:
> "Observability, monitoring, evaluation, operational guardrails"

### DailyDhandora Implements (MATCH ✅):

**Multi-Level Monitoring:**
1. **Application Logs** — Structured JSON with timestamp, level, service, metadata
2. **Bot Heartbeat** — Per-bot lastRun timestamp tracked in-memory + Firestore
3. **Watchdog** — Polls every 5 minutes for overdue bots
4. **Bot Status Panel** — UI dashboard showing 4 bots, status, article counts, auto-refresh 60s
5. **Pulse Log** — Every 10 minutes: "All bots healthy" with current state

**Evaluation System:**
- GIST algorithm evaluates article utility (1-10 score) based on local relevance, timeliness, content quality
- Analytics tracks: views per article, category popularity, user sessions
- Intelligence dashboard shows 7-day traffic trends, category distribution, engagement metrics

**Production Monitoring:**
- Push notification sent/received tracking (success count, failure count, token cleanup)
- API error categorization (TIMEOUT, RATE_LIMIT, NETWORK, API, DATABASE, CONFIG)
- Memory/resource logging
- Health check endpoint (/health)

**Analytics Pipeline:**
- Privacy-preserving (no PII collected)
- Session deduplication (30-min window)
- New vs returning user tracking
- Bounce rate, time spent
- Category-specific intelligence: mandi crop popularity, exam trends, scheme intent
- Firestore atomic increments for aggregate counters

---

## 📊 Summary — How DailyDhandora Matches Each Requirement

| Zapier Requirement | Project Evidence | Match |
|---|---|---|
| 7+ years software engineering | Full-stack Node.js/Next.js, multiple services, production deployment | ✅ |
| 3+ years distributed ML/AI systems | Multi-provider LLM pipeline, GIST algo, 3-layer dedup | ✅✅ |
| 2+ years LLM Ops / ML Ops | Model fallback, rate limiting, prompt management, evaluation | ✅✅✅ |
| Shared services / internal platforms | db-service, ai-writer, push-notification, logger abstractions | ✅✅ |
| Full lifecycle ML/LLM architect | Scrape → Process → Store → Publish → Notify → Monitor | ✅✅✅ |
| Document trade-offs | Multi-model hierarchy balances cost, speed, reliability | ✅ |
| Cloud infrastructure | Firebase, Render, Cloudinary, Gemini, Groq, HuggingFace | ✅ |
| Enabling others / developer experience | Clean single-function APIs, self-healing, guardrails | ✅ |
| TypeScript/Python | Node.js (TypeScript via Next.js), Python-adjacent patterns | ✅ |

## 🎯 Your Key Talking Points for the Interview

1. **"I built a production LLM Ops system with 3 providers, 18 models, and 36 retry paths — all behind a single function call."**
2. **"I implemented a diversity algorithm (GIST) inspired by Google Research for optimal content selection."**
3. **"My system self-heals: watchdog force-restarts stuck services, stale tokens auto-clean, rate limits auto-reset."**
4. **"Full observability: structured logging, bot heartbeat monitoring, analytics dashboard, error categorization."**
5. **"Every component has fallbacks: scraping (Cheerio→Jina), images (AI→Stock→Card→Default), audio (Gemini→ElevenLabs×10)."**
6. **"I built a shared service layer that makes adding new bots or data sources a matter of hours, not days."**