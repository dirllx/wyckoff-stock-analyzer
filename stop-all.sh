#!/bin/bash
# 停止所有服务

echo "🛑 停止所有服务..."

# 停止新版
echo "  停止新版 (8080/3001)..."
lsof -ti:8080 2>/dev/null | xargs kill 2>/dev/null
lsof -ti:3001 2>/dev/null | xargs kill 2>/dev/null

# 停止旧版
echo "  停止旧版 (8000/3000)..."
lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null
lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null

sleep 2
echo "✅ 所有服务已停止"
