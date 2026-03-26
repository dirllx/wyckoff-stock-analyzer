#!/bin/bash

# Wyckoff Stock Analyzer - 前端停止脚本

echo "正在停止前端服务..."

# 停止前端 HTTP 服务器
if ps aux | grep -v grep | grep "python3 -m http.server 3000" > /dev/null; then
    pkill -f "python3 -m http.server 3000"
    echo "✅ 前端服务已停止"
else
    echo "前端服务未运行"
fi
