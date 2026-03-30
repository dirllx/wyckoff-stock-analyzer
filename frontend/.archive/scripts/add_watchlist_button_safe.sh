#!/bin/bash
# 安全地添加"我的关注"Tab按钮

# 1. 恢复原始文件
cp step8-chart-full.html index.html.b1

# 2. 修改第249行：在"分析"按钮后添加"我的关注"按钮
sed -i '249a\                <button class="tab-btn" id="tabWatchlist" onclick="showTab('\''watchlist'\'')">我的关注</button>\n' index.html.b1

# 3. 修改第250行：注释掉"测试状态"按钮
sed -i '250s|<button class="tab-btn" id="tabStatus"|<!-- <button class="tab-btn" id="tabStatus"|' index.html.b1
sed -i '250s|onclick="showTab('\''status'\'")">测试状态</button>|onclick="showTab('\''status'\'")">测试状态</button> -->|' index.html.b1

echo "步骤1完成：已添加'我的关注'Tab按钮"
echo "文件行数: $(wc -l < index.html.b1)"

# 验证修改
echo ""
echo "=== 验证Tab导航部分 ==="
sed -n '248,255p' index.html.b1
