#!/bin/bash
# 启动脚本 - 威科夫股票分析系统

cd /root/.openclaw/workspace/wyckoff-stock-analyzer

# 激活虚拟环境
source backend/venv/bin/activate

# 设置Python路径
export PYTHONPATH=/root/.openclaw/workspace/wyckoff-stock-analyzer/backend:$PYTHONPATH

# 启动服务
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/wyckoff-api.log 2>&1 &

echo "服务已启动，日志文件: /tmp/wyckoff-api.log"
echo "API文档: http://localhost:8000/docs"
echo "健康检查: http://localhost:8000/api/v1/health"
