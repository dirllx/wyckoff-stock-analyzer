#!/usr/bin/env python3
# 在showTab函数后插入"我的关注"函数

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 读取要插入的函数
with open('/tmp/watchlist_functions.js', 'r', encoding='utf-8') as f:
    functions = f.read()

# 在第429行（索引428）showTab函数结束后插入函数
new_lines = lines[:429]  # 保留1-429行
new_lines.append('\n')
new_lines.append(functions)  # 插入函数
new_lines.append('\n')
new_lines.extend(lines[429:])  # 保留430行及之后

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")

# 验证函数添加
print("")
print("=== 验证添加的函数 ===")
for i, line in enumerate(new_lines):
    if 'async function refreshWatchlist' in line:
        print(f"{i+1}: refreshWatchlist")
    elif 'function analyzeFromWatchlist' in line:
        print(f"{i+1}: analyzeFromWatchlist")
    elif 'async function addToWatchlist' in line:
        print(f"{i+1}: addToWatchlist")
    elif 'async function deleteFromWatchlist' in line:
        print(f"{i+1}: deleteFromWatchlist")
