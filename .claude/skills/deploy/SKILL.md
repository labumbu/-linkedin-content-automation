# /deploy

Run pre-deploy checks before pushing to Vercel.

## Steps

1. **Check for console.log in production code**
   - Search `app/` and `lib/` for `console.log` (excluding `console.error`)
   - Report any found with file + line number
   - `console.error` is fine to leave

2. **Check for hardcoded secrets or env vars**
   - Search for patterns like `sk-`, `Bearer `, hardcoded URLs containing API keys
   - Check that no `.env.local` values appear literally in source files

3. **Run TypeScript build**
   - Run `npm run build` in the project directory
   - Report any TypeScript errors
   - If build succeeds, confirm it's safe to push

## Output format

```
Pre-deploy check results:
✓ No console.log found
✓ No hardcoded secrets found
✗ Build failed — 2 TypeScript errors:
  - app/api/generate/route.ts:54 — ...
  - components/post-card.tsx:12 — ...
```

Do not push. Only report results. The user will decide whether to push.
