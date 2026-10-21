# AI box: the only system with an npm dependency (the official Anthropic SDK)
# and the only one with data that must survive restarts (volume /data).
FROM node:24-alpine
WORKDIR /app
COPY systems/ai/package.json systems/ai/package-lock.json ./systems/ai/
RUN npm ci --prefix systems/ai --omit=dev --no-audit --no-fund
COPY systems/shared ./systems/shared
COPY systems/ai ./systems/ai
COPY config ./config
COPY site/public/favicon.svg ./site/public/favicon.svg
RUN mkdir -p /data /orders && chown node:node /data /orders
USER node
ENV NODE_ENV=production PORT=3000 AI_DB_FILE=/data/ai.db
EXPOSE 3000
CMD ["node", "systems/ai/server.js"]
