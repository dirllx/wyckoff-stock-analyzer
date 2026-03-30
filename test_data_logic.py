#!/usr/bin/env python3
"""测试K线数据转换逻辑"""

import json
import requests

# 获取真实数据
response = requests.get("http://localhost:8000/api/v1/stocks/688234/quotes?timeframe=daily&limit=5")
data = response.json()

print("=== API返回数据测试 ===")
print(f"股票代码: {data['code']}")
print(f"数据条数: {data['total']}")
print()

# 模拟前端的数据转换逻辑
print("=== 前端数据转换测试 ===")
for i, q in enumerate(data['quotes']):
    # 模拟时间转换
    date_str = q['date'].split(' ')[0] if ' ' in q['date'] else q['date']

    # 模拟OHLC转换
    open_val = float(q['open'])
    high_val = float(q['high'])
    low_val = float(q['low'])
    close_val = float(q['close'])

    print(f"第{i+1}条数据:")
    print(f"  原始日期: {q['date']} -> 转换后: {date_str}")
    print(f"  OHLC: {open_val}, {high_val}, {low_val}, {close_val}")
    print(f"  类型检查: open={type(open_val).__name__}, high={type(high_val).__name__}, low={type(low_val).__name__}, close={type(close_val).__name__}")

    # 检查数据有效性
    if open_val and high_val and low_val and close_val:
        print(f"  ✓ 数据有效")
    else:
        print(f"  ✗ 数据无效！")
    print()

print("=== 测试完成 ===")
print("所有数据类型都是float，应该能正确渲染到图表中")
