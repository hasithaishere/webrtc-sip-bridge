FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Expose ports
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]