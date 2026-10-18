# ==============================================================================
# Multi-Stage Dockerfile for TaskFlow - Secure Task Management API
# Production Ready: Minimal attack surface, Non-root user, Native Healthcheck
# ==============================================================================

# Stage 1: Dependencies Cache
FROM node:22-alpine AS dependencies
WORKDIR /usr/src/app

# Install build essentials if native modules need compiling
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install all dependencies (including devDependencies for testing/building)
RUN npm ci

# Stage 2: Production Release
FROM node:22-alpine AS runner
WORKDIR /usr/src/app

# Install dumb-init for proper PID 1 signal forwarding (SIGTERM / SIGINT)
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=5000

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code and migrations
COPY src/ ./src/
COPY db/ ./db/

# Security Best Practice: Run as non-privileged 'node' user
USER node

# Expose API port
EXPOSE 5000

# Native Docker Healthcheck against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Launch using dumb-init
CMD ["dumb-init", "node", "src/server.js"]
