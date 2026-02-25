#!/usr/bin/env python3
# 修复 stocks.py 中的 MA 计算问题

import re

# 读取文件
with open('/root/.openclaw/workspace/wyckoff-stock-analyzer/backend/app/api/stocks.py', 'r') as f:
    content = f.read()

# 修复 1: 修改 calculate_ma 函数，即使数据不足也计算可用值
old_calc = '''def calculate_ma(data, window):
            if len(data) < window:
                return [None] * len(data)'''
new_calc = '''def calculate_ma(data, window):
            """计算移动平均线"""
            if len(data) < window:
                # 数据不足时，使用可用数据计算部分值
                ma = []
                for i in range(len(data)):
                    if i < len(data):
                        ma.append(sum(data[:i+1]) / (i+1))
                    else:
                        ma.append(sum(data[i-window+1:i+1]) / window)
                return ma'''
content = content.replace(old_calc, new_calc)

# 修复 2: 添加 ma15 字段到返回值
old_quotes_dict = '''"ma5": q.ma5,
                    "ma10": q.ma10,
                    "ma20": q.ma20,'''
new_quotes_dict = '''"ma5": q.ma5,
                    "ma10": q.ma10,
                    "ma15": calculate_ma(closes[:i+1], 15)[-1] if i >= 14 else None,
                    "ma20": q.ma20,'''
content = content.replace(old_quotes_dict, new_quotes_dict)

# 修复 3: 移除重复的 ma20 键
content = re.sub(r'"ma20".*?\n.*?"ma20".*?\n', '"ma20": ma20[i],\n', content)

# 保存
with open('/root/.openclaw/workspace/wyckoff-stock-analyzer/backend/app/api/stocks.py', 'w') as f:
    f.write(content)

print("✓ 已修复 MA 计算问题")
print("  1. calculate_ma 函数现在会计算可用值")
print("  2. 添加了 ma15 字段")
print("  3. 移除了重复的 ma20 键")
print("\n✓ 请重启后端服务")
