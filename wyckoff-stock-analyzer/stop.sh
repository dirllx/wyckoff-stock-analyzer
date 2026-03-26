#!/bin/bash

# Wyckoff Stock Analyzer 停止脚本

echo "正在停止威科夫股票分析系统..."

# 停止 uvicorn 进程
pkill -f "uvicorn app.main:app"

echo "服务已停止"
