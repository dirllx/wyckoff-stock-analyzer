#!/bin/bash
# 停止新版系统

echo "🛑 停止新版系统..."

# 停止新版进程
lsof -ti:8080 2>/dev/null | xargs kill 2>/dev/null
lsof -ti:3001 2>/dev/null | xargs kill 2>/dev/null

sleep 2

# 恢复.env配置
cd /Users/dirllx/Claude\ Code/wyckoff-stock-analyzer/backend
if [ -f ".env.bak" ]; then
    mv .env.bak .env
    echo "✅ 已恢复.env配置"
fi

echo "✅ 新版系统已停止"
