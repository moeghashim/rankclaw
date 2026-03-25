---
summary: "Minimal Vercel deployment path for the default Next.js app workspace"
read_when:
  - Setting up the starter on Vercel for the first time.
  - Shipping changes from `apps/web`.
---

# Deploying To Vercel

Use Vercel Git integration as the default deployment path for this starter.

## Project Settings

- Framework preset: Next.js
- Root directory: `apps/web`
- Install command: `npm install`
- Build command: `npm run build`

## Environment Variables

Start with no extra environment variables unless your app adds them. Configure app-specific secrets in the Vercel project, scoped to `apps/web`.

## Solo Shipping Flow

1. Run `npm run check`
2. Run `npm test`
3. Run `npm run agent:check`
4. Push `main`
5. Let Vercel build and deploy `apps/web`

This starter does not require a custom `vercel.json`.
