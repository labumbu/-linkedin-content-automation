# Harvey Content Fabric

AI-powered LinkedIn content and social engagement tool for B2B sales teams.

## Features

- **Trend Discovery** — daily web search for trending topics in your niche, filtered by source (Web, Reddit, LinkedIn, Twitter)
- **Post Generation** — stream multiple LinkedIn posts per trend with tone, size, and humanity-level controls
- **Comment Generator** — generate Reddit and LinkedIn comments using PRD-compliant archetypes; AI highlights the best fit
- **Research** — summarize URLs and PDFs, or write a post from personal experience
- **Knowledge Base** — upload PDFs and URLs to inject company context into every generation
- **Post History** — all generated posts saved with thumbs up/down feedback
- **Comment History** — all saved comments browsable by platform
- **Dual AI Provider** — switch between Anthropic Claude and OpenAI in Settings; both produce equivalent output

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (Turbopack), TypeScript |
| UI | Tailwind CSS v4, Shadcn UI |
| AI | Anthropic `claude-sonnet-4-5` or OpenAI `gpt-4o` |
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
  page.tsx                  # Dashboard — trends with source filter
  generate/page.tsx         # Post generator (streaming)
  comments/page.tsx         # Reddit + LinkedIn comment generator + history
  research/page.tsx         # Summarize URLs/PDFs + write from experience
  history/page.tsx          # Saved posts
  settings/page.tsx         # Brand, Topics, Sources, Knowledge Base, System Prompt

lib/
  ai/index.ts               # Provider router — all AI calls go through here
  settings.ts               # Settings helpers + system prompt builder
  schemas.ts                # Zod validation schemas
  rate-limit.ts             # In-memory rate limiter
  html.ts                   # Shared HTML stripping utility
```

## Cron Job

Trends refresh daily at 06:00 UTC. Configured in `vercel.json`. The endpoint `/api/cron/trends` is secured with the `CRON_SECRET` header.

To trigger manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/trends
```

## AI Provider Pattern

Every API route that calls AI follows this pattern — never hardcode a provider:

```ts
const settings = await getSettings()
const provider: AIProvider = (settings?.ai_provider as AIProvider) ?? "anthropic"
// pass provider to lib/ai/index.ts functions
```
