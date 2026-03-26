#!/bin/bash

# Wyckoff Stock Analyzer - 完整测试脚本

echo "======================================"
echo "  威科夫股票分析系统 - 服务测试"
echo "======================================"
echo ""

# 测试计数器
PASS=0
FAIL=0

# 测试函数
test_service() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "测试 $name: "
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$HTTP_CODE" = "$expected" ]; then
        echo "✅ 通过 (HTTP $HTTP_CODE)"
        ((PASS++))
    else
        echo "❌ 失败 (期望 $expected, 实际 $HTTP_CODE)"
        ((FAIL++))
    fi
}

# 测试1: 后端健康检查
test_service "后端健康检查" "http://localhost:8000/api/v1/health" "200"

# 测试2: 前端首页
test_service "前端首页" "http://localhost:3000/index.html" "200"

# 测试3: 图表库文件
test_service "图表库文件" "http://localhost:3000/lightweight-charts.standalone.production.js" "200"

# 测试4: API 文档
test_service "API 文档" "http://localhost:8000/docs" "200"

# 测试5: 股票 K 线数据
echo -n "测试 股票 K 线数据: "
RESPONSE=$(curl -s "http://localhost:8000/api/v1/stocks/688234/quotes?limit=1")
if echo "$RESPONSE" | grep -q '"code":"688234"'; then
    echo "✅ 通过"
    ((PASS++))
else
    echo "❌ 失败"
    ((FAIL++))
fi

# 测试6: 检查进程
echo ""
echo "检查服务进程..."

BACKEND_PID=$(ps aux | grep "uvicorn.*8000" | grep -v grep | awk '{print $2}')
FRONTEND_PID=$(ps aux | grep "python3 -m http.server 3000" | grep -v grep | awk '{print $2}')

if [ -n "$BACKEND_PID" ]; then
    echo "  ✅ 后端服务运行中 (PID: $BACKEND_PID)"
    ((PASS++))
else
    echo "  ❌ 后端服务未运行"
    ((FAIL++))
fi

if [ -n "$FRONTEND_PID" ]; then
    echo "  ✅ 前端服务运行中 (PID: $FRONTEND_PID)"
    ((PASS++))
else
    echo "  ❌ 前端服务未运行"
    ((FAIL++))
fi

# 测试结果汇总
echo ""
echo "======================================"
echo "  测试结果汇总"
echo "======================================"
echo "  通过: $PASS"
echo "  失败: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 所有测试通过！"
    echo ""
    echo "访问地址:"
    echo "  前端界面: http://localhost:3000"
    echo "  API 文档: http://localhost:8000/docs"
    exit 0
else
    echo "⚠️  有 $FAIL 个测试失败，请检查服务状态"
    exit 1
fi
