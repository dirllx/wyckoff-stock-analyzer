#!/usr/bin/env python3
# 正确添加"我的关注"Tab按钮并注释"测试状态"按钮

input_file = 'step8-chart-full.html'
output_file = 'index.html.b1'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行处理
new_lines = []
for i, line in enumerate(lines):
    # 在第247行后（索引248）插入"我的关注"按钮
    if i == 247 and '<div class="tab-nav">' in line:
        new_lines.append(line)
        new_lines.append("                <button class=\"tab-btn\" id=\"tabWatchlist\" onclick=\"showTab('watchlist')\">我的关注</button>\n")
    # 注释掉第248行（"测试状态"按钮）
    elif i == 248 and '<button class="tab-btn" id="tabStatus"' in line:
        new_lines.append("                <!-- " + line.rstrip() + " -->\n")
    else:
        new_lines.append(line)

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")
print("")
print("验证：")
print(f"第247行：{lines[246].strip()}")
print(f"第248行：{lines[247].strip()}")
print(f"第249行：{lines[248].strip()}")
print("")
print(f"新第248行：{new_lines[247].strip()}")
print(f"新第249行：{new_lines[248].strip()}")
print(f"新第250行：{new_lines[249].strip()}")
