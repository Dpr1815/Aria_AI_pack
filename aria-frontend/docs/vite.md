# Vite

Vite 6 is the build tool and dev server for the project. It handles module bundling, HMR, TypeScript transpilation (via SWC), Tailwind CSS processing, and TanStack Router code generation.

---

## Configuration

All build config lives in `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  assetsInclude: ["**/*.glb"],
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
});
```

### Plugins

| Plugin | What it does |
| --- | --- |
| `@vitejs/plugin-react-swc` | JSX transform via SWC (much faster than Babel) |
| `@tailwindcss/vite` | Tailwind CSS v4 — processes `@theme`, `@apply`, utility classes directly in the Vite pipeline |
| `@tanstack/router-plugin/vite` | Watches `src/routes/` and auto-generates the route tree (`routeTree.gen.ts`) |

### Path alias

The `@` alias maps to `src/`, so imports look like:

```ts
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/features/auth";
```

This alias is configured in both:
- **Vite** — `resolve.alias` in `vite.config.ts` (for bundling)
- **TypeScript** — `paths` in `tsconfig.app.json` (for type checking and IDE support)

### Asset handling

`assetsInclude: ["**/*.glb"]` tells Vite to treat `.glb` files (3D models) as static assets. They get a hashed filename in the build output and can be imported like:

```ts
import avatarModel from "@/assets/aria.glb";
```

---

## Dev server

```bash
npm run dev
```

- Runs on `http://localhost:3000` (strict port — fails if 3000 is taken)
- Hot Module Replacement (HMR) via SWC — near-instant updates
- Tailwind classes are processed on the fly
- Route tree regenerates automatically when route files change

---

## Production build

```bash
npm run build
```

This runs two steps:
1. `tsc -b` — TypeScript type checking (project references)
2. `vite build` — bundles to `dist/`

Build options:
- **`target: "esnext"`** — no downleveling, ships modern JS (smallest bundle)
- **`sourcemap: true`** — generates source maps for debugging production errors

The output is a static SPA in `dist/` ready to be served by any static file server.

---

## TypeScript configuration

The project uses **project references** via `tsconfig.json`:

```
tsconfig.json              ← references only (no compilerOptions)
├── tsconfig.app.json      ← app source (src/)
└── tsconfig.node.json     ← Node config files (vite.config.ts, eslint.config.ts)
```

Key settings in `tsconfig.app.json`:
- **`strict: true`** + `noUnusedLocals` + `noUnusedParameters` + `noUncheckedIndexedAccess` — strict mode
- **`moduleResolution: "bundler"`** — Vite-aware resolution (supports `?raw`, `?url`, etc.)
- **`verbatimModuleSyntax: true`** — enforces explicit `import type` for type-only imports
- **`target: "ES2022"`** — modern JS output
- **`paths: { "@/*": ["./src/*"] }`** — mirrors the Vite alias for the TS compiler

---

## Environment variables

Vite uses `.env` files with a `VITE_` prefix convention:

```bash
# .env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:5000
```

- Only variables starting with `VITE_` are exposed to client code
- Access via `import.meta.env.VITE_API_BASE_URL`
- Values are **inlined at build time** (string replacement, not runtime)
- For Docker builds, pass them as build args (see below)

---

## Docker deployment

The Dockerfile uses a **multi-stage build**:

**Stage 1 — Build:**
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build
```

Environment variables are passed as `ARG` → `ENV` so Vite can inline them during the build step.

**Stage 2 — Serve:**
```dockerfile
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The custom `nginx.conf` includes `try_files $uri $uri/ /index.html` for SPA client-side routing fallback.

Build and run:
```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_WS_URL=wss://ws.example.com \
  -t aria-frontend .

docker run -p 80:80 aria-frontend
```

---

## Testing with Vitest

Vitest shares the Vite config so path aliases, plugins, and transforms all work in tests without extra setup:

```ts
// vitest.config.ts
import { mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(viteConfig, {
  test: {
    globals: true,               // describe, it, expect without imports
    environment: "jsdom",        // browser-like DOM
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      exclude: ["src/test/**", "src/routeTree.gen.ts", "src/**/*.d.ts", "src/main.tsx"],
    },
  },
});
```

Run tests:
```bash
npm run test            # watch mode
npm run test:run        # single run
npm run test:coverage   # with coverage report
```

---

## ESLint

ESLint 9 with flat config (`eslint.config.ts`):

- Extends `@eslint/js` recommended + `typescript-eslint` strict type-checked rules
- React Hooks rules + React Refresh rules
- Prettier integration (disables formatting rules)
- Ignores: `dist`, `node_modules`, config files

```bash
npm run lint            # check
npm run lint:fix        # auto-fix
```
