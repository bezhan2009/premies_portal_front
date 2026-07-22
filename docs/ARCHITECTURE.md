# Architecture

## Benchmark findings

The redesign follows the useful structural patterns found in `new_front`: App Router entry points, a small provider boundary, feature-oriented components, shared UI primitives, TanStack Query for server data, Zustand for targeted client state, and role-filtered navigation.

The former portal had several stability risks that the migration removes:

- route permissions, default redirects, and sidebar visibility were implemented separately;
- tokens and role arrays lived in browser storage and were cleared by page-owned timers;
- individual features built URLs from `import.meta.env` and handled failures inconsistently;
- page components owned networking, normalization, calculations, and rendering;
- the navigation component exceeded 1,300 lines and mixed WebSockets, password changes, badges, role logic, and presentation.

## Request flow

```text
Browser
  -> Next proxy (session presence)
  -> protected server layout (session + role context)
  -> page/client feature
  -> /api/backend/* (same origin)
  -> authenticated server proxy (adds bearer token)
  -> Go backend
```

Login is the only credential-bearing browser request. `/api/auth/login` validates input, calls the backend, optionally translates the token for v2 compatibility, and stores tokens in HTTP-only cookies. The browser receives only the username and role IDs needed for non-sensitive UI context. Every protected page repeats authorization on the server; hidden navigation is not treated as security.

## State ownership

- **URL / App Router:** current page, deep links, history, SEO metadata.
- **HTTP-only cookies:** access token, refresh token, roles, username.
- **TanStack Query:** workers, reports, and other remote data.
- **Zustand:** collapsed sidebar, mobile drawer, command palette.
- **Component state:** period filters, search inputs, temporary dialogs.

This separation prevents server data and authentication state from drifting across components.

## API reliability

The server gateway applies a fixed backend origin, path validation, request timeouts, no-store caching, normalized error payloads, and automatic local session cleanup after a backend `401`. Binary and multipart responses are forwarded without converting them to JSON.

Client queries retry only transient server failures. Authentication and validation errors are not retried. Every async screen has loading, empty, error, and manual retry states.

## Premium calculation

`src/lib/next/workers.ts` normalizes both legacy PascalCase and newer camelCase payloads. The premium calculation retains these rules:

1. Base premium combines mobile-bank connections, card turnover, active cards, card sales, and salary-project premium.
2. Service-quality and test scores apply the legacy percentage bands.
3. Negative results are clamped to zero.
4. The final premium is capped at 1.5 times salary when salary is present.

## Route migration

All known Vite paths are registered centrally. The most-used premium and executive pages have dedicated App Router implementations. Remaining registered paths resolve through a stable role-checked module workspace instead of falling into a client-side 404; they can be replaced incrementally with dedicated pages without changing the shell, auth, or API gateway.

## Motion and accessibility

Anime.js animation is isolated in client components and cleaned up on unmount. The sphere uses transforms and opacity, avoiding layout animation. Motion is disabled when the operating system requests reduced motion. Navigation, search, dialogs, form controls, skip links, focus rings, and live error messages are keyboard and screen-reader accessible.
