#!/bin/bash
# 快速启动优化的后端服务
cd "$(dirname "$0")"
nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --limit-concurrency 10 --log-level warning --access-log --no-use-colors >> backend.log 2>&1 &
echo $! > backend.pid
echo "✅ 后端已启动 (PID: $(cat backend.pid))"
echo "📊 查看状态: ps aux | grep $(cat backend.pid)"
echo "📋 查看日志: tail -f backend.log"
echo "🛑 停止服务: kill $(cat backend.pid)"

