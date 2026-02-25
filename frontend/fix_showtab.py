#!/usr/bin/env python3
# 修复showTab函数的逻辑错误

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行处理，找到并修复showTab函数
new_lines = []
in_function = False
skip_count = 0

for i, line in enumerate(lines):
    # 检测showTab函数开始
    if 'function showTab(tab)' in line:
        in_function = True
        new_lines.append(line)
        continue
    
    # 在函数中，修复tabs.forEach逻辑
    if in_function and 'tabs.forEach(t => {' in line:
        new_lines.append(line)
        # 添加逻辑：只处理非当前Tab
        new_lines.append('                if (t !== tab) {\n')
        skip_count = 2  # 跳过接下来的2行（空行和注释）
        continue
    
    # 在函数中，跳过特定的行
    if skip_count > 0:
        # 跳过注释行和空行
        if line.strip().startswith('//') or line.strip() == '':
            new_lines.append(line)
        else:
            # 跳过原来的处理逻辑
            skip_count -= 1
            # 添加新逻辑
            if skip_count == 1:  # 移除active类
                new_lines.append('                    document.getElementById(`tab-${t}`).classList.remove("active");\n')
            elif skip_count == 0:  # 隐藏Tab内容
                new_lines.append('                    document.getElementById(`tab-${t}`).style.display = "none";\n')
        continue
    
    # 检测函数结束
    if in_function and line.strip() == '});' and 'addLog' not in line:
        in_function = False
    
    new_lines.append(line)

# 写回文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"文件行数: {len(new_lines)}")
