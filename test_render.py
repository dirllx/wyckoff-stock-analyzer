#!/usr/bin/env python3
"""
测试K线渲染逻辑
模拟前端的数据处理流程
"""

import json
import requests

print("=== 测试K线渲染逻辑 ===\n")

# 1. 测试API数据获取
print("1. 获取API数据...")
response = requests.get("http://localhost:8000/api/v1/stocks/688234/quotes?timeframe=daily&limit=500")
quotes_data = response.json()

print(f"   ✓ 数据获取成功: {quotes_data['total']}条")

# 2. 模拟前端数据转换
print("\n2. 模拟前端数据转换...")
current_quotes_data = quotes_data['quotes']

# 模拟前端的时间转换和OHLC转换
candlestick_data = []
for q in current_quotes_data:
    # 转换时间格式为YYYY-MM-DD
    date_str = q['date'].split(' ')[0] if ' ' in q['date'] else q['date']

    # 转换OHLC为数字
    open_val = float(q['open'])
    high_val = float(q['high'])
    low_val = float(q['low'])
    close_val = float(q['close'])

    # 过滤无效数据
    if open_val and high_val and low_val and close_val:
        candlestick_data.append({
            'time': date_str,
            'open': open_val,
            'high': high_val,
            'low': low_val,
            'close': close_val
        })

print(f"   ✓ 转换后数据: {len(candlestick_data)}条")
print(f"   ✓ 第一条: {candlestick_data[0]}")
print(f"   ✓ 最后一条: {candlestick_data[-1]}")

# 3. 检查数据范围
prices = [d['low'] for d in candlestick_data] + [d['high'] for d in candlestick_data]
min_price = min(prices)
max_price = max(prices)

print(f"\n3. 价格范围:")
print(f"   ✓ 最低价: {min_price}")
print(f"   ✓ 最高价: {max_price}")
print(f"   ✓ 价差: {max_price - min_price:.2f}")

# 4. 检查时间范围
print(f"\n4. 时间范围:")
print(f"   ✓ 最早: {candlestick_data[0]['time']}")
print(f"   ✓ 最晚: {candlestick_data[-1]['time']}")

# 5. 检查是否有足够数据
print(f"\n5. 数据有效性检查:")
if len(candlestick_data) >= 20:
    print(f"   ✓ 数据充足: {len(candlestick_data)}条 >= 20条")
else:
    print(f"   ✗ 数据不足: {len(candlestick_data)}条 < 20条")

# 6. 检查数据是否有NaN或null
has_invalid = any(
    d is None or
    not isinstance(d['open'], (int, float)) or
    not isinstance(d['high'], (int, float)) or
    not isinstance(d['low'], (int, float)) or
    not isinstance(d['close'], (int, float))
    for d in candlestick_data
)

if has_invalid:
    print(f"   ✗ 发现无效数据")
    # 找出第一条无效数据
    for i, d in enumerate(candlestick_data):
        if None in [d['open'], d['high'], d['low'], d['close']]:
            print(f"   第{i+1}条数据无效: {d}")
            break
else:
    print(f"   ✓ 所有数据有效")

print(f"\n=== 测试完成 ===")
print(f"数据处理逻辑正常，应该能够渲染K线图")
print(f"\n可能的问题:")
print(f"1. DOM元素未找到 - 检查getElementById")
print(f"2. 容器尺寸为0 - 检查CSS布局")
print(f"3. 图表库未加载 - 检查script标签")
print(f"4. 渲染时机问题 - 检查调用顺序")
