# LuaLock

LuaLock is a Vercel-ready Next.js starter for protecting, deploying, and managing Lua/Luau scripts. The dashboard UI is functional locally with project creation, search, protection configuration, activity visualization, and responsive layout.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

Run `supabase/schema.sql` in the Supabase SQL editor. Then add these environment variables to `.env.local` and Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
MOPSFL_API_KEY=optional-server-side-key
```

The schema includes projects, deployments, protection jobs, and API-key storage with row-level security. The dashboard uses Supabase Auth and reads/writes projects for the signed-in user. If Supabase variables are missing, the app shows a setup message instead of pretending that accounts or projects were saved.

## mopsfl integration

The public API collection documents the GoofyLuaUglifier endpoint:

```text
POST https://goofyluauglifier.mopsfl.de/v1/api/uglify/{method}
```

Send Lua source as the raw request body and JSON protection settings in the `uglifier-options` header. Keep any API key server-side; do not expose it in client code. The `/api/protect` route validates the signed-in user, calls mopsfl server-side, and returns protected output. Add a project id to persist protection jobs and protected code as you expand the pipeline.

The “stop bypassing” feature should be implemented as an authorization and integrity layer for scripts you own: signed releases, environment checks, deployment revocation, and telemetry. Do not rely on client-side obfuscation alone for secrets or access control.

## Deploy to Vercel

Import this repository into Vercel, set the environment variables above, and deploy. Supabase remains the hosted database and authentication provider.
