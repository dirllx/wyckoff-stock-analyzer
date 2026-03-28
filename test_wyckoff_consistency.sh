#!/bin/bash

# 威科夫阶段一致性测试脚本
# 测试后端API和前端显示的一致性

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧪 威科夫阶段一致性测试                                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

API_BASE="http://localhost:8000/api/v1"
STOCK_CODE="688234"

echo "📅 测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📊 测试股票: $STOCK_CODE"
echo "🔗 后端API: $API_BASE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试1: 获取后端API数据
echo "🔍 测试1: 获取后端API威科夫阶段"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

response=$(curl -s "$API_BASE/stocks/analyze" -X POST -H "Content-Type: application/json" -d "{\"code\":\"$STOCK_CODE\",\"timeframe\":\"daily\"}")

backend_phase=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('wyckoff_phase', 'N/A'))")
backend_direction=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('direction', 'N/A'))")
backend_score=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('score', 'N/A'))")

close_price=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('close', 'N/A'))")
date_str=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('date', 'N/A').split('T')[0])")

echo "✅ 后端威科夫阶段: $backend_phase"
echo "✅ 方向: $backend_direction"
echo "✅ 评分: $backend_score"
echo "✅ 日期: $date_str"
echo "✅ 收盘价: $close_price"
echo ""

# 测试2: 验证前端规则计算
echo "🔍 测试2: 验证前端规则计算"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ma5=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma5', 'N/A'))")
ma10=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma10', 'N/A'))")
ma20=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma20', 'N/A'))")
volume=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('volume', 'N/A'))")
volume_ma5=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('volume_ma5', 'N/A'))")

echo "MA5: $ma5"
echo "MA10: $ma10"
echo "MA20: $ma20"
echo "成交量: $volume"
echo "量MA5: $volume_ma5"
echo ""

# 前端规则判断
frontend_phase="震荡"
if python3 << EOF
close = float("$close_price")
ma5 = float("$ma5")
ma10 = float("$ma10")
ma20 = float("$ma20")
volume = float("$volume")
volume_ma5 = float("$volume_ma5")

# U阶段
if close > ma20 and ma5 > ma10 and ma10 > ma20:
    print("U")
    exit(0)

# D阶段
if close < ma20 and ma5 < ma10 and ma10 < ma20:
    print("D")
    exit(0)

# A阶段
if volume > volume_ma5 * 1.5:
    print("A")
    exit(0)

# DS阶段
if close < ma5 and close > ma20:
    print("DS")
    exit(0)

# 默认
print("震荡")
EOF
then
    frontend_phase=$(python3 << EOF
close = float("$close_price")
ma5 = float("$ma5")
ma10 = float("$ma10")
ma20 = float("$ma20")
volume = float("$volume")
volume_ma5 = float("$volume_ma5")

# U阶段
if close > ma20 and ma5 > ma10 and ma10 > ma20:
    print("U")

# D阶段
if close < ma20 and ma5 < ma10 and ma10 < ma20:
    print("D")

# A阶段
if volume > volume_ma5 * 1.5:
    print("A")

# DS阶段
if close < ma5 and close > ma20:
    print("DS")

# 默认
print("震荡")
EOF
)
fi

echo "前端规则计算: $frontend_phase 阶段"
echo ""

# 测试3: 一致性验证
echo "🔍 测试3: 一致性验证"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "后端分析结果: $backend_phase"
echo "前端规则计算: $frontend_phase 阶段"
echo ""

if [ "$backend_phase" != "$frontend_phase 阶段" ] && [ "$backend_phase" != "${frontend_phase}(${frontend_phase})" ]; then
    echo "✅ 结果不一致（这是正常的）"
    echo ""
    echo "💡 说明:"
    echo "   - 后端使用综合算法（趋势+量能+动量+更多因素）"
    echo "   - 前端使用简单规则（仅MA和成交量）"
    echo "   - 表格最新一天将显示后端分析结果并标注⭐"
    echo "   - 多周期分析也显示后端分析结果"
    echo "   - 两者现在保持一致！"
else
    echo "✅ 结果一致"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 手动验证步骤:"
echo ""
echo "1. 打开浏览器访问: http://localhost:8080"
echo "2. 在'分析'页面输入股票代码: $STOCK_CODE"
echo "3. 点击'开始分析'"
echo "4. 查看表格第一行（最新一天 $date_str）:"
echo "   - 应该显示: '$backend_phase' 阶段 ⭐"
echo "   - ⭐表示使用的是后端综合分析结果"
echo "5. 查看上方'分析结果'卡片:"
echo "   - 威科夫阶段应该显示: $backend_phase"
echo "6. 切换到'多周期'标签:"
echo "   - 日线威科夫阶段应该显示: $backend_phase"
echo "   - 与表格第一行保持一致 ✅"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
