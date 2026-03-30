#!/bin/bash
# 只添加"我的关注"Tab按钮（最安全的修改）

FILE="index.html.b1"
BACKUP="step8-chart-full.html"

# 从备份文件开始
cp "$BACKUP" "$FILE"

# 1. 在"分析"按钮后添加"我的关注"按钮
# 第249行附近： <button class="tab-btn active" id="tabAnalyze" onclick="showTab('analyze')">分析</button>
sed -i '249 a\                <button class="tab-btn" id="tabWatchlist" onclick="showTab('\''watchlist'\'')">我的关注</button>\n' "$FILE"

# 2. 注释掉"测试状态"按钮
# 第250行附近
sed -i '250 s|<button class="tab-btn" id="tabStatus"|<!-- <button class="tab-btn" id="tabStatus"|g' "$FILE"
sed -i '250 s|</button>|</button> -->|g' "$FILE"

echo "步骤1完成：已添加'我的关注'Tab按钮"
echo "文件行数: $(wc -l < "$FILE")"
