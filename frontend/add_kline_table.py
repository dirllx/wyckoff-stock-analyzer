#!/usr/bin/env python3
# 从 index_stable.html 提取 K 线表格功能并添加到 index.html

import re

# 读取文件
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

with open('index_stable.html', 'r', encoding='utf-8') as f:
    stable_html = f.read()

# 1. 提取 K 线表格 CSS
kline_css_match = re.search(r'(\.kline-table-container.*?\.phase-neutral \{[^}]+\})', stable_html, re.DOTALL)
kline_css = kline_css_match.group(1) if kline_css_match else ""

# 2. 提取 calculateMA 和 calculateEMA 函数
calc_ma_match = re.search(r'(function calculateMA\(data, period\) \{[^}]+return ma;\s*\})', stable_html, re.DOTALL)
calc_ema_match = re.search(r'(function calculateEMA\(data, period\) \{[^}]+return ema;\s*\})', stable_html, re.DOTALL)

calc_ma = calc_ma_match.group(1) if calc_ma_match else ""
calc_ema = calc_ema_match.group(1) if calc_ema_match else ""

# 3. 提取 renderKlineTable 函数
render_kline_match = re.search(r'function renderKlineTable\(quotes\) \{.*?console\.log\(\'K线表格渲染完成.*?\);', stable_html, re.DOTALL)
render_kline = render_kline_match.group(0) + '\n        }' if render_kline_match else ""

# 4. 提取 K 线表格 HTML
kline_table_match = re.search(r'(<div id="tableMode"[^>]*>.*?<div class="kline-table-container">.*?<tbody id="klineBody"></tbody>.*?</table>.*?</div>)', stable_html, re.DOTALL)
kline_table_html = kline_table_match.group(1) if kline_table_match else ""

print(f"✓ 提取 K 线表格 CSS: {len(kline_css)} 字符")
print(f"✓ 提取 calculateMA: {len(calc_ma)} 字符")
print(f"✓ 提取 calculateEMA: {len(calc_ema)} 字符")
print(f"✓ 提取 renderKlineTable: {len(render_kline)} 字符")
print(f"✓ 提取 K 线表格 HTML: {len(kline_table_html)} 字符")

# 备份原文件
with open('index.html.before-kline-add', 'w', encoding='utf-8') as f:
    f.write(index_html)
print("✓ 已备份原文件到 index.html.before-kline-add")

# 1. 在 .loading { 之前添加 K 线表格 CSS
index_html = index_html.replace(
    '        .loading {',
    kline_css + '\n        .loading {'
)
print("✓ 已添加 K 线表格 CSS")

# 2. 在 showMode 函数之前添加 calculateMA 和 calculateEMA 函数
index_html = index_html.replace(
    '        // 显示模式切换\n        function showMode(mode) {',
    f'        {calc_ma}\n\n        {calc_ema}\n\n        // 显示模式切换\n        function showMode(mode) {{'
)
print("✓ 已添加 calculateMA 和 calculateEMA 函数")

# 3. 在 updateTestStatus 函数之后添加 renderKlineTable 函数
if 'function updateTestStatus' in index_html:
    index_html = index_html.replace(
        '        }\n\n        // 页面加载完成时刷新关注列表',
        f'        }}\n\n        {render_kline}\n\n        // 页面加载完成时刷新关注列表'
    )
    print("✓ 已添加 renderKlineTable 函数")
else:
    # 如果没有 updateTestStatus，就添加在其他位置
    index_html = index_html.replace(
        '        // 页面加载完成时刷新关注列表',
        f'        {render_kline}\n\n        // 页面加载完成时刷新关注列表'
    )
    print("✓ 已添加 renderKlineTable 函数（无 updateTestStatus）")

# 4. 替换简单的表格 HTML 为完整的 K 线表格
# 查找 tableMode div 并替换
table_mode_pattern = r'<div id="tableMode"[^>]*>.*?</div>'
if re.search(table_mode_pattern, index_html, re.DOTALL):
    index_html = re.sub(table_mode_pattern, kline_table_html, index_html, flags=re.DOTALL)
    print("✓ 已替换表格 HTML 结构")
else:
    print("⚠ 未找到 tableMode div，跳过 HTML 替换")

# 保存修改后的文件
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)
print("✓ 已保存修改后的 index.html")

print("\n✅ 所有修改完成！")
print("请刷新页面测试 K 线表格功能")
