#!/usr/bin/env python3
"""
检查688234在2025-03-27前后的数据
"""
import pandas as pd
from sqlalchemy import create_engine

# 连接数据库
DATABASE_URL = "sqlite:////Users/dirllx/Claude Code/wyckoff-stock-analyzer/wyckoff.db"
engine = create_engine(DATABASE_URL)

# 查询688234在2025-03-27前后的数据
query = """
SELECT q.date, q.close, q.ma5, q.ma10, q.ma20, q.ma60
FROM stock_quotes q
JOIN stocks s ON q.stock_id = s.id
WHERE s.code = '688234' AND q.timeframe = 'daily'
  AND q.date >= '2025-03-01'
  AND q.date <= '2025-03-31'
ORDER BY q.date ASC
"""

df = pd.read_sql(query, engine)
df['date'] = pd.to_datetime(df['date'])

print(f"688234 在2025年3月的数据（共{len(df)}个交易日）\n")
print("=" * 100)

for i, row in df.iterrows():
    print(f"\n{row['date'].strftime('%Y-%m-%d')} ({i+1})")
    print(f"  收盘: {row['close']:7.2f}  MA5: {row['ma5']:7.4f}  MA10: {row['ma10']:7.4f}  MA20: {row['ma20']:7.4f}  MA60: {row['ma60']:7.4f}")

# 详细验证2025-03-27
print("\n" + "=" * 100)
print("验证 2025-03-27 的MA计算")
print("=" * 100)

target_date = pd.to_datetime('2025-03-27')
all_data_query = """
SELECT q.date, q.close
FROM stock_quotes q
JOIN stocks s ON q.stock_id = s.id
WHERE s.code = '688234' AND q.timeframe = 'daily'
  AND q.date <= '2025-03-27'
ORDER BY q.date DESC
LIMIT 500
"""

all_df = pd.read_sql(all_data_query, engine)
all_df['date'] = pd.to_datetime(all_df['date'])
all_df = all_df.sort_values('date').reset_index(drop=True)

# 找到2025-03-27的索引
target_idx = all_df[all_df['date'] == target_date].index[0]

print(f"\n截至2025-03-27，总共有{target_idx + 1}个交易日")

# MA5
start_idx = max(0, target_idx - 4)
ma5_prices = all_df.loc[start_idx:target_idx, 'close']
manual_ma5 = ma5_prices.mean()
db_ma5 = df[df['date'] == target_date]['ma5'].values[0]
print(f"\nMA5 (最近5天):")
print(f"  手动计算: {manual_ma5:.4f}")
print(f"  数据库:   {db_ma5:.4f}")
print(f"  差异:     {abs(manual_ma5 - db_ma5):.4f} {'✅' if abs(manual_ma5 - db_ma5) < 0.01 else '❌'}")

# MA10
start_idx = max(0, target_idx - 9)
ma10_prices = all_df.loc[start_idx:target_idx, 'close']
manual_ma10 = ma10_prices.mean()
db_ma10 = df[df['date'] == target_date]['ma10'].values[0]
print(f"\nMA10 (最近10天):")
print(f"  手动计算: {manual_ma10:.4f}")
print(f"  数据库:   {db_ma10:.4f}")
print(f"  差异:     {abs(manual_ma10 - db_ma10):.4f} {'✅' if abs(manual_ma10 - db_ma10) < 0.01 else '❌'}")

# MA20
start_idx = max(0, target_idx - 19)
ma20_prices = all_df.loc[start_idx:target_idx, 'close']
manual_ma20 = ma20_prices.mean()
db_ma20 = df[df['date'] == target_date]['ma20'].values[0]
print(f"\nMA20 (最近20天):")
print(f"  手动计算: {manual_ma20:.4f}")
print(f"  数据库:   {db_ma20:.4f}")
print(f"  差异:     {abs(manual_ma20 - db_ma20):.4f} {'✅' if abs(manual_ma20 - db_ma20) < 0.01 else '❌'}")
print(f"  使用的日期范围: {all_df.loc[start_idx, 'date'].strftime('%Y-%m-%d')} 到 {all_df.loc[target_idx, 'date'].strftime('%Y-%m-%d')}")

# MA60
start_idx = max(0, target_idx - 59)
ma60_prices = all_df.loc[start_idx:target_idx, 'close']
manual_ma60 = ma60_prices.mean()
db_ma60 = df[df['date'] == target_date]['ma60'].values[0]
print(f"\nMA60 (最近60天):")
print(f"  手动计算: {manual_ma60:.4f}")
print(f"  数据库:   {db_ma60:.4f}")
print(f"  差异:     {abs(manual_ma60 - db_ma60):.4f} {'✅' if abs(manual_ma60 - db_ma60) < 0.01 else '❌'}")
print(f"  使用的日期范围: {all_df.loc[start_idx, 'date'].strftime('%Y-%m-%d')} 到 {all_df.loc[target_idx, 'date'].strftime('%Y-%m-%d')}")
