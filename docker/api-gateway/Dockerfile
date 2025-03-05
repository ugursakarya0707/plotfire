FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Copy workspace libs
COPY libs ./libs

# Copy service source
COPY apps/api-gateway ./apps/api-gateway

# Install dependencies
RUN npm install

# Build the application
RUN npm run build -- --project=api-gateway

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist/apps/api-gateway ./
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Start the service
CMD ["node", "main.js"]
