---
paths:
  - "components/**/*.tsx"
  - "app/**/*.tsx"
---

# Component Rules

## Client vs Server
- Default to Server Components — no "use client" unless needed
- Add "use client" only when using: useState, useEffect, useRouter, useSearchParams, event handlers, browser APIs
- Pages that use useSearchParams must be wrapped in <Suspense>

## Styling
- Use Tailwind utility classes only — no inline styles
- Use `cn()` from `lib/utils` for conditional class merging
- Use Shadcn UI components from `components/ui/` — don't reinvent buttons, inputs, cards
- Dark theme: use semantic tokens (bg-card, text-foreground, text-muted-foreground, border-border) not hardcoded colors

## State & data fetching
- Server components: fetch directly from Supabase or lib/ helpers
- Client components: fetch via `/api/` routes using fetch()
- Show loading states for all async operations (Loader2 spinner from lucide-react)
- Show empty states when lists are empty — don't render nothing

## Props
- Always define explicit TypeScript interfaces for props
- Don't use `any` — if type is unknown, use `unknown` and narrow it

## Do not
- Don't add useEffect for data that can be fetched server-side
- Don't duplicate Shadcn components — always import from components/ui/
- Don't use hardcoded colors like text-gray-500 — use text-muted-foreground
