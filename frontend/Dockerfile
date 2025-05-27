FROM node:22.16.0 AS builder
RUN apt update \
    && apt install -y python3 make g++ libusb-1.0-0-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json next.config.mjs yarn.lock ./
RUN yarn install --immutable
COPY ./ ./
RUN yarn run build
RUN yarn install --immutable --prod

FROM node:22-slim AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["yarn", "run", "start"]