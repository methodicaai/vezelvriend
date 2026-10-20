# One image for both systems; docker-compose.yml picks which server to run.
# No npm install needed: the systems only use Node's standard library
# (including the built-in node:sqlite).
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY config ./config
COPY data ./data
COPY docs ./docs
COPY systems ./systems
COPY site/public/favicon.svg ./site/public/favicon.svg
# Use the generated world (real BAG addresses, 2000 customers) when it exists on
# this machine: it is made by tools/world/ and never committed to git.
RUN if [ -d data/generated/seed ]; then cp data/generated/seed/*.json data/seed/ &&       if [ -f data/generated/accounting/open-items.csv ]; then cp data/generated/accounting/open-items.csv data/accounting/; fi; fi
USER node
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
