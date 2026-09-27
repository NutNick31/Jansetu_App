# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
# Non-root user for Cloud Run.
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 8080
CMD ["node", "dist/index.js"]
