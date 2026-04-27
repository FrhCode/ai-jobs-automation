FROM oven/bun:1
WORKDIR /app

# Install server dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Install UI dependencies
COPY ui/package.json ui/bun.lock* ./ui/
RUN cd ui && bun install --frozen-lockfile

# Copy source and build UI
COPY . .
RUN cd ui && bun run build && mkdir -p /app/uploads
CMD ["bun", "src/server/index.ts"]
