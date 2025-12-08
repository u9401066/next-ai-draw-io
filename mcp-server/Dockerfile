# MCP Server Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 安裝 uv
RUN pip install uv

# 複製專案檔案
COPY pyproject.toml uv.lock ./
COPY src ./src

# 安裝依賴
RUN uv sync --frozen

# 設定環境變數
ENV PYTHONUNBUFFERED=1
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=6005
ENV WEB_PORT=6002

# 暴露 MCP Server port
EXPOSE 6005

# 啟動 MCP Server
CMD ["uv", "run", "drawio-mcp-server"]
