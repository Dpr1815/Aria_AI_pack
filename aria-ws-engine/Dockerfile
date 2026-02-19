# ---- Stage 1: Download Rhubarb Lip Sync ----
FROM alpine:3.20 AS rhubarb

ARG RHUBARB_VERSION=1.14.0

RUN apk add --no-cache curl unzip \
    && curl -fSL \
       "https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${RHUBARB_VERSION}/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux.zip" \
       -o /tmp/rhubarb.zip \
    && unzip /tmp/rhubarb.zip -d /tmp/rhubarb \
    && mv /tmp/rhubarb/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux/rhubarb /usr/local/bin/rhubarb \
    && mv /tmp/rhubarb/Rhubarb-Lip-Sync-${RHUBARB_VERSION}-Linux/res /usr/local/bin/res \
    && chmod +x /usr/local/bin/rhubarb \
    && rm -rf /tmp/rhubarb /tmp/rhubarb.zip

# ---- Stage 2: Build TypeScript ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# tsc compiles TS; tsc-alias rewrites path aliases (@config, @services, etc.)
RUN npx tsc && npx tsc-alias

# ---- Stage 3: Production ----
FROM node:20-slim

# Rhubarb needs libstdc++ at runtime (glibc is already present in slim)
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Compiled application
COPY --from=builder /app/dist ./dist

# Rhubarb binary + resource files (PocketSphinx dictionaries, etc.)
COPY --from=rhubarb /usr/local/bin/rhubarb /usr/local/bin/rhubarb
COPY --from=rhubarb /usr/local/bin/res /usr/local/bin/res

# Create directories that the app needs at runtime, owned by node
RUN mkdir -p /app/credentials /app/logs && chown -R node:node /app/credentials /app/logs

# Drop to non-root user
USER node

EXPOSE 5000

CMD ["node", "dist/app.js"]
