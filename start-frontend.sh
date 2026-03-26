#!/bin/bash
# 启动前端静态服务器

cd "/Users/dirllx/Claude Code/wyckoff-stock-analyzer/frontend"

# 使用Python启动HTTP服务器
nohup python3 -m http.server 3000 > /tmp/frontend.log 2>&1 &

echo "前端服务已启动"
echo "访问地址: http://localhost:3000"
echo "日志文件: /tmp/frontend.log"
