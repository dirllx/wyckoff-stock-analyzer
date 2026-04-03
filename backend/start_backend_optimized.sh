#!/bin/bash

# 优化的后端启动脚本
# 资源占用优化版本

BACKEND_DIR="/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend"
PID_FILE="$BACKEND_DIR/backend.pid"
LOG_FILE="$BACKEND_DIR/backend.log"
PORT=8000

cd "$BACKEND_DIR" || exit 1

# 停止现有服务
stop_backend() {
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if ps -p $OLD_PID > /dev/null 2>&1; then
            echo "停止后端服务 (PID: $OLD_PID)..."
            kill $OLD_PID
            sleep 2
            # 如果还没停止，强制停止
            if ps -p $OLD_PID > /dev/null 2>&1; then
                kill -9 $OLD_PID
            fi
        fi
        rm -f "$PID_FILE"
    fi

    # 清理端口
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
}

# 启动服务
start_backend() {
    echo "启动优化版后端服务..."

    # 使用优化的配置启动：
    # --workers 1: 单worker模式，避免多进程资源占用
    # --limit-concurrency 10: 限制并发连接数
    # --timeout-keep-alive 2: keep-alive超时2秒
    # --log-level warning: 降低日志级别
    # 不使用 --reload: 避免文件监控开销

    nohup python3 -m uvicorn app.main:app \
        --host 0.0.0.0 \
        --port $PORT \
        --workers 1 \
        --limit-concurrency 10 \
        --timeout-keep-alive 2 \
        --log-level warning \
        --access-log \
        --no-use-colors \
        >> "$LOG_FILE" 2>&1 &

    PID=$!
    echo $PID > "$PID_FILE"

    echo "✅ 后端服务启动成功 (PID: $PID)"
    echo "📊 监控日志: tail -f $LOG_FILE"
    echo "🔍 查看状态: ./start_backend_optimized.sh status"
    sleep 2

    # 验证启动
    if ps -p $PID > /dev/null 2>&1; then
        echo "✅ 服务验证成功"
    else
        echo "❌ 服务启动失败"
        return 1
    fi
}

# 检查状态
check_status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            # 获取资源占用
            MEM=$(ps -o rss -p $PID | awk '{printf "%.1f", $1/1024}')
            CPU=$(ps -o %cpu -p $PID)
            echo "✅ 后端服务运行中"
            echo "   PID: $PID"
            echo "   内存: ${MEM}MB"
            echo "   CPU: ${CPU}%"
            echo "   端口: $PORT"

            # 测试健康检查
            if command -v curl > /dev/null; then
                HEALTH=$(curl -s http://localhost:$PORT/api/v1/health 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))" 2>/dev/null)
                if [ -n "$HEALTH" ]; then
                    echo "   状态: $HEALTH"
                fi
            fi
            return 0
        else
            echo "❌ PID文件存在但进程未运行"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        echo "❌ 后端服务未运行"
        return 1
    fi
}

# 主函数
case "$1" in
    start)
        stop_backend
        start_backend
        ;;
    stop)
        stop_backend
        echo "✅ 后端服务已停止"
        ;;
    restart)
        stop_backend
        start_backend
        ;;
    status)
        check_status
        ;;
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -100 "$LOG_FILE"
        else
            echo "日志文件不存在"
        fi
        ;;
    monitor)
        watch -n 2 'bash '"$0"' status
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs|monitor}"
        exit 1
        ;;
esac
