#!/bin/bash

cd "/Users/dirllx/Claude Code/wyckoff-stock-analyzer"

echo "=== 检查前端文件 ==="

# 检查图表库文件是否存在
echo "1. 检查图表库文件..."
if [ -f "frontend/lightweight-charts.standalone.production.js" ]; then
    echo "   ✓ 图表库文件存在"
    echo "   文件大小: $(du -h frontend/lightweight-charts.standalone.production.js | cut -f1)"
else
    echo "   ✗ 图表库文件不存在！"
    exit 1
fi

# 检查HTML中的script标签
echo ""
echo "2. 检查HTML中的script标签..."
if grep -q "lightweight-charts.standalone.production.js" frontend/index.html; then
    echo "   ✓ HTML中引用了图表库"
else
    echo "   ✗ HTML中没有引用图表库！"
    exit 1
fi

# 检查容器ID定义
echo ""
echo "3. 检查容器ID定义..."
if grep -q 'id="mainChart"' frontend/index.html; then
    echo "   ✓ mainChart容器存在"
else
    echo "   ✗ mainChart容器不存在！"
fi

if grep -q 'id="volumeChart"' frontend/index.html; then
    echo "   ✓ volumeChart容器存在"
else
    echo "   ✗ volumeChart容器不存在！"
fi

# 检查renderCharts函数
echo ""
echo "4. 检查renderCharts函数..."
if grep -q "function renderCharts()" frontend/index.html; then
    echo "   ✓ renderCharts函数存在"
else
    echo "   ✗ renderCharts函数不存在！"
fi

# 检查useTableMode变量
echo ""
echo "5. 检查useTableMode默认值..."
if grep -q "let useTableMode = false" frontend/index.html; then
    echo "   ✓ useTableMode默认为false（图表模式）"
else
    echo "   ✗ useTableMode不是false！"
fi

echo ""
echo "=== 检查完成 ==="
