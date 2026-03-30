#!/usr/bin/env python3
# 直接修复showTab函数

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 替换showTab函数中的tabs.forEach逻辑
# 旧的逻辑（有错误）：
# tabs.forEach(t => { if (t !== tab) { // 移除所有Tab的active类 // 隐藏所有Tab内容
# 新的逻辑（正确）：
# tabs.forEach(t => { if (t !== tab) { // 只处理非当前Tab

old_code = '''            const tabs = ['analyze', 'watchlist'];
            tabs.forEach(t => { if (t !== tab) {
                // 移除所有Tab的active类
                // 隐藏所有Tab内容
            });'''

new_code = '''            const tabs = ['analyze', 'watchlist'];
            tabs.forEach(t => {
                // 只处理非当前Tab
                if (t !== tab) {
                    document.getElementById(`tab-${t}`).classList.remove('active');
                    document.getElementById(`tab-${t}`).style.display = 'none';
                }
            });'''

content = content.replace(old_code, new_code)

# 写回文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"完成：{output_file}")
print("已修复showTab函数逻辑")
