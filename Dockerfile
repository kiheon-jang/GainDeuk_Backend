# GainDeuk Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gaindeuk -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs && chown -R gaindeuk:nodejs logs

# Change ownership of the app directory
RUN chown -R gaindeuk:nodejs /app
USER gaindeuk

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]
