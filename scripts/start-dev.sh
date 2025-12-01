#!/bin/bash

# 智能 dev server 啟動腳本 - 自動處理 port 佔用問題

PORT="${1:-6002}"
MAX_RETRIES=3
RETRY_COUNT=0

echo "🚀 啟動 Next.js Dev Server (Port: $PORT)"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # 檢查 port 是否被佔用
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️ Port $PORT 已被佔用"
        
        # 嘗試殺死佔用進程
        PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t | head -1)
        if [ ! -z "$PID" ]; then
            echo "   嘗試殺死進程 PID=$PID..."
            kill -9 $PID 2>/dev/null
            
            # 等待 port 釋放
            sleep 2
            
            if ! lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo "   ✅ Port 已釋放"
                break
            else
                RETRY_COUNT=$((RETRY_COUNT + 1))
                echo "   ❌ Port 仍被佔用 (重試 $RETRY_COUNT/$MAX_RETRIES)"
                
                if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                    sleep 2
                fi
            fi
        fi
    else
        echo "✅ Port $PORT 可用"
        break
    fi
done

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ 無法釋放 Port $PORT，請手動檢查"
    exit 1
fi

# 啟動 Next.js
echo ""
echo "�� 啟動 Next.js..."
cd /home/eric/workspace_test1/med-paper-assistant/integrations/next-ai-draw-io
exec npm run dev -- --port $PORT
