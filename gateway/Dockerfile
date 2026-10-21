# The gateway is the single entrance: it serves the static site and forwards
# /klantsysteem/ and /klantbeeld/ to the system containers.
# Why one entrance: one port locally, one domain and one certificate on the server.

# Stage 1: build the Astro site (it reads config/, data/, exercises/ and docs/ from the repo root)
FROM node:24-alpine AS site
WORKDIR /repo
COPY config ./config
COPY exercises ./exercises
COPY docs ./docs
COPY data ./data
# Read by the code browser on the training site (/training/oefeningen/code/).
COPY README.md docker-compose.yml ./
COPY systems ./systems
COPY gateway ./gateway
# Use the generated world (real BAG addresses, 2000 customers) when it exists on
# this machine: it is made by tools/world/ and never committed to git.
RUN if [ -d data/generated/seed ]; then cp data/generated/seed/*.json data/seed/ &&       if [ -f data/generated/accounting/open-items.csv ]; then cp data/generated/accounting/open-items.csv data/accounting/; fi; fi
COPY site/package.json site/package-lock.json ./site/
RUN npm ci --prefix site --no-audit --no-fund
COPY site ./site
RUN npm run --prefix site build
# The accounting export belongs to step 9c (SQL). It is served next to the
# exercises (behind the login) so it always matches the world in this image.
RUN cp data/accounting/open-items.csv site/dist/training/oefeningen/open-items.csv

# Stage 2: nginx with the built site
FROM nginx:1.29-alpine
COPY gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site /repo/site/dist /usr/share/nginx/html
EXPOSE 80
