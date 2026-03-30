#!/usr/bin/env python3
# 完全替换showTab函数

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 完全替换showTab函数（第424-440行）
new_showtab_function = '''        function showTab(tab) {
            const tabs = ['analyze', 'watchlist'];
            tabs.forEach(t => {
                if (t !== tab) {
                    document.getElementById(`tab-${t}`).classList.remove('active');
                    document.getElementById(`tab-${t}`).style.display = 'none';
                }
            });
            document.getElementById(`tab-${tab}`).classList.add('active');
            document.getElementById(`tab-${tab}`).style.display = 'block';
            addLog('切换标签', `切换到: ${tab}`);
        }

'''

# 删除第424-440行（showTab函数）
new_lines = lines[:423]  # 保留1-423行
new_lines.append(new_showtab_function)  # 插入新函数
new_lines.extend(lines[440:])  # 保留441行及之后

# 写回文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")
print(f"修改: 完全替换showTab函数")
