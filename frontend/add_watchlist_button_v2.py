#!/usr/bin/env python3
# 只添加"我的关注"Tab按钮和注释"测试状态"按钮

input_file = 'step8-chart-full.html'
output_file = 'index.html.b1'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行处理
new_lines = []
for i, line in enumerate(lines):
    # 在第249行后（"分析"按钮后）插入"我的关注"按钮
    if i == 248 and '<button class="tab-btn active" id="tabAnalyze"' in line:
        new_lines.append(line)  # 保留原行
        new_lines.append("                <button class=\"tab-btn\" id=\"tabWatchlist\" onclick=\"showTab('watchlist')\">我的关注</button>\n")
    # 注释掉第250行的"测试状态"按钮
    elif i == 249 and '<button class="tab-btn" id="tabStatus"' in line:
        new_lines.append("                <!-- " + line.rstrip() + " -->\n")
    else:
        new_lines.append(line)

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")
