# Aria Frontend

The web client for the Aria AI platform — an AI agent builder with interactive real-time sessions, 3D avatar rendering, and session analytics.

Built with a modern 2025/2026 React stack.

## Stack

| Concern        | Tool                                    |
| -------------- | --------------------------------------- |
| Build          | Vite 6 + SWC                           |
| Language       | TypeScript 5.7 (strict)                |
| UI             | React 19                               |
| Styling        | Tailwind CSS v4 (Vite plugin)          |
| Routing        | TanStack Router (file-based)           |
| Server state   | TanStack Query v5                      |
| Client state   | Zustand v5                             |
| 3D / Avatar    | Three.js + React Three Fiber           |
| Flow diagrams  | XYFlow (React Flow)                    |
| Code editor    | Monaco Editor                          |
| Icons          | Lucide React                           |
| i18n           | Custom (Zustand + interpolation)       |
| Testing        | Vitest + React Testing Library         |
| Linting        | ESLint 9 (flat config)                 |
| Formatting     | Prettier                               |
| Deployment     | Docker (multi-stage) + Nginx           |

> For deep dives on the main libraries see the [docs/](docs/) folder.

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start dev server (localhost:3000)
npm run dev
```

## Available Scripts

```bash
npm run dev              # Vite dev server (port 3000)
npm run build            # TypeScript check + Vite production build
npm run preview          # Preview production build locally
npm run lint             # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier format
npm run format:check     # Prettier check
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:coverage    # Coverage report (v8)
npm run type-check       # TypeScript strict check (no emit)
```

## Project Structure

```
src/
├── assets/              # Static assets (3D models, images)
├── components/
│   ├── layout/          # App shell — Header, Footer, RootLayout
│   └── ui/              # Reusable primitives — Button, Input, CatalogSelect…
├── features/            # Feature modules (see below)
│   ├── agent/           # Agent CRUD, config, pipeline, analytics
│   ├── auth/            # Login, signup, token management
│   ├── organization/    # Org switching, members, settings
│   └── room/            # Real-time session with 3D avatar & WebSocket
├── hooks/               # Shared custom hooks (useDocumentTitle)
├── i18n/                # Internationalization (EN, IT) with Zustand store
├── lib/                 # API client (typed, with auth), query client config
├── routes/              # TanStack Router file-based routes
├── stores/              # Global Zustand stores (app UI state)
├── styles/              # Tailwind v4 theme, design tokens, custom utilities
├── test/                # Vitest setup
├── types/               # Global TS types (ApiResponse, PaginatedResponse…)
├── utils/               # Pure helpers (cn, format)
├── main.tsx             # App entry point
├── router.ts            # Router instance + config
└── routeTree.gen.ts     # Auto-generated route tree (do not edit)
```

## Feature Modules

Each feature follows the same self-contained structure:

```
features/<name>/
├── api/           # API calls & React Query hooks
├── components/    # Feature-specific UI
├── hooks/         # Data fetching, mutations, logic hooks
├── stores/        # Zustand state slices
├── types/         # TypeScript interfaces
├── constants/     # Feature constants (optional)
├── actions/       # Event handlers / registries (optional)
└── index.ts       # Barrel export
```

### Agent

The core feature. Covers the full lifecycle of an AI agent:

- **Agents list page** with KPI cards
- **Multi-step creation wizard** (info, config, pipeline steps, review)
- **Configuration panel** with step editor and visual flow diagram (XYFlow)
- **Session analytics dashboard** — tables, charts, video playback, conversation viewer

### Auth

JWT-based authentication with access/refresh token rotation:

- Login & signup modals
- Silent token refresh via `useAuthRefresh` hook
- Cross-tab refresh coordination using `BroadcastChannel`

### Organization

Multi-tenant team management:

- Organization switcher in the header
- Member list with role management
- Create / edit / delete organizations

### Room

Real-time interactive session between a user and an AI agent:

- **3D avatar** rendered with React Three Fiber + lip-sync
- **WebSocket** connection for live events
- **Audio playback** of AI responses
- **Video recording** of sessions
- **Chat overlay**, presentation viewer, code editor (Monaco)
- Responsive layouts for desktop and mobile

## Routes

```
/                           Home / Dashboard
/agents                     Agent list
/agents/generate            Create agent wizard
/agents/:agentId            Agent overview
/agents/:agentId/config     Agent configuration
/agents/:agentId/analytics  Session analytics
/organization               Organization settings
/room/:roomId               Live session room
```

Routes are file-based — TanStack Router auto-generates the route tree from `src/routes/`. The `_app` layout wraps authenticated pages with the Header and Footer.

## Theming

All design tokens live in `src/styles/index.css` using Tailwind v4's `@theme` directive:

- **Colors**: brand orange primary, cyan accent, purple-grey surfaces (dark theme)
- **Typography**: DM Sans / Outfit for text, JetBrains Mono for code
- **Custom utilities**: `.pack-glass` (glassmorphism), `.pack-glow`, `.pack-noise`, `.panel-*`, gradient borders
- **Animations**: fade-in, scale-fade-in, slide-in, skeleton pulse

To rebrand, edit the CSS custom properties in `index.css` — no component changes needed.

## API Client

The typed API client in `src/lib/api-client.ts` handles:

- Automatic Bearer token injection from the auth store
- 401 retry with silent token refresh
- Organization context header (`X-Organization-Id`)
- FormData and JSON body support
- Methods: `api.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`

## Environment Variables

Copy `.env.example` to `.env`:

```bash
VITE_API_BASE_URL=http://localhost:8080   # Backend API
VITE_WS_URL=ws://localhost:5000           # WebSocket server
```

Only variables prefixed with `VITE_` are exposed to the client (inlined at build time by Vite).

## Deployment

The app ships as a Docker image using a multi-stage build:

1. **Build stage** — `node:22-alpine`, runs `npm ci && npm run build`
2. **Serve stage** — `nginx:alpine`, serves the static `dist/` with SPA fallback routing

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_WS_URL=wss://ws.example.com \
  -t aria-frontend .
```

## Further Reading

- [TanStack (Router & Query)](docs/tanstack.md)
- [Zustand](docs/zustand.md)
- [Vite](docs/vite.md)
- [Lip Sync & Avatar](docs/Lip_sync_and_avatar.md)
