#!/usr/bin/env python3
# 删除tab-status div

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 删除第270行的tab-status div（索引269）
new_lines = lines[:269] + lines[270:]

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")
print(f"删除行数: {len(lines) - len(new_lines)}")

# 验证删除
print("")
print("=== 验证Tab内容 ===")
for i, line in enumerate(new_lines):
    if 'id="tab-' in line and 'tab-content' in line:
        print(f"{i+1}: {line.strip()}")
