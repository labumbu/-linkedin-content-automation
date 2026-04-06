---
paths:
  - "app/api/**/*.ts"
---

# API Route Rules

## Provider pattern (mandatory)
Every route that calls AI must:
1. Load settings: `const settings = await getSettings()`
2. Resolve provider: `const provider = resolveProvider(settings?.ai_provider as AIProvider)`
3. Call `lib/ai/index.ts` functions with the resolved provider
Never hardcode "anthropic" or "openai" in a route. Never use `?? "anthropic"` — use `resolveProvider()` from `lib/ai`, which falls back based on which API key is actually set in the environment.

## Error handling
- Always wrap the main logic in try/catch
- Return `NextResponse.json({ error: "..." }, { status: 500 })` on failure
- Log errors with `console.error("Route name error:", error)`
- Never return raw error objects or stack traces to the client

## Response shape
- Success: return the data directly or `{ success: true }` for mutations
- Error: always `{ error: string }` with appropriate HTTP status code
- 400 = bad input, 401 = unauthorized, 404 = not found, 500 = server error

## Supabase
- Use `import { supabase } from "@/lib/supabase/client"`
- Always handle `{ data, error }` destructuring — check error before using data
- Never expose Supabase error details to the client

## New routes checklist
- [ ] Provider loaded from settings
- [ ] try/catch with proper error response
- [ ] No hardcoded provider
- [ ] Input validated before use
