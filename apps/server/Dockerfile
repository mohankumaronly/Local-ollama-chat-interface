# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Copy root manifests + lockfile so npm can resolve workspace versions.
COPY package.json package-lock.json ./

# Copy all workspace package.json files (needed by npm ci for workspace resolution)
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install all deps (npm workspaces hoists to root node_modules)
RUN npm ci

# Copy server source and build
COPY apps/server ./apps/server
COPY packages/shared ./packages/shared
RUN npm run build -w @local-ollama/server

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Copy built artifacts and production node_modules from the build stage.
# node_modules is at root due to npm workspaces hoisting.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/apps/server/package.json ./package.json

USER app
EXPOSE 3000

CMD ["node", "dist/index.js"]
