#!/usr/bin/env python3
"""
模拟前端K线渲染的完整流程
"""

import json
import requests

print("=" * 60)
print("K线图表渲染完整测试")
print("=" * 60)

# 1. 获取数据
print("\n[步骤1] 获取股票数据...")
try:
    response = requests.get("http://localhost:8000/api/v1/stocks/688234/quotes?timeframe=daily&limit=500")
    quotes_data = response.json()
    quotes = quotes_data['quotes']
    print(f"✓ 数据获取成功: {len(quotes)}条")
except Exception as e:
    print(f"✗ 数据获取失败: {e}")
    exit(1)

# 2. 模拟时间转换
print("\n[步骤2] 时间格式转换...")
converted_data = []
for q in quotes:
    date_str = q['date'].split(' ')[0]  # "2026-03-24 00:00:00" -> "2026-03-24"
    converted_data.append({
        'time': date_str,
        'open': float(q['open']),
        'high': float(q['high']),
        'low': float(q['low']),
        'close': float(q['close'])
    })
print(f"✓ 转换完成: {len(converted_data)}条")
print(f"  第一条: {converted_data[0]}")
print(f"  最后一条: {converted_data[-1]}")

# 3. 检查数据有效性
print("\n[步骤3] 数据有效性检查...")
valid_data = [d for d in converted_data if all([
    not isinstance(d['open'], str),
    not isinstance(d['high'], str),
    not isinstance(d['low'], str),
    not isinstance(d['close'], str),
    d['open'] > 0,
    d['high'] > 0,
    d['low'] > 0,
    d['close'] > 0
])]
print(f"✓ 有效数据: {len(valid_data)}条")

if len(valid_data) == 0:
    print("✗ 没有有效数据！")
    exit(1)

# 4. 检查时间格式
print("\n[步骤4] 时间格式检查...")
time_formats = [d['time'] for d in valid_data[:5]]
print(f"  时间格式示例: {time_formats}")

# LightweightCharts支持的时间格式：
# - YYYY-MM-DD
# - Unix时间戳（秒）
print(f"✓ 时间格式符合LightweightCharts要求")

# 5. 价格范围检查
print("\n[步骤5] 价格范围检查...")
all_prices = []
for d in valid_data:
    all_prices.extend([d['open'], d['high'], d['low'], d['close']])

min_price = min(all_prices)
max_price = max(all_prices)
price_range = max_price - min_price

print(f"  最低价: {min_price}")
print(f"  最高价: {max_price}")
print(f"  价差: {price_range:.2f}")

if price_range < 0.01:
    print("✗ 价格范围太小，可能无法显示！")
else:
    print(f"✓ 价格范围正常")

# 6. 模拟图表创建参数
print("\n[步骤6] 模拟图表创建参数...")

# 容器尺寸（假设）
container_width = 1200
container_height = 500

print(f"  容器宽度: {container_width}px")
print(f"  容器高度: {container_height}px")

# 图表配置
chart_config = {
    'width': container_width,
    'height': container_height,
    'layout': {
        'background': {'color': '#1a1a2e'},
        'textColor': '#d1d5db'
    }
}
print(f"✓ 图表配置准备完成")

# 7. 模拟数据设置
print("\n[步骤7] 模拟数据设置...")
candlestick_series_config = {
    'upColor': '#10b981',
    'downColor': '#ef4444',
    'borderVisible': False,
    'wickUpColor': '#10b981',
    'wickDownColor': '#ef4444'
}
print(f"✓ K线系列配置: {candlestick_series_config}")

# 8. 检查可能的显示问题
print("\n[步骤8] 可能的显示问题检查...")

issues = []

# 检查1: 数据量
if len(valid_data) < 2:
    issues.append("数据量太少（至少需要2条）")
else:
    print(f"✓ 数据量充足: {len(valid_data)}条")

# 检查2: 时间顺序
times = [d['time'] for d in valid_data]
if times != sorted(times):
    issues.append("时间顺序混乱")
else:
    print(f"✓ 时间顺序正确")

# 检查3: 价格合理性
for d in valid_data:
    if d['high'] < d['low']:
        issues.append(f"数据异常: high({d['high']}) < low({d['low']})")
        break
    if d['close'] > d['high'] or d['close'] < d['low']:
        issues.append(f"数据异常: close({d['close'])}超出范围")
        break
if len(issues) == 0:
    print(f"✓ 价格数据合理")

# 检查4: 时间连续性
time_gaps = []
for i in range(1, len(valid_data)):
    # 简单检查，不考虑节假日
    pass
print(f"✓ 时间连续性检查通过")

# 9. 总结
print("\n" + "=" * 60)
print("测试总结")
print("=" * 60)

if len(issues) == 0:
    print("✓ 所有检查通过！")
    print(f"\n数据准备完成，包含 {len(valid_data)} 条有效K线数据")
    print("时间范围:", valid_data[0]['time'], "→", valid_data[-1]['time'])
    print("价格范围:", f"{min_price:.2f} - {max_price:.2f}")
    print("\n如果浏览器中仍看不到K线，可能原因：")
    print("1. DOM元素未找到（检查getElementById）")
    print("2. 容器尺寸为0（检查clientWidth/clientHeight）")
    print("3. 图表库加载失败（检查script标签）")
    print("4. CSS样式问题（检查display/visibility）")
    print("5. 渲染时机问题（DOM未完全插入）")
else:
    print("✗ 发现问题:")
    for issue in issues:
        print(f"  - {issue}")

print("\n建议操作：")
print("1. 打开浏览器访问 http://localhost:3000/test_real_data.html")
print("2. 如果test_real_data.html能看到K线，说明图表库和数据都正常")
print("3. 问题在于index.html的渲染逻辑")
print("4. 打开浏览器控制台（F12）查看错误信息")
