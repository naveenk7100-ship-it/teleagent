# Multi-stage production Dockerfile for TeleAgent Backend

# Stage 1: Build TypeScript source
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install all dependencies including devDependencies for compilation
RUN npm ci

# Copy source code and migrations
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled JavaScript and SQL migration files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
COPY --from=builder /app/src/db/schema.sql ./dist/db/schema.sql

# Create non-root user for security
RUN addgroup -S teleagent && adduser -S teleagent -G teleagent
RUN mkdir -p /app/data && chown -R teleagent:teleagent /app
USER teleagent

EXPOSE 3001

# Healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Execute compiled production server
CMD ["node", "dist/index.js"]
