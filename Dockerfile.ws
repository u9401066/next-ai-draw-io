# WebSocket Server Dockerfile
FROM node:22-alpine

WORKDIR /app

# 複製必要檔案
COPY package.json package-lock.json* ./
COPY scripts ./scripts
COPY tsconfig.json ./

# 安裝依賴
RUN npm ci --only=production
RUN npm install -g tsx

# 設定環境變數
ENV WS_PORT=6003
ENV API_PORT=6004

# 暴露 ports
EXPOSE 6003 6004

# 啟動 WebSocket Server
CMD ["tsx", "scripts/ws-server.ts"]
