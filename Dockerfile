FROM node:22-alpine AS dependencies
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS runner
WORKDIR /usr/src/app

RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/
COPY db/ ./db/

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["dumb-init", "node", "src/server.js"]
