#!/bin/bash
# 测试前端功能

echo "=== 前端功能测试 ==="
echo ""

# 测试1: 检查页面是否能访问
echo "测试1: 检查页面访问"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/index.html)
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ 页面访问正常 (HTTP $HTTP_CODE)"
else
    echo "  ❌ 页面访问失败 (HTTP $HTTP_CODE)"
fi

# 测试2: 检查后端API健康检查
echo ""
echo "测试2: 检查后端API"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health)
if [ "$HEALTH_CODE" = "200" ]; then
    echo "  ✅ 后端API正常 (HTTP $HEALTH_CODE)"
else
    echo "  ❌ 后端API失败 (HTTP $HEALTH_CODE)"
fi

# 测试3: 检查图表库文件
echo ""
echo "测试3: 检查图表库文件"
if [ -f "/root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/lightweight-charts.standalone.production.js" ]; then
    FILE_SIZE=$(ls -lh /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/lightweight-charts.standalone.production.js | awk '{print $5}')
    echo "  ✅ 图表库文件存在 ($FILE_SIZE)"
else
    echo "  ❌ 图表库文件不存在"
fi

# 测试4: 检查HTML中图表库引用
echo ""
echo "测试4: 检查HTML中图表库引用"
CHART_REF=$(grep -o "./lightweight-charts.standalone.production.js" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html)
if [ -n "$CHART_REF" ]; then
    echo "  ✅ 图表库引用正确 (本地文件)"
else
    echo "  ❌ 图表库引用错误"
fi

# 测试5: 检查服务进程
echo ""
echo "测试5: 检查服务进程"
FRONTEND_PID=$(ps aux | grep "python3 -m http.server 3000" | grep -v grep | awk '{print $2}')
BACKEND_PID=$(ps aux | grep "uvicorn.*8000" | grep -v grep | awk '{print $2}')

if [ -n "$FRONTEND_PID" ]; then
    echo "  ✅ 前端服务运行中 (PID: $FRONTEND_PID)"
else
    echo "  ❌ 前端服务未运行"
fi

if [ -n "$BACKEND_PID" ]; then
    echo "  ✅ 后端服务运行中 (PID: $BACKEND_PID)"
else
    echo "  ❌ 后端服务未运行"
fi

echo ""
echo "=== 测试完成 ==="
echo ""
echo "访问地址: http://45.153.246.2:3000"
