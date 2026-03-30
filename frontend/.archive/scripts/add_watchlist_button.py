#!/usr/bin/env python3
# 只添加"我的关注"Tab按钮（最简单的方法）

input_file = 'step8-chart-full.html'
output_file = 'index.html.b1'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 只修改第249行（在"分析"按钮后）
# 插入"我的关注"按钮
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if i == 248:  # 第249行之后
        # 插入"我的关注"按钮
        new_lines.append("                <button class=\"tab-btn\" id=\"tabWatchlist\" onclick=\"showTab('watchlist')\">我的关注</button>\n")
    if i == 250:  # 第251行
        # 注释掉"测试状态"按钮
        if '<button class="tab-btn" id="tabStatus"' in line:
            new_lines.append("                <!-- " + line.rstrip() + " -->\n")

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")
