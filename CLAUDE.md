# Harvey Content Fabric

AI-powered LinkedIn content generation and social engagement tool for B2B sales teams. Fetches trending topics, generates Harvey-voiced LinkedIn posts, generates Reddit and LinkedIn comments, and supports content research.

## Stack

- **Framework**: Next.js 16 (Turbopack), TypeScript
- **UI**: Tailwind CSS v4, Shadcn UI
- **AI**: Dual-provider — Anthropic Claude (`claude-sonnet-4-5`) or OpenAI (`gpt-4o`), switchable in Settings
  - Trends: web search via provider's search tool
  - Post/comment generation: chat completions
  - PDF extraction: document blocks (Anthropic) or file input (OpenAI)
- **Data**: Supabase (PostgreSQL) — all tables have RLS enabled
- **Deploy**: Vercel (includes cron job for daily trend refresh)

## Project Structure

```
app/
  page.tsx                        # Dashboard — fetches & displays trends with source filter
  generate/page.tsx               # Post generator with tone/size/humanity controls + streaming
  comments/page.tsx               # Reddit + LinkedIn comment generator with history
  research/page.tsx               # Summarize URLs/PDFs + Write Post from personal experience
  history/page.tsx                # Saved posts (server component)
  settings/page.tsx               # Brand, Topics, News Sources, Knowledge Base, System Prompt tabs
  layout.tsx
  globals.css
  api/
    trends/route.ts               # GET — fetch trends (web search + Reddit), cached 23h, ?force=true
    generate/route.ts             # POST — streaming post generation (NDJSON, one post per line)
    comments/
      reddit/route.ts             # POST — generate Reddit comment (5 archetypes, PRD compliance)
      linkedin/route.ts           # POST — generate LinkedIn comment (6 archetypes, PRD compliance)
    research/
      run/route.ts                # POST — 5-stage research pipeline (streaming NDJSON)
      summarize/route.ts          # POST — summarize URL or PDF
      post/route.ts               # POST — write LinkedIn post from personal experience
    settings/
      route.ts                    # GET/PUT — app settings (singleton row id=1)
      prompt/route.ts             # GET/POST — assembled system prompt (GET=cached, POST=rebuild)
    knowledge/
      route.ts                    # POST (add URL or PDF) / GET (list all items)
      [id]/route.ts               # DELETE — remove knowledge base item
    cron/
      trends/route.ts             # GET — daily trend refresh (secured with CRON_SECRET header)

components/
  trend-card.tsx                  # Trend card — source link, Reddit comment button, found_at date
  post-card.tsx                   # Generated post — copy, feedback buttons
  navigation.tsx                  # Top nav (Dashboard, Generate Posts, Research, Comments, History, Settings)
  trend-card-skeleton.tsx         # Loading skeleton for trend cards
  ResearchProgressBar.tsx         # 5-stage research progress indicator
  ReportViewer.tsx                # Research report renderer
  copy-button.tsx                 # Reusable clipboard button
  refresh-button.tsx              # Client-side router.refresh()
  delete-post-button.tsx          # Deletes post from Supabase
  ui/                             # Shadcn UI components

lib/
  types.ts                        # Shared TypeScript types (Trend, GeneratedPost, Tone, PostSize, etc.)
  utils.ts                        # cn() helper
  reddit.ts                       # Reddit public JSON API fetcher (may return 0 posts — server IPs blocked)
  settings.ts                     # Settings + knowledge base helpers, buildSystemPrompt(), prompt cache
  supabase/
    client.ts                     # Supabase browser client
    schema.sql                    # DB schema reference
  ai/
    index.ts                      # Provider router — resolveProvider(), exports all AI functions
    anthropic.ts                  # Anthropic implementations (web search, generate, PDF extract, Reddit)
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
- **settings** — singleton row (id=1): harvey_profile, icp, voice_rules, topic_clusters[], competitors[], ai_provider, trend_sources[], trend_refresh_time
- **knowledge_base** — uploaded PDFs and URLs: name, type ('pdf'|'url'), source_url, content (extracted text), created_at
- **comments** — generated comments: platform ('reddit'|'linkedin'), archetype, original_content, generated_comment, word_count, trend_title, created_at
- **source_cache** — scraped web content cache: url, content, content_hash, scraped_at (6h TTL)

## Key Behaviours

- **Provider selection**: `settings.ai_provider` ('anthropic' | 'openai') controls which provider is used everywhere. Every API route loads settings and passes provider to `lib/ai/index.ts` functions.
- **Trends**: Web search runs via provider's search tool. Reddit public API often returns 0 posts (403 blocked from server IPs). Trends cached 23h in DB; `?force=true` bypasses cache.
- **Post generation**: Streams NDJSON (one JSON object per line, 400ms apart). Each post saved to Supabase mid-stream, `dbId` returned in stream.
- **Comment generation**: Reddit uses 5 PRD archetypes + compliance rules. LinkedIn uses 6 PRD archetypes + compliance rules. Both return recommended archetype (★).
- **System prompt**: Assembled from harvey_profile + icp + voice_rules + top 5 knowledge items (1500 char each) via `buildSystemPrompt()`. Cached in module-level variable; invalidated on Settings save.
- **Knowledge base**: PDFs sent as base64 document blocks to AI for extraction. URLs fetched and HTML-stripped.
- **Cron**: `vercel.json` schedules `/api/cron/trends` at 06:00 UTC (09:00 Moscow) daily. Respects `trend_refresh_time` setting (±30min window).

## AI Provider Pattern

Every route that calls AI follows this pattern:
```ts
const settings = await getSettings()
const provider: AIProvider = (settings?.ai_provider as AIProvider) ?? "anthropic"
// then call lib/ai/index.ts functions with provider
```

Never assume a single provider. Both must produce equivalent output.

## Dual-Provider AI Functions (lib/ai/index.ts)

- `fetchWebSearchTrends(topicClusters, provider)` — web search for trends
- `analyzeRedditTrends(posts, provider)` — analyze Reddit posts into trends
- `generatePosts(systemPrompt, userPrompt, provider)` — generate LinkedIn posts
- `extractPdf(file, provider)` — extract text from PDF

## Development

```bash
npm install
npm run dev       # Turbopack dev server at http://localhost:3000
npm run build     # Full TypeScript build — run before pushing to catch type errors
```

**Important:** Never run `vercel env pull` — it overwrites `.env.local` and wipes local-only keys.
