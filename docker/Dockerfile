# Production Dockerfile for MCP Workspace Tracker
# This container is optimized for production use with minimal footprint

# Build stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./

# Install dependencies for build only
RUN npm install

# Copy only the necessary files for building
COPY tsconfig.json ./
COPY src/ ./src/
COPY tests/ ./tests/
COPY sample-workspace/ ./sample-workspace/

# Build the TypeScript project
RUN npm run build

# Prune dev dependencies to reduce size
RUN npm prune --production

# Production stage - use a slimmer Node.js image
FROM node:18-alpine AS production

# Install only necessary system packages
RUN apk add --no-cache tini procps

# Create non-root user
RUN addgroup -S mcp && adduser -S mcp -G mcp

# Create app directory and cache directory, set ownership
WORKDIR /app
RUN mkdir -p /app/cache && chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Copy only built files and production node_modules from build stage
COPY --from=build --chown=mcp:mcp /app/dist ./dist
COPY --from=build --chown=mcp:mcp /app/package*.json ./
COPY --from=build --chown=mcp:mcp /app/node_modules ./node_modules
COPY --from=build --chown=mcp:mcp /app/sample-workspace ./sample-workspace

# Compress JavaScript files to reduce size (optional - uncomment if needed)
# RUN find ./dist -type f -name "*.js" -exec gzip -9 {} \; -exec mv {}.gz {} \;

# Expose port for MCP server
EXPOSE 7860

# Use tini as init to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the server
CMD ["node", "dist/index.js"]
