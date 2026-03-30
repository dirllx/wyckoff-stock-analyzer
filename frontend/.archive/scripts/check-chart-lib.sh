#!/bin/bash
# 检查index.html中的图表库引用

cd /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend

echo "检查图表库引用..."
echo ""

# 1. 检查index.html中是否有图表库引用
echo "1. 检查script标签..."
if grep -q "lightweight-charts" index.html; then
    echo "   ✓ 找到图表库引用"
    grep -n "script src.*lightweight-charts" index.html
else
    echo "   ✗ 没有找到图表库引用"
fi

echo ""
echo "2. 检查图表库文件..."
if [ -f "lightweight-charts.standalone.production.js" ]; then
    SIZE=$(ls -lh lightweight-charts.standalone.production.js | awk '{print $5}')
    echo "   ✓ 图表库文件存在 (${SIZE})"
else
    echo "   ✗ 图表库文件不存在"
fi

echo ""
echo "3. 检查图表库文件访问..."
if [ -f "lightweight-charts.standalone.production.js" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/lightweight-charts.standalone.production.js)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "   ✓ 图表库文件可以访问 (HTTP $HTTP_CODE)"
    else
        echo "   ✗ 图表库文件无法访问 (HTTP $HTTP_CODE)"
    fi
fi

echo ""
echo "4. 检查图表库内容..."
if [ -f "lightweight-charts.standalone.production.js" ]; then
    if grep -q "LightweightCharts" lightweight-charts.standalone.production.js; then
        echo "   ✓ 图表库文件内容正确"
    else
        echo "   ✗ 图表库文件内容可能有问题"
    fi
fi

echo ""
echo "5. 对比step8和index.html的图表库引用..."
if grep -q "script src.*lightweight-charts" index.html && grep -q "script src.*lightweight-charts" step8-chart-full.html; then
    echo "   ✓ 两个文件都有图表库引用"
    echo ""
    echo "   index.html中的引用："
    grep -n "script src.*lightweight-charts" index.html
    echo ""
    echo "   step8-chart-full.html中的引用："
    grep -n "script src.*lightweight-charts" step8-chart-full.html
else
    echo "   ✗ 图表库引用不一致"
fi

echo ""
echo "检查完成"
