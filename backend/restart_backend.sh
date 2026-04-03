#!/bin/bash
# 后端服务管理脚本

PROJECT_DIR="/Users/dirllx/Claude Code/wyckoff-stock-analyzer"
BACKEND_DIR="$PROJECT_DIR/backend"
LOG_FILE="/tmp/backend.log"
PID_FILE="/tmp/backend.pid"

case "$1" in
    start)
        echo "启动后端服务..."
        cd "$BACKEND_DIR"
        nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        sleep 3
        if curl -s http://localhost:8000/api/v1/health > /dev/null; then
            echo "✅ 后端服务启动成功"
        else
            echo "❌ 后端服务启动失败，查看日志: tail -f $LOG_FILE"
        fi
        ;;

    stop)
        echo "停止后端服务..."
        if [ -f "$PID_FILE" ]; then
            kill $(cat "$PID_FILE") 2>/dev/null
            rm "$PID_FILE"
            echo "✅ 后端服务已停止"
        else
            # 尝试杀死占用8000端口的进程
            lsof -ti:8000 | xargs kill -9 2>/dev/null
            echo "✅ 已清理8000端口"
        fi
        ;;

    restart)
        echo "重启后端服务..."
        $0 stop
        sleep 2
        $0 start
        ;;

    status)
        echo "检查后端服务状态..."
        if curl -s http://localhost:8000/api/v1/health | python3 -m json.tool 2>/dev/null; then
            echo "✅ 后端服务运行正常"
        else
            echo "❌ 后端服务未响应"
            echo "查看日志: tail -f $LOG_FILE"
        fi
        ;;

    logs)
        echo "查看后端日志 (Ctrl+C 退出)..."
        tail -f "$LOG_FILE"
        ;;

    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
