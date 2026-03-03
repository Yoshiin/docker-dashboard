FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

RUN yarn install --production --frozen-lockfile && yarn cache clean
RUN apk add --no-cache curl

RUN mkdir -p data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "src/app.js"]