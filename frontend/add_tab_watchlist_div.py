#!/usr/bin/env python3
# 添加tab-watchlist的Tab内容div

input_file = 'index.html'
output_file = 'index.html'

# 读取文件
with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 逐行处理，找到tab-status div，然后在它后面添加tab-watchlist div
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    
    # 找到tab-status div的结束位置
    if i == 270 and '<div id="tab-status" class="tab-content">' in line:
        # 添加tab-status div的内容（原文件有）
        # 然后添加tab-watchlist div
        pass
    
    # 找到tab-status div的结束位置（</div>）
    if i >= 270 and '</div>\n' in line and 'watchlist' not in ''.join(lines[i-10:i]):
        # 这是tab-status div的结束
        new_lines.append(line)
        # 在tab-status div后添加tab-watchlist div
        new_lines.append('\n')
        new_lines.append('        <!-- 我的关注Tab -->\n')
        new_lines.append('        <div id="tab-watchlist" class="tab-content">\n')
        new_lines.append('            <div class="card-header">\n')
        new_lines.append('                <h2 class="card-title">我的关注</h2>\n')
        new_lines.append('                <div class="form-group" style="margin-bottom: 0;">\n')
        new_lines.append('                    <select class="form-input" id="watchlistSelect" style="width: 120px; margin-right: 10px;" onchange="analyzeFromWatchlist()">\n')
        new_lines.append('                        <option value="">选择股票</option>\n')
        new_lines.append('                    </select>\n')
        new_lines.append('                    <button class="btn btn-primary" onclick="addToWatchlist()">添加</button>\n')
        new_lines.append('                    <button class="btn btn-secondary" onclick="refreshWatchlist()">刷新</button>\n')
        new_lines.append('                </div>\n')
        new_lines.append('            </div>\n')
        new_lines.append('            <div id="watchlistContent"></div>\n')
        new_lines.append('        </div>\n')
        new_lines.append('\n')
        continue

# 写入输出文件
with open(output_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"完成：{output_file}")
print(f"原文件行数: {len(lines)}")
print(f"新文件行数: {len(new_lines)}")

# 验证关键修改
print("")
print("=== 验证Tab内容ID ===")
for i, line in enumerate(new_lines):
    if 'id="tab-watchlist"' in line or 'id="tab-analyze"' in line or 'id="tab-status"' in line:
        print(f"{i+1}: {line.strip()}")
