# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

# bcrypt needs native compilation tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# tsc compiles TS; tsc-alias rewrites path aliases (@config, @modules, etc.)
RUN npx tsc && npx tsc-alias

# ---- Stage 2: Production ----
FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY --from=builder /app/dist ./dist

# Create directories that the app needs at runtime, owned by node
RUN mkdir -p /app/credentials /app/logs && chown -R node:node /app/credentials /app/logs

USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
