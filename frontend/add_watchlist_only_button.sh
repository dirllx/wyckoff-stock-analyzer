#!/bin/bash
# 最简单的方法：只添加"我的关注"Tab按钮

# 1. 从step8复制新文件
cp step8-chart-full.html index.html.test-watchlist

# 2. 在"分析"按钮后添加"我的关注"按钮（第249行附近）
# 使用sed最简单的插入
sed -i '/<button class="tab-btn active" id="tabAnalyze"/a\                <button class="tab-btn" id="tabWatchlist" onclick="showTab('\''watchlist'\'')">我的关注</button>\n' index.html.test-watchlist

# 3. 注释掉"测试状态"按钮（第250行附近）
sed -i '/<button class="tab-btn" id="tabStatus"/c\                <!-- & -->\n' index.html.test-watchlist
sed -i 's|<!-- <button class="tab-btn" id="tabStatus"|<!-- <button class="tab-btn" id="tabStatus"|' index.html.test-watchlist

echo "步骤1完成：只添加了'我的关注'Tab按钮"
echo "文件名：index.html.test-watchlist"
echo "文件大小：$(ls -lh index.html.test-watchlist | awk '{print $5}')"
echo "文件行数：$(wc -l < index.html.test-watchlist)"

# 验证修改
echo ""
echo "=== 验证Tab导航 ==="
grep -n "我的关注\|tabWatchlist" index.html.test-watchlist | head -3
