#!/bin/bash
# 批量更新所有股票的多周期数据

API_BASE="http://localhost:8000/api/v1"

# 股票列表
stocks=("000001" "000002" "000725" "600000" "600036" "600519" "688052" "688234")

# 时间周期列表
timeframes=("weekly" "monthly" "30" "60")

echo "=== 批量更新股票多周期数据 ==="
echo ""

for stock in "${stocks[@]}"; do
    echo "处理股票: $stock"

    for timeframe in "${timeframes[@]}"; do
        echo "  - 更新 $timeframe 数据..."
        result=$(curl -s -X POST "$API_BASE/stocks/$stock/update?timeframe=$timeframe")

        if echo "$result" | grep -q "成功"; then
            echo "    ✓ $timeframe 更新成功"
        else
            echo "    ✗ $timeframe 更新失败: $result"
        fi

        # 避免请求过快
        sleep 1
    done

    echo ""
done

echo "=== 批量更新完成 ==="

# 显示统计结果
echo ""
echo "=== 数据统计 ==="
cd "/Users/dirllx/Claude Code/wyckoff-stock-analyzer" && sqlite3 wyckoff.db "
SELECT
    code as '股票代码',
    SUM(CASE WHEN timeframe = 'daily' THEN 1 ELSE 0 END) as '日线',
    SUM(CASE WHEN timeframe = 'weekly' THEN 1 ELSE 0 END) as '周线',
    SUM(CASE WHEN timeframe = 'monthly' THEN 1 ELSE 0 END) as '月线',
    SUM(CASE WHEN timeframe = '30' THEN 1 ELSE 0 END) as '30分钟',
    SUM(CASE WHEN timeframe = '60' THEN 1 ELSE 0 END) as '60分钟'
FROM (
    SELECT s.code, q.timeframe
    FROM stocks s
    LEFT JOIN stock_quotes q ON s.id = q.stock_id
    WHERE s.code IN ('000001', '000002', '000725', '600000', '600036', '600519', '688052', '688234')
)
GROUP BY code
ORDER BY code;
"
