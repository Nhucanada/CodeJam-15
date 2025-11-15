FROM node:20

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy source code
COPY . .

EXPOSE 5173

# Run development server with host binding
CMD ["pnpm", "dev", "--host"]