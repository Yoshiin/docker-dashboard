FROM node:24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

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

RUN mkdir -p data
EXPOSE 3000
CMD ["node", "src/app.js"]