# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies for native modules and Docker client
RUN apk add --no-cache python3 make g++ linux-headers docker-cli

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Development stage
FROM base AS development
COPY . .
EXPOSE 8000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install Docker client and other dependencies
RUN apk add --no-cache docker-cli wget

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist

# Create necessary directories
RUN mkdir -p uploads logs temp

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Add user to docker group to access docker socket
RUN addgroup docker && adduser backend docker

# Change ownership
RUN chown -R backend:nodejs /app

USER backend

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

CMD ["node", "dist/server.js"]

# Start the application
CMD ["npm", "start"]
