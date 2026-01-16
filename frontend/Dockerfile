FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Run the application
CMD ["bun", "run", "dev"]
