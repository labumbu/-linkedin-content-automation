# Harvey Content Fabric

AI-powered LinkedIn content generation and social engagement tool for B2B sales teams. Fetches trending topics, generates Harvey-voiced LinkedIn posts, generates Reddit and LinkedIn comments, and supports content research.

## Stack

- **Framework**: Next.js 16 (Turbopack), TypeScript
- **UI**: Tailwind CSS v4, Shadcn UI
- **AI**: Dual-provider — Anthropic Claude (`claude-sonnet-4-6`) or OpenAI (`gpt-4o`), switchable in Settings
  - Trends: web search via provider's search tool
  - Post/comment generation: chat completions
  - PDF extraction: document blocks (Anthropic) or file input (OpenAI)
  - Post scoring: `/api/generate/score` — quality analysis on 4 dimensions
- **Data**: Supabase (PostgreSQL) — all tables have RLS enabled
- **Deploy**: Vercel (includes cron job for daily trend refresh)

## Project Structure

```
app/
  page.tsx                        # Dashboard — fetches & displays trends with source filter
  generate/page.tsx               # Post generator with tone/size/humanity controls + streaming; Carousel format
  comments/page.tsx               # Reddit + LinkedIn comment generator + Find Threads tab + history
  research/page.tsx               # News Digest (default tab) + Summarize URLs/PDFs + Write Post
  history/page.tsx                # Saved posts (server component)
  settings/page.tsx               # Brand, Topics, News Sources, Knowledge Base, Examples, System Prompt tabs
  layout.tsx
  globals.css
  api/
    trends/route.ts               # GET — fetch trends (web search + Reddit), cached 23h, ?force=true
    generate/
      route.ts                    # POST — streaming post generation (NDJSON, one post per line); Carousel format
      score/route.ts              # POST — AI post quality scorer (hook, dwell, comment magnet, algorithm fit)
    comments/
      reddit/route.ts             # POST — generate Reddit comment (5 archetypes, PRD compliance, authenticity rules)
      linkedin/route.ts           # POST — generate LinkedIn comment (6 archetypes, PRD compliance)
      route.ts                    # GET — list saved comments
    reddit/
      search/route.ts             # POST — search B2B subreddits for threads to comment on
    digest/
      route.ts                    # GET — streaming weekly digest (NDJSON); queries last 7 days of trends, 3 parallel AI calls; rate-limited 3/min
      pdf/route.tsx               # POST — 5-page A4 digest PDF (Cover/Web/Reddit/Harvey/Sources); 4 themes; rate-limited 5/min
    research/
      run/route.ts                # POST — 5-stage research pipeline (streaming NDJSON)
      summarize/route.ts          # POST — summarize URL or PDF
      post/route.ts               # POST — write LinkedIn post from research notes
    settings/
      route.ts                    # GET/PUT — app settings (singleton row id=1)
      prompt/route.ts             # GET/POST — assembled system prompt (GET=cached, POST=rebuild)
    knowledge/
      route.ts                    # POST (add URL or PDF) / GET (list all items)
      [id]/route.ts               # DELETE — remove knowledge base item
    examples/
      route.ts                    # GET/POST — list/create post examples
      [id]/route.ts               # DELETE/PATCH — delete or update an example
      extract/route.ts            # POST — AI metadata extraction (hook_text, hook_type, why_it_works, etc.)
      backfill/route.ts           # GET — one-time backfill (if pgvector enabled)
    cron/
      trends/route.ts             # GET — daily trend refresh (secured with CRON_SECRET header)

components/
  trend-card.tsx                  # Trend card — source link, content accessibility badge, Reddit comment button
  post-card.tsx                   # Generated post — copy, feedback, hook alternatives, CTA note, post scorer
  carousel-card.tsx               # Carousel post — slide-by-slide viewer with nav dots and caption copy
  navigation.tsx                  # Top nav
  trend-card-skeleton.tsx         # Loading skeleton for trend cards
  ResearchProgressBar.tsx         # 5-stage research progress indicator
  ReportViewer.tsx                # Research report renderer
  copy-button.tsx                 # Reusable clipboard button
  refresh-button.tsx              # Client-side router.refresh()
  delete-post-button.tsx          # Deletes post from Supabase
  ui/                             # Shadcn UI components

lib/
  types.ts                        # Shared TypeScript types (Trend, GeneratedPost, CarouselSlide, Tone, PostSize, etc.)
  utils.ts                        # cn() helper
  reddit.ts                       # Reddit public JSON API fetcher
  settings.ts                     # Settings + knowledge base helpers, buildSystemPrompt() with voice learning
  schemas.ts                      # Zod validation schemas
  rate-limit.ts                   # In-memory rate limiter
  html.ts                         # Shared HTML stripping utility
  supabase/
    client.ts                     # Supabase browser client
    schema.sql                    # DB schema reference
  ai/
    index.ts                      # Provider router — resolveProvider(), exports all AI functions
    anthropic.ts                  # Anthropic implementations (claude-sonnet-4-6, web search, generate, PDF, Reddit)
    openai.ts                     # OpenAI implementations (Responses API, web_search_preview tool)
  research-types.ts               # TypeScript types for research pipeline
  research-prompts.ts             # Prompt constants for research pipeline
```

## Environment Variables

```
ANTHROPIC_API_KEY=          # console.anthropic.com — required if using Anthropic provider
OPENAI_API_KEY=             # platform.openai.com — required if using OpenAI provider
NEXT_PUBLIC_SUPABASE_URL=   # Supabase project URL (ends in .supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
CRON_SECRET=                # Any random string — used to secure /api/cron/trends endpoint
```

## Database Schema (Supabase) — RLS enabled on all tables

- **posts** — generated LinkedIn posts: content, character_count, trend_title, trend_summary, language, tone, feedback ('up'|'down'|null)
- **trends** — fetched trend signals: title, summary, source, relevance_score, velocity, upvotes, comments, source_url, found_at
- **settings** — singleton row (id=1): harvey_profile, icp, voice_rules, topic_clusters[], competitors[], ai_provider, trend_sources[], trend_refresh_time, subreddits[]
- **knowledge_base** — uploaded PDFs and URLs: name, type ('pdf'|'url'), source_url, content (extracted text), created_at
- **comments** — generated comments: platform ('reddit'|'linkedin'), archetype, original_content, generated_comment, word_count, trend_title, created_at
- **source_cache** — scraped web content cache: url, content, content_hash, scraped_at (6h TTL)
- **post_examples** — curated example posts: content, hook_text, hook_type, tone, format, char_count, hashtag_count, reactions, comments, reposts, views, media_type, source_url, engagement_tier (auto), why_it_works, topic_tags, source ('own'|'curated'), active

## Key Behaviours

- **Provider selection**: `settings.ai_provider` ('anthropic' | 'openai') controls which provider is used everywhere. Every API route loads settings and passes provider to `lib/ai/index.ts` functions. Model: `claude-sonnet-4-6` (Anthropic), `gpt-4o` (OpenAI).
- **Trends**: Web search runs via provider's search tool. Anthropic URLs extracted from `web_search_tool_result` content blocks (not text blocks). Reddit public API often returns 0 posts (403 blocked from server IPs). Trends cached 23h in DB; `?force=true` bypasses cache. `saveTrends()` deduplicates within-batch only.
- **Post generation**: Streams NDJSON (one JSON object per line, 400ms apart). Each post saved to Supabase mid-stream, `dbId` returned in stream. Returns `hookAlternatives` (3 swappable first lines) and `ctaNote` (CTA quality evaluation) per post.
- **Carousel format**: PostSize "Carousel" triggers a different prompt — generates 7 slides (hook + 5 content + CTA) + companion caption. Response includes `format: "carousel"` and `slides[]` array. Rendered by `CarouselCard` component.
- **Post scorer**: `POST /api/generate/score` — sends post content to AI, returns 4 dimension scores (0–25 each): hookStrength, dwellTime, commentMagnet, algorithmFit. `BarChart2` icon on each PostCard triggers it.
- **News Digest**: `GET /api/digest` streams a weekly market intelligence report. Queries Supabase trends for last 7 days, splits into web + Reddit, runs 3 parallel AI calls (web synthesis, Reddit pulse, Harvey angle), then a 4th for a LinkedIn post. Streams NDJSON progress + final `DigestResult`. `POST /api/digest/pdf` generates a 5-page A4 PDF with 4 themes (Dark/Light/Navy/Forest). LinkedIn post is plain text only — NOT included in PDF.
- **Voice learning**: `buildSystemPrompt()` separates examples by source. `source="own"` posts inject first as "YOUR OWN VOICE — match this exact writing style". `source="curated"` posts inject after as "STRUCTURAL TEMPLATES". Own: up to 4 (tone-prioritized). Combined budget: 8 total.
- **Examples injection**: `getPostExamples()` returns all active examples ordered by reactions DESC. `buildSystemPrompt(settings, knowledgeItems, tone?)` injects up to 8 (5 own tone-match + 3 curated).
- **Comment generation**: Reddit uses 5 PRD archetypes + compliance rules + authenticity rules (no AI-sounding patterns). LinkedIn uses 6 PRD archetypes. Both return recommended archetype (★).
- **Reddit post finder**: `POST /api/reddit/search` searches 9 B2B subreddits via Reddit public search API. Results sorted by comment opportunity (comments weighted 2×). "Comment" button pre-fills the Reddit generator.
- **System prompt**: Assembled from harvey_profile + icp + voice_rules + top knowledge items (4000 char each, 10 items max, 20K total budget) + own voice examples + curated templates. Cached in module-level variable; invalidated on Settings save.
- **Knowledge base**: PDFs sent as base64 document blocks to AI for extraction. URLs fetched and HTML-stripped.
- **Cron**: `vercel.json` schedules `/api/cron/trends` at 06:00 UTC (09:00 Moscow) daily. Respects `trend_refresh_time` setting (±30min window).
- **Content accessibility badge**: Trend cards show ✓ Full content / 🔒 Blocked / 🔍 No direct link. Known blocked domains: mckinsey.com, gartner.com, forrester.com, hbr.org, wsj.com.

## AI Provider Pattern

Every route that calls AI follows this pattern:
```ts
import { resolveProvider, AIProvider } from "@/lib/ai"
const settings = await getSettings()
const provider = resolveProvider(settings?.ai_provider as AIProvider)
// then call lib/ai/index.ts functions with provider
```

`resolveProvider()` checks which API keys are actually set and falls back gracefully — never hardcode `?? "anthropic"`. Never assume a single provider. Both must produce equivalent output.

## Dual-Provider AI Functions (lib/ai/index.ts)

- `fetchWebSearchTrends(topicClusters, provider)` — web search for trends
- `analyzeRedditTrends(posts, provider)` — analyze Reddit posts into trends
- `generatePosts(systemPrompt, userPrompt, provider)` — generate LinkedIn posts / score posts
- `extractPdf(file, provider)` — extract text from PDF

## Development

```bash
npm install
npm run dev       # Turbopack dev server at http://localhost:3000
npm run build     # Full TypeScript build — run before pushing to catch type errors
```

**Important:** Never run `vercel env pull` — it overwrites `.env.local` and wipes local-only keys.
