#!/usr/bin/env python3
import akshare as ak
from datetime import date

# 获取足够的历史数据
df = ak.stock_zh_a_hist(
    symbol='688234',
    period='daily',
    start_date='20230301',
    end_date='20250331',
    adjust=''
)

print(f"总数据行数: {len(df)}")
print(f"日期范围: {df['日期'].min()} 到 {df['日期'].max()}")

# 找到2025-03-27
target_date = date(2025, 3, 27)
target_rows = df[df['日期'] == target_date]

if target_rows.empty:
    print(f"\n未找到 {target_date}")
else:
    target_idx = target_rows.index[0]
    close_price = df.loc[target_idx, '收盘']

    print(f"\n688234 天岳先进 {target_date}")
    print(f"收盘价: {close_price}")
    print(f"索引位置: {target_idx}")

    # 计算MA值
    close_prices = df['收盘'].values

    # MA10
    start_idx = max(0, target_idx - 9)
    ma10 = close_prices[start_idx:target_idx+1].mean()
    print(f"\nMA10: {ma10:.2f} (使用 {target_idx - start_idx + 1} 个数据点)")

    # MA30
    start_idx = max(0, target_idx - 29)
    ma30 = close_prices[start_idx:target_idx+1].mean()
    print(f"MA30: {ma30:.2f} (使用 {target_idx - start_idx + 1} 个数据点)")

    # MA60
    start_idx = max(0, target_idx - 59)
    ma60 = close_prices[start_idx:target_idx+1].mean()
    print(f"MA60: {ma60:.2f} (使用 {target_idx - start_idx + 1} 个数据点)")

    # MA120
    start_idx = max(0, target_idx - 119)
    ma120 = close_prices[start_idx:target_idx+1].mean()
    print(f"MA120: {ma120:.2f} (使用 {target_idx - start_idx + 1} 个数据点)")

    # MA250
    start_idx = max(0, target_idx - 249)
    ma250 = close_prices[start_idx:target_idx+1].mean()
    print(f"MA250: {ma250:.2f} (使用 {target_idx - start_idx + 1} 个数据点)")

    print(f"\n对比您说的数据:")
    print(f"  您说MA10: 78.72,  我计算: {ma10:.2f},  差异: {abs(ma10 - 78.72):.2f}")
    print(f"  您说MA30: 85.10,  我计算: {ma30:.2f},  差异: {abs(ma30 - 85.10):.2f}")
    print(f"  您说MA60: 90.44,  我计算: {ma60:.2f},  差异: {abs(ma60 - 90.44):.2f}")
    print(f"  您说MA120: 84.64, 我计算: {ma120:.2f},  差异: {abs(ma120 - 84.64):.2f}")
    print(f"  您说MA250: 73.21,  我计算: {ma250:.2f},  差异: {abs(ma250 - 73.21):.2f}")
