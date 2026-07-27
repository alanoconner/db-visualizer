# --- Stage 1: build the React frontend ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: server + built frontend ---
FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV PORT=4000
EXPOSE 4000

CMD ["node", "server/index.js"]
