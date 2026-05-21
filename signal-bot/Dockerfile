FROM node:20-alpine

WORKDIR /app

# Install ALL deps (incl. typescript) — needed for the tsc build step
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Slim down: drop dev deps + source after the build
RUN npm prune --omit=dev && rm -rf src tsconfig.json

EXPOSE 8080

# TCP health check — the WS server returns HTTP 426 to plain GET, so check the port is open instead
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('net').connect(process.env.WS_PORT||8080,'127.0.0.1').on('connect',c=>{c.end();process.exit(0)}).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
