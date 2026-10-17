# One image for both systems; docker-compose.yml picks which server to run.
# No npm install needed: the systems only use Node's standard library
# (including the built-in node:sqlite).
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY config ./config
COPY data ./data
COPY systems ./systems
COPY site/public/favicon.svg ./site/public/favicon.svg
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
