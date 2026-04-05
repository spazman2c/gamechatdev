FROM node:20-alpine
WORKDIR /app

# Copy everything
COPY . .

# Install all deps (workspaces) — ignore postinstall scripts since we build manually below
RUN npm ci --ignore-scripts

# Build packages in dependency order
RUN npm run build --workspace=@nexora/schemas
RUN npm run build --workspace=@nexora/types
RUN npm run build --workspace=@nexora/api

CMD ["npm", "run", "start", "--workspace=@nexora/api"]
