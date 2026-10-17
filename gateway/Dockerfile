# The gateway is the single entrance: it serves the static site and forwards
# /klantsysteem/ and /klantbeeld/ to the system containers.
# Why one entrance: one port locally, one domain and one certificate on the server.

# Stage 1: build the Astro site (it reads config/, exercises/ and docs/ from the repo root)
FROM node:24-alpine AS site
WORKDIR /repo
COPY config ./config
COPY exercises ./exercises
COPY docs ./docs
COPY site/package.json site/package-lock.json ./site/
RUN npm ci --prefix site --no-audit --no-fund
COPY site ./site
RUN npm run --prefix site build

# Stage 2: nginx with the built site
FROM nginx:1.29-alpine
COPY gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site /repo/site/dist /usr/share/nginx/html
EXPOSE 80
