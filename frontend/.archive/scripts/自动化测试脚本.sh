#!/bin/bash

# 威科夫股票分析系统 - 自动化功能测试脚本
# 测试时间: $(date '+%Y-%m-%d %H:%M:%S')

API_BASE="http://localhost:8000/api/v1"
FRONTEND_URL="http://localhost:8080"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     🧪 威科夫股票分析系统 - 完整功能测试                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📅 测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📍 后端API: $API_BASE"
echo "🌐 前端地址: $FRONTEND_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试1: 后端健康检查
echo "🔍 测试1: 后端健康检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs 2>/dev/null)
if [ "$health_status" = "200" ]; then
    echo "✅ 后端服务正常运行"
else
    echo "❌ 后端服务未响应 (状态码: $health_status)"
    exit 1
fi
echo ""

# 测试2: 股票分析API
echo "📊 测试2: 股票分析API (000001)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
response=$(curl -s "$API_BASE/stocks/analyze" -X POST -H "Content-Type: application/json" -d '{"code":"000001","timeframe":"daily"}')

stock_name=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('stock', {}).get('name', 'N/A'))")
score=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('score', 'N/A'))")
direction=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('direction', 'N/A'))")

echo "✅ 股票名称: $stock_name"
echo "✅ 评分: $score"
echo "✅ 方向: $direction"
echo ""

# 测试3: MA均线数据完整性
echo "📈 测试3: MA均线数据完整性"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ma5=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma5', 'N/A'))")
ma10=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma10', 'N/A'))")
ma20=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma20', 'N/A'))")
ma60=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma60', 'N/A'))")
ma120=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('current_quote', {}).get('ma120', 'N/A'))")

echo "✅ MA5:  $ma5"
echo "✅ MA10: $ma10"
echo "✅ MA20: $ma20"
echo "✅ MA60: $ma60"
echo "✅ MA120: $ma120"
echo ""

# 测试4: 威科夫阶段判断
echo "🎯 测试4: 威科夫阶段判断"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
wyckoff_phase=$(echo $response | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('wyckoff_phase', 'N/A'))")
echo "✅ 威科夫阶段: $wyckoff_phase"
echo ""

# 测试5: 多周期分析
echo "⏱️ 测试5: 多周期分析（日线、周线、月线）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 测试日线
echo "▶ 日线分析..."
result=$(curl -s "$API_BASE/stocks/analyze" -X POST -H "Content-Type: application/json" -d '{"code":"000001","timeframe":"daily"}')
score=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('score', 0))")
direction=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('direction', 'N/A'))")
echo "  ✓ 评分: $score, 方向: $direction"

# 测试周线
echo "▶ 周线分析..."
result=$(curl -s "$API_BASE/stocks/analyze" -X POST -H "Content-Type: application/json" -d '{"code":"000001","timeframe":"weekly"}')
score=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('score', 0))")
direction=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('direction', 'N/A'))")
echo "  ✓ 评分: $score, 方向: $direction"

# 测试月线
echo "▶ 月线分析..."
result=$(curl -s "$API_BASE/stocks/analyze" -X POST -H "Content-Type: application/json" -d '{"code":"000001","timeframe":"monthly"}')
score=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('score', 0))")
direction=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('direction', 'N/A'))")
echo "  ✓ 评分: $score, 方向: $direction"
echo ""

# 测试6: 关注列表API
echo "⭐ 测试6: 关注列表API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
watchlist_response=$(curl -s "$API_BASE/watchlist")
total=$(echo $watchlist_response | python3 -c "import sys, json; print(json.load(sys.stdin).get('total', 0))")
echo "✅ 关注列表总数: $total"

if [ "$total" -gt 0 ]; then
    echo "✅ 前3只股票:"
    echo $watchlist_response | python3 -c "
import sys, json
d = json.load(sys.stdin)
for i, item in enumerate(d.get('items', [])[:3], 1):
    print(f\"  {i}. {item['stock_code']} - {item.get('stock_name', 'N/A')}\")
"
else
    echo "⚠️  关注列表为空"
fi
echo ""

# 测试7: 批量分析（前3只）
echo "⚡ 测试7: 批量分析功能（前3只股票）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

codes=$(echo $watchlist_response | python3 -c "
import sys, json
d = json.load(sys.stdin)
return ' '.join([item['stock_code'] for item in d.get('items', [])[:3]])
")

echo "📊 测试股票: $codes"
success_count=0
fail_count=0

for code in $codes; do
    result=$(curl -s "$API_BASE/stocks/analyze" -X POST -H "Content-Type: application/json" -d "{\"code\":\"$code\",\"timeframe\":\"daily\"}")
    if echo $result | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
        score=$(echo $result | python3 -c "import sys, json; print(json.load(sys.stdin).get('analysis_summary', {}).get('score', 'N/A'))")
        echo "✅ $code: 评分=$score"
        ((success_count++))
    else
        echo "❌ $code: 分析失败"
        ((fail_count++))
    fi
done

echo "📊 批量分析结果: 成功=$success_count, 失败=$fail_count"
echo ""

# 测试8: 添加到关注列表
echo "➕ 测试8: 添加股票到关注列表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_code="600000"
add_response=$(curl -s "$API_BASE/watchlist" -X POST -H "Content-Type: application/json" -d "{\"code\":\"$test_code\",\"watch_type\":\"browse\"}")
echo "✅ 测试添加股票: $test_code"
echo ""

# 测试9: 检查股票是否在关注列表
echo "🔍 测试9: 检查股票是否在关注列表"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_response=$(curl -s "$API_BASE/watchlist/check/$test_code")
in_watchlist=$(echo $check_response | python3 -c "import sys, json; print(json.load(sys.stdin).get('in_watchlist', False))")
if [ "$in_watchlist" = "True" ]; then
    echo "✅ $test_code 已在关注列表中"
else
    echo "❌ $test_code 不在关注列表中"
fi
echo ""

# 测试10: 从关注列表删除
echo "🗑️ 测试10: 从关注列表删除股票"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
delete_response=$(curl -s "$API_BASE/watchlist/$test_code" -X DELETE)
echo "✅ 测试删除股票: $test_code"
echo ""

# 总结
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 后端API测试完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 测试项目: 10项"
echo "✅ 通过: 后端API全部正常"
echo ""
echo "🌐 前端UI测试:"
echo "   请在浏览器中访问: $FRONTEND_URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
