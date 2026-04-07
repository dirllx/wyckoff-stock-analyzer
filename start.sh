#!/bin/bash

echo "🚀 启动威科夫股票分析系统..."

cd "$(dirname "$0")/backend"

echo "🛑 停止旧的服务..."
pkill -f "uvicorn app.main:app" 2>/dev/null
pkill -f "vite.*5173" 2>/dev/null
sleep 2

echo "📡 启动后端服务器 (端口8080)..."
if [ -d "venv" ]; then
    ./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload > /tmp/backend_8080.log 2>&1 &
else
    /Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/Resources/Python.app/Contents/MacOS/python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload > /tmp/backend_8080.log 2>&1 &
fi
BACKEND_PID=$!
echo "   后端PID: $BACKEND_PID"

sleep 3

echo "🌐 启动前端服务器 (端口5173)..."
cd "$(dirname "$0")/frontend-new"
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   前端PID: $FRONTEND_PID"

sleep 3

echo ""
echo "✅ 系统启动完成！"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:8080"
echo "   API文档: http://localhost:8080/docs"
echo ""
echo "📋 查看日志:"
echo "   后端: tail -f /tmp/backend_8080.log"
echo "   前端: tail -f /tmp/frontend.log"
echo ""
echo "🛑 停止服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

echo $BACKEND_PID > /tmp/wyckoff_backend.pid
echo $FRONTEND_PID > /tmp/wyckoff_frontend.pid
