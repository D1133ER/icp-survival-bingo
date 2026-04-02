# ── Stage 1: Build frontend ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source + shared types (tsx runs TS directly)
COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig.json ./

EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]
