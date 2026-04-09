#!/bin/bash
# 只启动新版系统，不影响旧版

echo "🚀 启动新版系统..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 只停止新版端口
echo "🛑 停止新版旧进程..."
lsof -ti:8080 2>/dev/null | xargs kill 2>/dev/null
lsof -ti:3001 2>/dev/null | xargs kill 2>/dev/null
sleep 2

# 启动新版后端（使用PostgreSQL配置）
echo "📡 启动新版后端 (端口8080, PostgreSQL)..."
cd "$SCRIPT_DIR/backend"

# 备份原.env，使用新版配置
if [ -f ".env" ]; then
    cp .env .env.bak
fi
if [ -f ".env.new" ]; then
    cp .env.new .env
fi

if [ -d "venv" ]; then
    ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload > /tmp/backend_8080.log 2>&1 &
else
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload > /tmp/backend_8080.log 2>&1 &
fi
BACKEND_PID=$!

sleep 3

# 启动新版前端
echo "🌐 启动新版前端 (端口3001)..."
cd "$SCRIPT_DIR/frontend-new"
npm run dev > /tmp/frontend_3001.log 2>&1 &
FRONTEND_PID=$!

sleep 3

echo ""
echo "✅ 新版系统启动完成！"
echo ""
echo "📍 新版地址:"
echo "   前端: http://localhost:3001"
echo "   后端: http://localhost:8080"
echo ""
echo "📍 旧版端口 (不受影响):"
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:8000"
echo ""
echo $BACKEND_PID > /tmp/wyckoff_new_backend.pid
echo $FRONTEND_PID > /tmp/wyckoff_new_frontend.pid
