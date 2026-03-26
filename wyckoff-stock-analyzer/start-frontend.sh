#!/bin/bash

# Wyckoff Stock Analyzer - 前端启动脚本

cd /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend

# 检查是否已经在运行
if ps aux | grep -v grep | grep "python3 -m http.server 3000" > /dev/null; then
    echo "前端服务已在运行中"
    exit 0
fi

# 启动前端静态服务器
echo "正在启动前端服务..."
nohup python3 -m http.server 3000 > /tmp/frontend.log 2>&1 &

# 等待服务启动
sleep 2

# 检查服务状态
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/index.html)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 前端服务启动成功！"
    echo ""
    echo "访问地址: http://localhost:3000"
    echo "日志文件: /tmp/frontend.log"
else
    echo "❌ 前端服务启动失败 (HTTP $HTTP_CODE)"
    exit 1
fi
