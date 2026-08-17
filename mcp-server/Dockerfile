# MCP Server Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 安裝 uv
RUN pip install uv

# 複製專案檔案；README 是 Hatch package metadata 的必要輸入。
COPY pyproject.toml uv.lock README.md ./
COPY src ./src

# 安裝 runtime 依賴；測試套件只存在於 dev dependency group。
RUN uv sync --frozen --no-dev

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV DRAWIO_AUTO_START_WEB=false

# 啟動 stdio MCP Server；外部 Web editor 可透過 DRAWIO_NEXTJS_URL 連接。
CMD ["uv", "run", "--frozen", "--no-dev", "drawio-mcp-server"]
