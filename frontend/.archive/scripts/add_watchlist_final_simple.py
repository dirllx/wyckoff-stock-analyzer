#!/usr/bin/env python3
# 最简单、最安全的方法：只修改HTML，不修改JavaScript

input_file = 'step8-chart-full.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行处理，只添加必要的修改
new_lines = []
for i, line in enumerate(lines):
    # 1. 在"分析"按钮后添加"我的关注"按钮（第249行之后）
    if '<button class="tab-btn active" id="tabAnalyze"' in line:
        new_lines.append(line)
        # 添加"我的关注"按钮（ID: tab-watchlist，小写+短横线）
        new_lines.append("                <button class=\"tab-btn\" id=\"tab-watchlist\" onclick=\"showTab('watchlist')\">我的关注</button>\n")
    
    # 2. 注释掉"测试状态"按钮
    elif '<button class="tab-btn" id="tabStatus"' in line:
        # 完全注释掉
        new_lines.append("                <!-- " + line.rstrip() + " -->\n")
    
    # 3. 在"测试状态"Tab内容后添加"我的关注"Tab内容
    elif '</div>\n        <div id="tab-status"' in line:
        new_lines.append(line)
        # 添加"我的关注"Tab内容（ID: tab-watchlist，小写+短横线）
        new_lines.append("        <!-- 我的关注Tab -->\n")
        new_lines.append("        <div id=\"tab-watchlist\" class=\"tab-content\">\n")
        new_lines.append("            <div class=\"card-header\">\n")
        new_lines.append("                <h2 class=\"card-title\">我的关注</h2>\n")
        new_lines.append("                <div class=\"form-group\" style=\"margin-bottom: 0;\">\n")
        new_lines.append("                    <select class=\"form-input\" id=\"watchlistSelect\" style=\"width: 120px; margin-right: 10px;\" onchange=\"analyzeFromWatchlist()\">\n")
        new_lines.append("                        <option value=\"\">选择股票</option>\n")
        new_lines.append("                    </select>\n")
        new_lines.append("                    <button class=\"btn btn-primary\" onclick=\"addToWatchlist()\">添加</button>\n")
        new_lines.append("                    <button class=\"btn btn-secondary\" onclick=\"refreshWatchlist()\">刷新</button>\n")
        new_lines.append("                </div>\n")
        new_lines.append("            </div>\n")
        new_lines.append("            <div id=\"watchlistContent\"></div>\n")
        new_lines.append("        </div>\n")
    
    # 4. 修改tabs数组，将'status'改为'watchlist'
    elif "const tabs = ['analyze', 'status']" in line:
        new_lines.append("            const tabs = ['analyze', 'watchlist'];\n")
    
    else:
        new_lines.append(line)

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")

# 验证关键修改
print("")
print("=== 验证Tab按钮ID ===")
for i, line in enumerate(new_lines):
    if 'tab-watchlist' in line or 'tabAnalyze' in line:
        print(f"{i+1}: {line.strip()}")

print("")
print("=== 验证Tab内容ID ===")
for i, line in enumerate(new_lines):
    if 'id="tab-watchlist"' in line or 'id="tab-analyze"' in line:
        print(f"{i+1}: {line.strip()}")
