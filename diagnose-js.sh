#!/bin/bash
# 完整的JavaScript问题诊断脚本

echo "=========================================="
echo "JavaScript问题诊断"
echo "=========================================="
echo ""

# 1. 检查前端服务
echo "1. 检查前端服务..."
FRONTEND_PID=$(ps aux | grep "python3.*http.server 3000" | grep -v grep | awk '{print $2}')
if [ -n "$FRONTEND_PID" ]; then
    echo "   ✓ 前端服务运行中 (PID: $FRONTEND_PID)"
else
    echo "   ✗ 前端服务未运行"
    echo ""
    echo "启动前端服务..."
    cd /root/.openclaw/workspace/wyckoff-stock-analyzer && bash start-frontend.sh
    sleep 2
fi

# 2. 测试页面访问
echo ""
echo "2. 测试页面访问..."
PAGES=(
    "http://localhost:3000"
    "http://localhost:3000/basic-test.html"
    "http://localhost:3000/button-test.html"
    "http://localhost:3000/log-test.html"
)

for page in "${PAGES[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$page")
    if [ "$STATUS" = "200" ]; then
        echo "   ✓ $page (HTTP $STATUS)"
    else
        echo "   ✗ $page (HTTP $STATUS)"
    fi
done

# 3. 检查JavaScript语法
echo ""
echo "3. 检查JavaScript语法..."
cd /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend

# 检查Script标签
SCRIPT_START=$(grep -c '<script[^>]*>' index.html)
SCRIPT_END=$(grep -c '</script>' index.html)

if [ "$SCRIPT_START" -eq "$SCRIPT_END" ]; then
    echo "   ✓ Script标签匹配 (${SCRIPT_START}对)"
else
    echo "   ✗ Script标签不匹配 (开始:${SCRIPT_START}, 结束:${SCRIPT_END})"
fi

# 检查括号
OPEN_BRACE=$(grep -o '{' index.html | wc -l)
CLOSE_BRACE=$(grep -o '}' index.html | wc -l)

if [ "$OPEN_BRACE" -eq "$CLOSE_BRACE" ]; then
    echo "   ✓ 大括号匹配 (${OPEN_BRACE}对)"
else
    echo "   ✗ 大括号不匹配 (开:${OPEN_BRACE}, 闭:${CLOSE_BRACE})"
fi

# 4. 检查关键函数定义
echo ""
echo "4. 检查关键函数定义..."
FUNCTIONS=("addLog" "updateLogDisplay" "toggleLog" "showTab" "analyzeStock")
for func in "${FUNCTIONS[@]}"; do
    COUNT=$(grep -c "function $func" index.html)
    if [ "$COUNT" -eq 1 ]; then
        echo "   ✓ $func 函数 (1个定义)"
    elif [ "$COUNT" -eq 0 ]; then
        echo "   ✗ $func 函数未定义"
    else
        echo "   ⚠ $func 函数有 $COUNT 个定义"
    fi
done

# 5. 检查DOM元素ID
echo ""
echo "5. 检查关键DOM元素ID..."
ELEMENTS=("stockCode" "timeframe" "analyzeResult" "logArea" "overallStatusDot" "overallStatusText" "dbStatusDot" "dbText" "redisStatusDot" "redisText")
for elem in "${ELEMENTS[@]}"; do
    COUNT=$(grep -c "id=\"$elem\"" index.html)
    if [ "$COUNT" -ge 1 ]; then
        echo "   ✓ $elem 存在 (${COUNT}个)"
    else
        echo "   ✗ $elem 不存在"
    fi
done

# 6. 检查事件绑定
echo ""
echo "6. 检查事件绑定..."
if grep -q "window.addEventListener('DOMContentLoaded'" index.html; then
    echo "   ✓ DOMContentLoaded事件已绑定"
else
    echo "   ✗ DOMContentLoaded事件未绑定"
fi

if grep -q "window.addEventListener('error'" index.html; then
    echo "   ✓ error事件已绑定"
else
    echo "   ✗ error事件未绑定"
fi

# 7. 测试API连接
echo ""
echo "7. 测试API连接..."
API_STATUS=$(curl -s http://localhost:8000/api/v1/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))" 2>/dev/null)
if [ "$API_STATUS" = "healthy" ]; then
    echo "   ✓ API健康状态: $API_STATUS"
else
    echo "   ✗ API健康状态: $API_STATUS"
fi

# 8. 创建诊断报告
echo ""
echo "8. 创建诊断报告..."
REPORT_FILE="/tmp/js_diagnostic_$(date +%Y%m%d_%H%M%S).txt"
{
    echo "JavaScript诊断报告"
    echo "===================="
    echo "诊断时间: $(date)"
    echo ""
    echo "服务状态:"
    echo "  前端服务: $([ -n "$FRONTEND_PID" ] && echo "运行中" || echo "未运行")"
    echo ""
    echo "测试页面:"
    for page in "${PAGES[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$page")
        echo "  $page: HTTP $STATUS"
    done
    echo ""
    echo "建议测试步骤:"
    echo "  1. 访问 http://45.153.246.2:3000/basic-test.html"
    echo "  2. 点击所有测试按钮"
    echo "  3. 查看控制台是否有错误"
    echo "  4. 如果basic-test正常，访问 http://45.153.246.2:3000/button-test.html"
    echo "  5. 如果所有测试都正常，访问主页面 http://45.153.246.2:3000"
} > "$REPORT_FILE"
echo "   ✓ 诊断报告已保存: $REPORT_FILE"

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "测试页面地址:"
echo "  基础测试: http://45.153.246.2:3000/basic-test.html"
echo "  按钮测试: http://45.153.246.2:3000/button-test.html"
echo "  日志测试: http://45.153.246.2:3000/log-test.html"
echo "  主页面:   http://45.153.246.2:3000"
echo ""
echo "诊断报告: $REPORT_FILE"
