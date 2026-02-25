#!/usr/bin/env python3
# 修改Tab按钮ID为小写+短横线，与Tab内容ID统一

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行处理，修改Tab按钮ID
new_lines = []
for i, line in enumerate(lines):
    # 修改1: tabAnalyze → tab-analyze
    if 'id="tabAnalyze"' in line:
        new_lines.append(line.replace('id="tabAnalyze"', 'id="tab-analyze"'))
    
    # 修改2: tab-watchlist → tab-watchlist（确保是小写+短横线）
    elif 'id="tab-watchlist"' in line:
        new_lines.append(line.replace('id="tab-watchlist"', 'id="tab-watchlist"'))
    
    else:
        new_lines.append(line)

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")

# 验证修改
print("")
print("=== 验证Tab按钮ID ===")
for i, line in enumerate(new_lines):
    if 'id="tab' in line and 'showTab' in line:
        print(f"{i+1}: {line.strip()}")
