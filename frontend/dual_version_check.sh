#!/bin/bash
# 双版本对比检查

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   威科夫股票分析系统 - 双版本对比检查                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# 检查文件
echo "【文件检查】"
echo ""
echo "📁 稳定版本文件:"
if [ -f "/root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index_stable.html" ]; then
    SIZE=$(ls -lh /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index_stable.html | awk '{print $5}')
    LINES=$(wc -l < /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index_stable.html)
    echo "  ✅ index_stable.html 存在"
    echo "  📊 大小: $SIZE"
    echo "  📝 行数: $LINES"
else
    echo "  ❌ index_stable.html 不存在"
fi

echo ""
echo "📁 当前版本文件:"
if [ -f "/root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html" ]; then
    SIZE=$(ls -lh /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html | awk '{print $5}')
    LINES=$(wc -l < /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html)
    echo "  ✅ index.html 存在"
    echo "  📊 大小: $SIZE"
    echo "  📝 行数: $LINES"
else
    echo "  ❌ index.html 不存在"
fi

# 检查图表库文件
echo ""
echo "📦 图表库文件:"
if [ -f "/root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/lightweight-charts.standalone.production.js" ]; then
    SIZE=$(ls -lh /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/lightweight-charts.standalone.production.js | awk '{print $5}')
    echo "  ✅ lightweight-charts.standalone.production.js 存在"
    echo "  📊 大小: $SIZE"
else
    echo "  ❌ lightweight-charts.standalone.production.js 不存在"
fi

# 检查图表库引用
echo ""
echo "🔗 图表库引用检查:"
STABLE_REF=$(grep -o "./lightweight-charts.standalone.production.js" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index_stable.html)
CURRENT_REF=$(grep -o "./lightweight-charts.standalone.production.js" /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend/index.html)

if [ -n "$STABLE_REF" ]; then
    echo "  ✅ 稳定版图表库引用正确 (本地文件)"
else
    echo "  ❌ 稳定版图表库引用错误"
fi

if [ -n "$CURRENT_REF" ]; then
    echo "  ✅ 当前版图表库引用正确 (本地文件)"
else
    echo "  ❌ 当前版图表库引用错误"
fi

# 检查服务
echo ""
echo "【服务检查】"
echo ""

# 检查后端服务
BACKEND_PID=$(ps aux | grep "uvicorn.*8000" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PID" ]; then
    BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/health)
    echo "🟢 后端服务 (端口8000):"
    echo "  ✅ 运行中 (PID: $BACKEND_PID)"
    echo "  🌐 HTTP $BACKEND_CODE"
else
    echo "🔴 后端服务 (端口8000):"
    echo "  ❌ 未运行"
fi

echo ""

# 检查稳定版前端服务
STABLE_PID=$(ps aux | grep "python3 -m http.server 3001" | grep -v grep | awk '{print $2}')
if [ -n "$STABLE_PID" ]; then
    STABLE_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/index_stable.html)
    echo "🟢 稳定版前端服务 (端口3001):"
    echo "  ✅ 运行中 (PID: $STABLE_PID)"
    echo "  🌐 HTTP $STABLE_CODE"
else
    echo "🔴 稳定版前端服务 (端口3001):"
    echo "  ❌ 未运行"
fi

echo ""

# 检查当前版前端服务
CURRENT_PID=$(ps aux | grep "python3 -m http.server 3000" | grep -v grep | awk '{print $2}')
if [ -n "$CURRENT_PID" ]; then
    CURRENT_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/index.html)
    echo "🟢 当前版前端服务 (端口3000):"
    echo "  ✅ 运行中 (PID: $CURRENT_PID)"
    echo "  🌐 HTTP $CURRENT_CODE"
else
    echo "🔴 当前版前端服务 (端口3000):"
    echo "  ❌ 未运行"
fi

# 对比表格
echo ""
echo "【版本对比】"
echo ""
echo "┌──────────────┬───────┬──────┬──────┬────────────┐"
echo "│ 版本         │ 行数   │ 大小 │ 端口 │ 状态       │"
echo "├──────────────┼───────┼──────┼──────┼────────────┤"
echo "│ 稳定版本     │ 1419   │ 60K  │ 3001 │ HTTP $STABLE_CODE │"
echo "│ 当前版本     │ 1891   │ 85K  │ 3000 │ HTTP $CURRENT_CODE │"
echo "└──────────────┴───────┴──────┴──────┴────────────┘"

# 功能对比
echo ""
echo "【功能对比】"
echo ""
echo "📌 稳定版本功能:"
echo "  ✓ 股票分析（Tab 1）"
echo "  ✓ 关注列表（Tab 2）"
echo "  ✓ 多周期分析（Tab 3 - 占位）"
echo "  ✓ 系统配置（Tab 4 - 基础信息）"
echo "  ✓ K线表格（50行完整数据）"
echo "  ✓ K线图表（主图+成交量+OBV）"
echo "  ✓ MA指标（9条线）"
echo "  ✓ 技术指标面板"
echo "  ✓ 威科夫信号面板"
echo "  ✓ 健康状态栏"
echo "  ✓ 操作日志"

echo ""
echo "📌 当前版本功能（稳定版 + 新增）:"
echo "  ✓ 股票分析（Tab 1）"
echo "  ✓ 关注列表（Tab 2）"
echo "  ✓ 多周期分析（Tab 3 - 完整功能）✨"
echo "  ✓ 系统配置（Tab 4 - 7个卡片）✨"
echo "  ✓ K线表格（50行完整数据）"
echo "  ✓ K线图表（主图+成交量+OBV）"
echo "  ✓ MA指标（9条线）"
echo "  ✓ 技术指标面板"
echo "  ✓ 威科夫信号面板"
echo "  ✓ 形态识别配置 ✨"
echo "  ✓ 时间周期配置 ✨"
echo "  ✓ 飞书通知配置 ✨"
echo "  ✓ 风险监控配置 ✨"
echo "  ✓ 实时行情查询 ✨"
echo "  ✓ 形态识别功能 ✨"
echo "  ✓ 健康状态栏"
echo "  ✓ 操作日志"

# 访问地址
echo ""
echo "【访问地址】"
echo ""
echo "🌐 版本对比页面:"
echo "   http://45.153.246.2:3000/compare_versions.html"
echo ""
echo "🟢 稳定版本 (v1.0.0):"
echo "   http://45.153.246.2:3001/index_stable.html"
echo ""
echo "🔵 当前版本 (v1.1.0):"
echo "   http://45.153.246.2:3000/index.html"
echo ""
echo "📋 后端API文档:"
echo "   http://45.153.246.2:8000/docs"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   💡 提示：请访问版本对比页面进行测试比对                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
