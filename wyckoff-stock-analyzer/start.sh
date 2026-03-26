#!/bin/bash

# Wyckoff Stock Analyzer 启动脚本

cd /root/wyckoff-stock-analyzer/backend

# 激活虚拟环境
source ../venv/bin/activate

# 启动后端服务
echo "正在启动威科夫股票分析系统后端服务..."
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/wyckoff.log 2>&1 &

# 等待服务启动
sleep 5

# 检查服务状态
echo "检查服务状态..."
curl -s http://localhost:8000/api/v1/health | python3 -m json.tool

echo ""
echo "服务已启动！"
echo "后端 API: http://localhost:8000"
echo "API 文档: http://localhost:8000/docs"
echo "日志文件: /tmp/wyckoff.log"
