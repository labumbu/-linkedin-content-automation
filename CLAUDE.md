# Harvey Content Fabric

AI-powered LinkedIn content generation tool for B2B sales teams. Fetches trending topics, generates Harvey-voiced posts in EN/RU, saves to history.

## Stack

- **Framework**: Next.js 16 (Turbopack), TypeScript
- **UI**: Tailwind CSS v4, Shadcn UI
- **AI**: Anthropic Claude (`claude-sonnet-4-5`) — trends via `web_search` tool, post generation with streaming
- **Data**: Supabase (posts, trends, settings, knowledge base)
- **Deploy**: Vercel

## Project Structure

```
app/
  page.tsx                  # Dashboard — fetches & displays trends
  generate/page.tsx         # Post generator with streaming
  history/page.tsx          # Saved posts (server component)
  settings/page.tsx         # Brand, topics, knowledge base config
  api/
    trends/route.ts         # GET — web search + Reddit trends via Claude
    generate/route.ts       # POST — streaming post generation
    settings/route.ts       # GET/PUT — app settings
    knowledge/route.ts      # POST/GET — add PDF or URL to knowledge base
    knowledge/[id]/route.ts # DELETE — remove knowledge base item

components/
  trend-card.tsx            # Trend card with engagement metrics
  post-card.tsx             # Generated post with copy + feedback
  navigation.tsx            # Top nav
  copy-button.tsx           # Reusable clipboard button
  refresh-button.tsx        # Client-side router.refresh()
  delete-post-button.tsx    # Deletes post from Supabase
  ui/                       # Shadcn UI components

lib/
  types.ts                  # Shared TypeScript types
  utils.ts                  # cn() helper
  reddit.ts                 # Reddit public JSON API fetcher
  settings.ts               # Settings + knowledge base helpers, buildSystemPrompt()
  supabase/
    client.ts               # Supabase client
    schema.sql              # Full DB schema
```

## Environment Variables

```
ANTHROPIC_API_KEY=          # console.anthropic.com
NEXT_PUBLIC_SUPABASE_URL=   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
```

## Database Schema (Supabase)

- **posts** — generated LinkedIn posts with metadata, feedback, character count
- **trends** — fetched trend signals with source, velocity, engagement metrics
- **settings** — singleton row (id=1): harvey_profile, icp, voice_rules, topic_clusters[], competitors[]
- **knowledge_base** — uploaded PDFs and URLs with extracted text content

## Key Behaviours

- **Trends**: web search (Claude web_search tool) + Reddit public API run in parallel. Reddit requires no credentials.
- **Generation**: Claude streams posts one by one (400ms apart). Each post saved to Supabase with dbId returned in stream.
- **Settings**: all hardcoded prompts replaced by DB values. `buildSystemPrompt()` in `lib/settings.ts` assembles the final system prompt from harvey_profile + icp + voice_rules + knowledge base items.
- **Knowledge base**: PDFs sent as base64 document blocks to Claude for extraction. URLs fetched and HTML-stripped.
- **Feedback**: thumbs up/down on PostCard writes directly to Supabase from browser client.

## Development

```bash
npm install
npm run dev
```
