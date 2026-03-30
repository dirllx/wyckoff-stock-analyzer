#!/usr/bin/env python3
"""
验证688234在2026-03-27的MA计算
"""
import sqlite3
import pandas as pd

# 连接数据库
conn = sqlite3.connect('/Users/dirllx/Claude Code/wyckoff-stock-analyzer/wyckoff.db')

# 查询688234的所有历史日线数据
query = """
SELECT date, close
FROM stock_quotes
WHERE stock_id = (SELECT id FROM stocks WHERE code = '688234')
  AND timeframe = 'daily'
  AND date <= '2026-03-27'
ORDER BY date ASC
"""

df = pd.read_sql(query, conn)

print(f"总交易日数: {len(df)}")
print(f"日期范围: {df['date'].min()} 到 {df['date'].max()}")

# 找到2026-03-27
target_date_str = '2026-03-27 00:00:00'
target_idx = df[df['date'] == target_date_str].index[0]

print(f"\n2026-03-27收盘价: {df.loc[target_idx, 'close']:.2f}")

# 验证各种MA
close_prices = df['close'].values

# MA10
start_idx = max(0, target_idx - 9)
ma10_prices = close_prices[start_idx:target_idx+1]
manual_ma10 = ma10_prices.mean()
db_ma10 = 76.616

print(f"\nMA10验证:")
print(f"  数据库: {db_ma10:.4f}")
print(f"  手动计算: {manual_ma10:.4f}")
print(f"  差异: {abs(db_ma10 - manual_ma10):.4f}")
print(f"  通达信: 78.72")
print(f"  与通达信差异: {abs(78.72 - db_ma10):.4f}")

# MA30
start_idx = max(0, target_idx - 29)
ma30_prices = close_prices[start_idx:target_idx+1]
manual_ma30 = ma30_prices.mean()
db_ma30 = 79.7586666666667

print(f"\nMA30验证:")
print(f"  数据库: {db_ma30:.4f}")
print(f"  手动计算: {manual_ma30:.4f}")
print(f"  差异: {abs(db_ma30 - manual_ma30):.4f}")
print(f"  通达信: 85.10")
print(f"  与通达信差异: {abs(85.10 - db_ma30):.4f}")

# MA60
start_idx = max(0, target_idx - 59)
ma60_prices = close_prices[start_idx:target_idx+1]
manual_ma60 = ma60_prices.mean()
db_ma60 = 85.3935

print(f"\nMA60验证:")
print(f"  数据库: {db_ma60:.4f}")
print(f"  手动计算: {manual_ma60:.4f}")
print(f"  差异: {abs(db_ma60 - manual_ma60):.4f}")
print(f"  通达信: 90.44")
print(f"  与通达信差异: {abs(90.44 - db_ma60):.4f}")

# MA120
start_idx = max(0, target_idx - 119)
ma120_prices = close_prices[start_idx:target_idx+1]
manual_ma120 = ma120_prices.mean()
db_ma120 = 90.5291666666667

print(f"\nMA120验证:")
print(f"  数据库: {db_ma120:.4f}")
print(f"  手动计算: {manual_ma120:.4f}")
print(f"  差异: {abs(db_ma120 - manual_ma120):.4f}")
print(f"  通达信: 84.64")
print(f"  与通达信差异: {abs(84.64 - db_ma120):.4f}")

# MA250
start_idx = max(0, target_idx - 249)
ma250_prices = close_prices[start_idx:target_idx+1]
manual_ma250 = ma250_prices.mean()
db_ma250 = 84.75952

print(f"\nMA250验证:")
print(f"  数据库: {db_ma250:.4f}")
print(f"  手动计算: {manual_ma250:.4f}")
print(f"  差异: {abs(db_ma250 - manual_ma250):.4f}")
print(f"  通达信: 73.21")
print(f"  与通达信差异: {abs(73.21 - db_ma250):.4f}")

# 显示最近10天的价格
print(f"\n最近10个交易日收盘价:")
for i in range(max(0, target_idx-9), target_idx+1):
    print(f"  {df.loc[i, 'date']}: {df.loc[i, 'close']:.2f}")

conn.close()
