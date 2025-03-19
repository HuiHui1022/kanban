# Build stage
FROM node:22-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build frontend
RUN npm run build

# Build TypeScript server files
RUN npm run build:server

# Ensure .js extension is added to imports
RUN find dist/server -name "*.js" -exec sed -i -e 's/from "\([\.\/][^"]*\)\.js\?"/from "\1.js"/g' -e 's/from "\([\.\/][^"]*\)"/from "\1.js"/g' {} +

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built frontend files
COPY --from=build /app/dist ./dist

# Copy built server files
COPY --from=build /app/dist/server ./dist/server

# Copy SQL migration files
COPY server/db/migrations/*.sql ./dist/server/db/migrations/

# Copy any other necessary files
COPY .env* ./

EXPOSE 3000
CMD ["node", "--experimental-specifier-resolution=node", "dist/server/index.js"] 