#!/usr/bin/env python3
"""
详细检查688234的MA计算问题
"""
import pandas as pd
from sqlalchemy import create_engine

# 连接数据库
DATABASE_URL = "sqlite:////Users/dirllx/Claude Code/wyckoff-stock-analyzer/wyckoff.db"
engine = create_engine(DATABASE_URL)

# 查询688234的所有数据
query = """
SELECT q.date, q.close, q.ma5, q.ma10, q.ma20, q.ma60
FROM stock_quotes q
JOIN stocks s ON q.stock_id = s.id
WHERE s.code = '688234' AND q.timeframe = 'daily'
ORDER BY q.date ASC
"""

df = pd.read_sql(query, engine)
df['date'] = pd.to_datetime(df['date'])

print(f"688234 总共有 {len(df)} 个交易日的数据\n")
print("=" * 80)
print("所有数据：")
print("=" * 80)

for i, row in df.iterrows():
    print(f"\n第{i+1}天 {row['date'].strftime('%Y-%m-%d')}")
    print(f"  收盘价: {row['close']:.2f}")
    print(f"  MA5:   {row['ma5']:.4f}", end='')
    if i < 4:
        print(f"  (⚠️ 数据不足)")
    else:
        print(f"  (✅)")

    print(f"  MA10:  {row['ma10']:.4f}", end='')
    if i < 9:
        print(f"  (⚠️ 数据不足)")
    else:
        print(f"  (✅)")

    print(f"  MA20:  {row['ma20']:.4f}", end='')
    if i < 19:
        print(f"  (⚠️ 数据不足，只有{i+1}天)")
    else:
        print(f"  (✅)")

    print(f"  MA60:  {row['ma60']:.4f}", end='')
    if i < 59:
        print(f"  (⚠️ 数据不足，只有{i+1}天)")
    else:
        print(f"  (✅)")

# 详细检查2025-03-27的MA60计算
print("\n" + "=" * 80)
print("详细检查 2025-03-27 的MA60计算")
print("=" * 80)

target_date = pd.to_datetime('2025-03-27')
target_idx = df[df['date'] == target_date].index[0]

# 实际可用的数据点
available_data = target_idx + 1
print(f"\n从上市到3.27总共: {available_data} 个交易日")
print(f"MA60需要: 60个交易日")
print(f"缺少: {60 - available_data} 个交易日\n")

# pandas rolling with min_periods=1 的行为
print("使用 min_periods=1 的行为：")
print(f"  当只有{available_data}个数据点时，会计算所有{available_data}个点的平均值")

# 手动计算
all_prices = df.loc[0:target_idx, 'close']
manual_ma60 = all_prices.mean()
print(f"\n手动计算MA60 (所有{available_data}天的平均值): {manual_ma60:.4f}")
print(f"数据库中的MA60: {df.loc[target_idx, 'ma60']:.4f}")
print(f"差异: {abs(df.loc[target_idx, 'ma60'] - manual_ma60):.4f}")
