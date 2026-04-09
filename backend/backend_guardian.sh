#!/bin/bash
################################################################################
# 威科夫后端守护进程
# 功能：监控后端服务，如果停止则自动重启
################################################################################

BACKEND_DIR="/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend"
LOG_FILE="$BACKEND_DIR/guardian.log"
PID_FILE="$BACKEND_DIR/guardian.pid"
PYTHON_CMD="/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/Resources/Python.app/Contents/MacOS/Python"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查后端是否运行
is_backend_running() {
    pgrep -f "uvicorn.*8000" > /dev/null
    return $?
}

# 启动后端
start_backend() {
    log "启动后端服务..."
    cd "$BACKEND_DIR" || exit 1
    nohup "$PYTHON_CMD" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> "$BACKEND_DIR/backend.log" 2>&1 &
    sleep 3

    if is_backend_running; then
        log "✅ 后端启动成功 (PID: $(pgrep -f 'uvicorn.*8000'))"
        return 0
    else
        log "❌ 后端启动失败"
        return 1
    fi
}

# 停止后端
stop_backend() {
    if is_backend_running; then
        log "停止后端服务..."
        pkill -f "uvicorn.*8000"
        sleep 2
        log "后端已停止"
    fi
}

# 重启后端
restart_backend() {
    log "重启后端服务..."
    stop_backend
    sleep 2
    start_backend
}

# 守护进程主循环
run_guardian() {
    log "=== 守护进程启动 ==="
    log "监控目录: $BACKEND_DIR"
    log "日志文件: $LOG_FILE"

    check_count=0
    restart_count=0

    while true; do
        ((check_count++))

        if ! is_backend_running; then
            log "⚠️ 检测到后端服务停止 (第${check_count}次检查)"
            ((restart_count++))
            log "尝试重启... (第${restart_count}次)"

            if start_backend; then
                log "✅ 重启成功"
            else
                log "❌ 重启失败，60秒后重试"
                sleep 60
            fi
        fi

        # 每60秒检查一次
        sleep 60
    done
}

# 安装为 launchd 服务
install_service() {
    log "安装 launchd 服务..."

    PLIST_FILE="$BACKEND_DIR/com.wyckoff.backend.plist"
    LAUNCHD_DIR="$HOME/Library/LaunchAgents"

    if [ ! -f "$PLIST_FILE" ]; then
        log "❌ plist 文件不存在: $PLIST_FILE"
        return 1
    fi

    # 复制到 launchd 目录
    cp "$PLIST_FILE" "$LAUNCHD_DIR/"

    # 加载服务
    launchctl load "$LAUNCHD_DIR/com.wyckoff.backend.plist"

    log "✅ 服务已安装并启动"
    log "查看状态: launchctl list | grep wyckoff"
    log "查看日志: tail -f $BACKEND_DIR/daemon.log"
    log "停止服务: launchctl unload $LAUNCHD_DIR/com.wyckoff.backend.plist"
}

# 卸载 launchd 服务
uninstall_service() {
    log "卸载 launchd 服务..."

    LAUNCHD_DIR="$HOME/Library/LaunchAgents"
    PLIST_FILE="$LAUNCHD_DIR/com.wyckoff.backend.plist"

    # 先停止服务
    launchctl unload "$PLIST_FILE" 2>/dev/null

    # 删除 plist 文件
    rm -f "$PLIST_FILE"

    log "✅ 服务已卸载"
}

# 显示状态
show_status() {
    echo "=== 后端服务状态 ==="
    echo ""

    # 检查进程
    if is_backend_running; then
        echo "状态: ✅ 运行中"
        echo "PID: $(pgrep -f 'uvicorn.*8000')"
        echo "端口: 8000"
        echo ""
        echo "进程详情:"
        ps -p "$(pgrep -f 'uvicorn.*8000')" -o pid,ppid,etime,command
    else
        echo "状态: ❌ 未运行"
    fi

    echo ""
    echo "=== launchd 服务状态 ==="
    if launchctl list | grep -q "com.wyckoff.backend"; then
        echo "launchd: ✅ 已安装"
        launchctl list | grep "com.wyckoff.backend"
    else
        echo "launchd: ❌ 未安装"
    fi

    echo ""
    echo "=== 最近日志 ==="
    if [ -f "$LOG_FILE" ]; then
        tail -10 "$LOG_FILE"
    else
        echo "守护进程日志不存在"
    fi
}

# 主程序
case "$1" in
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    restart)
        restart_backend
        ;;
    status)
        show_status
        ;;
    watch)
        run_guardian
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    *)
        echo "威科夫后端守护进程"
        echo ""
        echo "用法: $0 {start|stop|restart|status|watch|install|uninstall}"
        echo ""
        echo "命令:"
        echo "  start     - 启动后端服务"
        echo "  stop      - 停止后端服务"
        echo "  restart   - 重启后端服务"
        echo "  status    - 查看服务状态"
        echo "  watch     - 运行守护进程（监控模式）"
        echo "  install   - 安装为 launchd 系统服务（推荐）"
        echo "  uninstall - 卸载 launchd 系统服务"
        echo ""
        echo "示例:"
        echo "  $0 install    # 安装系统服务，开机自启"
        echo "  $0 status     # 查看运行状态"
        echo "  $0 watch     # 手动运行守护进程（测试用）"
        exit 1
        ;;
esac
