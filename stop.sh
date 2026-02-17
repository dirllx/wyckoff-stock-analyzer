#!/bin/bash
# 停止脚本 - 威科夫股票分析系统

# 停止uvicorn服务
pkill -f "uvicorn app.main:app"

echo "服务已停止"
