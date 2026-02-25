#!/bin/bash
# 验证日志系统功能

echo "=========================================="
echo "日志系统功能验证"
echo "=========================================="
echo ""

# 检查前端服务
echo "1. 检查前端服务..."
FRONTEND_PID=$(ps aux | grep "python3.*http.server 3000" | grep -v grep | awk '{print $2}')
if [ -n "$FRONTEND_PID" ]; then
    echo "   ✓ 前端服务运行中 (PID: $FRONTEND_PID)"
else
    echo "   ✗ 前端服务未运行"
    exit 1
fi

# 测试前端页面访问
echo ""
echo "2. 测试前端页面访问..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✓ 前端页面可访问 (HTTP $HTTP_STATUS)"
else
    echo "   ✗ 前端页面无法访问 (HTTP $HTTP_STATUS)"
    exit 1
fi

# 测试日志测试页面
echo ""
echo "3. 测试日志测试页面..."
LOG_TEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/log-test.html)
if [ "$LOG_TEST_STATUS" = "200" ]; then
    echo "   ✓ 日志测试页面可访问 (HTTP $LOG_TEST_STATUS)"
else
    echo "   ✗ 日志测试页面无法访问 (HTTP $LOG_TEST_STATUS)"
fi

# 检查JavaScript语法
echo ""
echo "4. 检查JavaScript语法..."
# 简单的语法检查
if grep -q "let operationLogs = \[\];" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html; then
    echo "   ✓ operationLogs 数组已定义"
else
    echo "   ✗ operationLogs 数组未定义"
fi

if grep -q "function addLog" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html; then
    echo "   ✓ addLog 函数已定义"
else
    echo "   ✗ addLog 函数未定义"
fi

if grep -q "function updateLogDisplay" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html; then
    echo "   ✓ updateLogDisplay 函数已定义"
else
    echo "   ✗ updateLogDisplay 函数未定义"
fi

# 检查重复定义
echo ""
echo "5. 检查重复定义..."
ADDLOG_COUNT=$(grep -c "function addLog" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html)
if [ "$ADDLOG_COUNT" -eq 1 ]; then
    echo "   ✓ addLog 函数无重复 (1个定义)"
else
    echo "   ⚠ addLog 函数有 $ADDLOG_COUNT 个定义 (可能有重复)"
fi

UPDATELOG_COUNT=$(grep -c "function updateLogDisplay" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html)
if [ "$UPDATELOG_COUNT" -eq 1 ]; then
    echo "   ✓ updateLogDisplay 函数无重复 (1个定义)"
else
    echo "   ⚠ updateLogDisplay 函数有 $UPDATELOG_COUNT 个定义 (可能有重复)"
fi

TOGGLELOG_COUNT=$(grep -c "function toggleLog" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html)
if [ "$TOGGLELOG_COUNT" -eq 1 ]; then
    echo "   ✓ toggleLog 函数无重复 (1个定义)"
else
    echo "   ⚠ toggleLog 函数有 $TOGGLELOG_COUNT 个定义 (可能有重复)"
fi

# 检查DOMContentLoaded事件
echo ""
echo "6. 检查页面加载事件..."
if grep -q "window.addEventListener('DOMContentLoaded'" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html; then
    echo "   ✓ DOMContentLoaded 事件已绑定"
else
    echo "   ✗ DOMContentLoaded 事件未绑定"
fi

if grep -q "addLog('系统启动'" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html; then
    echo "   ✓ 页面加载时会添加系统启动日志"
else
    echo "   ✗ 页面加载时不会添加系统启动日志"
fi

echo ""
echo "=========================================="
echo "验证完成"
echo "=========================================="
echo ""
echo "测试页面地址:"
echo "  日志系统测试: http://45.153.246.2:3000/log-test.html"
echo "  主页面: http://45.153.246.2:3000"
echo ""
echo "使用说明:"
echo "1. 访问日志测试页面验证日志功能"
echo "2. 点击测试按钮查看日志是否正常显示"
echo "3. 如果日志正常显示，再访问主页面"
echo "4. 主页面加载后应自动显示'系统启动'日志"
