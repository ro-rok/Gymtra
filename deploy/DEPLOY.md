# Gymtra production deploy (Vercel + Render)

Copy-paste env files:

| Platform | File |
|----------|------|
| **Vercel** (frontend) | [`vercel.env.production`](./vercel.env.production) |
| **Render** (backend) | [`render.env.production`](./render.env.production) |

## Order of operations

1. **MongoDB Atlas** — create cluster, database user, allow `0.0.0.0/0` (or Render outbound IPs), copy `MONGO_URI`.
2. **Render** — create Web Service from repo, root `backend`, start command below. Paste `render.env.production` and replace placeholders.
3. **Vercel** — import repo, root `frontend`, framework Vite. Paste `vercel.env.production` (leave `VITE_API_BASE_URL` empty for same-origin API proxy).
4. **Update Render** — set `FRONTEND_ORIGINS` and `PUBLIC_BASE_URL` to your final Vercel URL; redeploy API.
5. **Redeploy Vercel** — `frontend/vercel.json` rewrites `/api/*` to Render so auth cookies are first-party on the PWA domain.

## Render web service settings

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check path | `/health` |

**Render free tier:** The API self-pings `GET /api/keepalive` every 14 minutes when `RENDER` is set (automatic on Render). This prevents spin-down from idle timeouts. Super admins can verify last ping time on `/admin` (Platform Overview).

## Vercel project settings

| Setting | Value |
|---------|--------|
| Root directory | `frontend` (or repo root — root [`vercel.json`](../vercel.json) is provided as fallback) |
| Build command | `npm run build` (root deploy: uses `vercel.json` at repo root) |
| Output directory | `dist` |
| Install command | `npm ci` |

**Important:** After changing `vercel.json`, trigger a **new production deploy**. Without it, refresh on `/admin/settings` or `/:gymSlug/member` will still show Vercel’s `404: NOT_FOUND` page.

## Generate secrets (run locally)

```powershell
# JWT + QR secrets
openssl rand -hex 32

# VAPID keys for Web Push
npx web-push generate-vapid-keys
```

## Persistent login (PWA + browsers)

Production uses a **same-origin API proxy** so session cookies attach to your Vercel domain (required for iOS installed PWAs):

- [`frontend/vercel.json`](../frontend/vercel.json) — proxies `/api/:path*` to Render; other paths rewrite to `index.html` (fixes refresh 404 on `/admin/settings`, `/:gymSlug/member`, etc.)
- `VITE_API_BASE_URL` — **empty** in production (browser calls `/api/v1/...` on the Vercel host)
- `REFRESH_TOKEN_EXPIRE_DAYS=30` on Render — stay logged in up to 30 days with “Stay logged in” enabled
- Optional **refresh token in localStorage** when cookies fail (strict privacy / older WebViews)

Local dev keeps `VITE_API_BASE_URL=http://localhost:8000` (direct to FastAPI).

## Cross-origin auth checklist

Render API + Vercel UI requires all of:

- `APP_ENV=production`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_COOKIE_SAMESITE=none` (still required for direct API access / tools; proxied browser traffic is same-origin)
- `FRONTEND_ORIGINS` includes exact `https://` Vercel URL (no trailing slash)
- `AUTH_COOKIE_DOMAIN` left empty (cookies scoped to whichever host sets them)
- API requests use `credentials: "include"` (already set in `api-client.ts`)

## Web Push on production

- Frontend must be served over **HTTPS** (Vercel ✓).
- Users enable notifications in-app; subscriptions are stored in MongoDB.
- iPhone: user must **Add to Home Screen**, open installed PWA, then allow notifications (iOS 16.4+).

## Optional custom domain

If you add `https://app.yourdomain.com` on Vercel:

1. Add that origin to `FRONTEND_ORIGINS` on Render.
2. Set `PUBLIC_BASE_URL` and `VITE_PUBLIC_BASE_URL` to the same URL.
3. Redeploy both services.
