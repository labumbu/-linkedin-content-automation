# Harvey Content Fabric

AI-powered LinkedIn content and social engagement tool for B2B sales teams.

## Features

- **Trend Discovery** — daily web search + Reddit scan for trending topics in your niche, filtered by source
- **Post Generation** — stream multiple LinkedIn posts per trend with tone, size, and humanity-level controls
- **Carousel Format** — generate 7-slide LinkedIn document posts (hook + 5 content + CTA), avg 6.6% engagement vs 2% for text
- **Post Scorer** — AI quality analysis on 4 dimensions: hook strength, dwell time, comment magnet, algorithm fit
- **Hook Variants** — 3 alternative first-line hooks per post (statistic / contrarian / pattern-interrupt)
- **CTA Analyzer** — flags generic CTAs and suggests specific question-based alternatives for 15+ word replies
- **Comment Generator** — Reddit and LinkedIn comments using PRD-compliant archetypes; AI highlights best fit
- **Reddit Post Finder** — search B2B subreddits for high-engagement threads, click to pre-fill comment generator
- **Voice Learning** — your own saved posts (source="own") inject as voice examples; curated posts inject as structural templates
- **Research** — summarize URLs and PDFs, write data-driven posts from research notes
- **Examples Library** — curated post library with AI-extracted metadata (hook type, why it works, engagement tier)
- **Knowledge Base** — upload PDFs and URLs to inject company context into every generation
- **Post History** — all generated posts saved with thumbs up/down feedback
- **Comment History** — all saved comments browsable by platform
- **Dual AI Provider** — switch between Anthropic Claude (`claude-sonnet-4-6`) and OpenAI (`gpt-4o`) in Settings

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (Turbopack), TypeScript |
| UI | Tailwind CSS v4, Shadcn UI |
| AI | Anthropic `claude-sonnet-4-6` or OpenAI `gpt-4o` |
| Database | Supabase (PostgreSQL), RLS enabled |
| Deploy | Vercel + cron job for daily trend refresh |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/labumbu/-linkedin-content-automation
cd linkedin-content-automation
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# AI providers — at least one required
ANTHROPIC_API_KEY=          # console.anthropic.com
OPENAI_API_KEY=             # platform.openai.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=   # your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Cron security
CRON_SECRET=                # any random string
```

> **Never run `vercel env pull`** — it overwrites `.env.local` and wipes local-only keys.

### 3. Supabase database

Run the schema in your Supabase SQL Editor:

```
lib/supabase/schema.sql
```

### 4. Run locally

```bash
npm run dev     # http://localhost:3000
npm run build   # full TypeScript check before pushing
```

## Project Structure

```
app/
  page.tsx                  # Dashboard — trends with source filter + content accessibility badge
  generate/page.tsx         # Post generator (streaming) — text + carousel formats
  comments/page.tsx         # Reddit + LinkedIn comment generator + Find Threads + history
  research/page.tsx         # Summarize URLs/PDFs + write from research notes
  history/page.tsx          # Saved posts
  settings/page.tsx         # Brand, Topics, Sources, Knowledge Base, Examples, System Prompt

components/
  post-card.tsx             # Generated post — copy, feedback, hook alternatives, CTA note, scorer
  carousel-card.tsx         # Carousel post — slide viewer with nav dots, per-slide copy, caption

lib/
  ai/index.ts               # Provider router — all AI calls go through here
  settings.ts               # Settings helpers + system prompt builder with voice learning
  schemas.ts                # Zod validation schemas
  rate-limit.ts             # In-memory rate limiter
  html.ts                   # Shared HTML stripping utility
```

## Post Generation Formats

| Format | Characters | Use case |
|--------|-----------|---------|
| Short | 400–600 | Quick punchy takes |
| Medium | 700–1,300 | Research sweet spot |
| Long | 1,200–1,600 | Full story + data |
| Carousel | 7 slides | Highest engagement format — avg 6.6% vs 2% for text |

## Voice Learning

The examples library (Settings → Examples) separates your own posts from curated ones:

- **source = "own"** → injected first as "YOUR OWN VOICE — match this exact writing style"
- **source = "curated"** → injected after as "STRUCTURAL TEMPLATES — study these patterns"

Up to 8 examples total per generation call. Tone-matching prioritized within each group.

## Post Scorer

Click the bar chart icon (📊) on any generated post to get an AI quality score:

| Dimension | Max | What it measures |
|-----------|-----|-----------------|
| Hook strength | 25 | First-line impact — specific, pattern-interrupting |
| Dwell time | 25 | Readability, white space, reading level |
| Comment magnet | 25 | Closing question specificity and reply-chain potential |
| Algorithm fit | 25 | Hashtag count, character range, no engagement bait |

## Cron Job

Trends refresh daily at 06:00 UTC. Configured in `vercel.json`. The endpoint `/api/cron/trends` is secured with the `CRON_SECRET` header.

To trigger manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/trends
```

## AI Provider Pattern

Every API route that calls AI follows this pattern — never hardcode a provider:

```ts
import { resolveProvider, AIProvider } from "@/lib/ai"
const settings = await getSettings()
const provider = resolveProvider(settings?.ai_provider as AIProvider)
// pass provider to lib/ai/index.ts functions
```

`resolveProvider()` checks which API keys are set and falls back gracefully.
