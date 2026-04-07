#!/bin/bash

echo "🚀 启动威科夫股票分析系统（新版）..."

cd "$(dirname "$0")/backend"

echo "🛑 停止新版旧进程..."
# 只停止新版端口（8080/3001），不影响老版（8000/3000）
lsof -ti:8080 2>/dev/null | xargs kill 2>/dev/null
lsof -ti:3001 2>/dev/null | xargs kill 2>/dev/null
sleep 2

echo "📡 启动新版后端 (端口8080)..."
if [ -d "venv" ]; then
    ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload > /tmp/backend_8080.log 2>&1 &
else
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload > /tmp/backend_8080.log 2>&1 &
fi
BACKEND_PID=$!
echo "   后端PID: $BACKEND_PID"

sleep 3

echo "🌐 启动新版前端 (端口3001)..."
cd "$(dirname "$0")/frontend-new"
npm run dev > /tmp/frontend_3001.log 2>&1 &
FRONTEND_PID=$!
echo "   前端PID: $FRONTEND_PID"

sleep 3

echo ""
echo "✅ 新版系统启动完成！"
echo ""
echo "📍 新版访问地址:"
echo "   前端: http://localhost:3001"
echo "   后端: http://localhost:8080"
echo "   API文档: http://localhost:8080/docs"
echo ""
echo "📍 老版访问地址（不受影响）:"
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:8000"
echo ""
echo "📋 查看日志:"
echo "   新版后端: tail -f /tmp/backend_8080.log"
echo "   新版前端: tail -f /tmp/frontend_3001.log"
echo ""
echo "🛑 停止新版服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

echo $BACKEND_PID > /tmp/wyckoff_new_backend.pid
echo $FRONTEND_PID > /tmp/wyckoff_new_frontend.pid
