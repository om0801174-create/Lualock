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
```

The schema includes projects, deployments, protection jobs, and API-key storage with row-level security. The dashboard uses Supabase Auth and reads/writes projects for the signed-in user. If Supabase variables are missing, the app shows a setup message instead of pretending that accounts or projects were saved.

## Nova obfuscator

Nova is LuaLock's built-in server-side obfuscation engine. It does not call an external provider or require an API key. The `/api/protect` route validates the signed-in user, runs Nova against the submitted source, and persists the protected result and job metadata in Supabase.

Nova supports three modes:

- `minify`: removes comments and unnecessary whitespace.
- `balanced`: minifies and encodes quoted string literals with `string.char`.
- `maximum`: balanced mode plus arithmetic expressions for safe integer literals.

Nova is designed for source transformation, not as a complete security boundary. Use signed releases, deployment revocation, environment checks, and telemetry for access control and leak response.

The “stop bypassing” feature should be implemented as an authorization and integrity layer for scripts you own: signed releases, environment checks, deployment revocation, and telemetry. Do not rely on client-side obfuscation alone for secrets or access control.

## Deploy to Vercel

Import this repository into Vercel, set the environment variables above, and deploy. Supabase remains the hosted database and authentication provider.
