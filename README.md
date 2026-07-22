# Activ Daily — Premies Portal

The portal is a Next.js App Router application for employee premiums and daily ActivBank operations. Version 2 replaces the former Vite SPA with server-enforced authentication, role-aware routing, a same-origin API gateway, typed feature boundaries, and a new responsive interface.

## What changed

- Next.js App Router with server layouts, route metadata, loading states, error boundaries, and stable deep links.
- Access and refresh tokens are stored in `HttpOnly`, `SameSite=Lax` cookies instead of `localStorage`.
- Backend requests flow through `/api/backend/*`, so browser code no longer handles tokens or internal service URLs.
- Remote state uses TanStack Query; Zustand is limited to persistent UI preferences such as sidebar state.
- Role rules and route labels live in one typed registry: `src/config/next-navigation.ts`.
- The premium formula preserves the legacy business rules while normalizing inconsistent backend field names.
- Anime.js powers the login sphere, ambient particles, staged content entrances, and route micro-transitions. `prefers-reduced-motion` is respected.
- The application is responsive from mobile through wide desktop layouts and includes keyboard search (`Ctrl/Cmd + K`).

## Local development

Requirements: Node.js 22+ and npm 10+.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The default backend URL is `http://localhost:7575`. Set `BACKEND_URL` in `.env.local` when the API runs elsewhere.

To preview the full dashboard without a backend, set `NEXT_PUBLIC_DEMO_MODE=true`. Demo mode is visual-only and must not be enabled in production.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

## Docker

The image uses Next.js standalone output and listens on port `80`, preserving the current Compose mapping (`3000:80`). Inside Compose, `BACKEND_URL` defaults to `http://go-backend:7575`.

```bash
docker compose up --build frontend
```

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `BACKEND_URL` | Server only | Main portal API origin. Never exposed to browser bundles. |
| `NEXT_PUBLIC_DEMO_MODE` | Browser | Optional local UI preview data. Keep `false` in production. |
| `NEXT_PUBLIC_APP_URL` | Build/runtime | Optional canonical metadata origin. Defaults to localhost. |

Legacy `VITE_BACKEND_URL` is accepted server-side as a temporary migration fallback. New deployments should use `BACKEND_URL`.

## Project structure

```text
src/
  app/                   App Router pages, layouts, API handlers, errors
  components/next/       New reusable UI, navigation, dashboards, visuals
  config/                Typed role and route registry
  hooks/next/            Query and accessibility hooks
  lib/next/              Auth, API, normalizers, formula, shared types
  providers/             Application-level query provider
  stores/                UI-only Zustand state
  proxy.ts               Early session redirect guard
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for request flows, security decisions, and migration notes.
