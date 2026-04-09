#!/bin/bash
# 只启动旧版系统，不影响新版

echo "🚀 启动旧版系统..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 只停止旧版端口
echo "🛑 停止旧版旧进程..."
lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null
lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null
sleep 2

# 启动旧版后端（使用SQLite配置）
echo "📡 启动旧版后端 (端口8000, SQLite)..."
cd "$SCRIPT_DIR/backend"

# 确保使用SQLite配置
if [ -f ".env" ]; then
    cp .env .env.bak
fi
if [ -f ".env.old" ]; then
    cp .env.old .env
elif [ -f ".env.sqlite" ]; then
    cp .env.sqlite .env
fi

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/backend_8000.log 2>&1 &
BACKEND_PID=$!

sleep 3

# 启动旧版前端（简单HTTP服务器）
echo "🌐 启动旧版前端 (端口3000)..."
cd "$SCRIPT_DIR/frontend"
python3 -m http.server 3000 > /tmp/frontend_3000.log 2>&1 &
FRONTEND_PID=$!

sleep 3

echo ""
echo "✅ 旧版系统启动完成！"
echo ""
echo "📍 旧版地址:"
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:8000"
echo ""
echo "📍 新版端口 (不受影响):"
echo "   前端: http://localhost:3001"
echo "   后端: http://localhost:8080"
echo ""
echo $BACKEND_PID > /tmp/wyckoff_old_backend.pid
echo $FRONTEND_PID > /tmp/wyckoff_old_frontend.pid
