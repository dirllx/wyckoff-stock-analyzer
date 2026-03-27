#!/bin/bash

cd "/Users/dirllx/Claude Code/wyckoff-stock-analyzer"

echo "=== 完整诊断 ==="
echo ""

# 1. 检查服务器是否运行
echo "1. 检查服务器状态..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "   ✓ 后端服务器运行中"
else
    echo "   ✗ 后端服务器未运行！"
    exit 1
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✓ 前端服务器运行中"
else
    echo "   ✗ 前端服务器未运行！"
    exit 1
fi

echo ""
echo "=== 诊断完成 ==="
