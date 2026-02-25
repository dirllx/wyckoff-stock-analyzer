#!/bin/bash
# 最简单、最安全的方法：只修改HTML，不修改JavaScript

# 1. 从step8复制新文件
cp step8-chart-full.html index.html

# 2. 在"分析"按钮后添加"我的关注"按钮（使用小写+短横线）
# 第249行： <button class="tab-btn active" id="tabAnalyze" ...>分析</button>
sed -i '249a\                <button class="tab-btn" id="tab-watchlist" onclick="showTab('\''watchlist'\'')">我的关注</button>\n' index.html

# 3. 注释掉"测试状态"按钮（第250行）
# 第250行： <button class="tab-btn" id="tabStatus" ...>测试状态</button>
sed -i '250s|<button class="tab-btn" id="tabStatus"|<!-- <button class="tab-btn" id="tabStatus"|' index.html
sed -i '250s|onclick="showTab('\''status'\'")">测试状态</button>|onclick="showTab('\''status'\'")">测试状态</button> -->|' index.html

# 4. 在"测试状态"Tab内容后添加"我的关注"Tab内容（使用小写+短横线）
# 找到"</div>        <div id="tab-status" class="tab-content">"的位置
sed -i '/<\/div>.*<div id="tab-status"/a\        <!-- 我的关注Tab -->\n        <div id="tab-watchlist" class="tab-content">\n            <div class="card-header">\n                <h2 class="card-title">我的关注</h2>\n                <div class="form-group" style="margin-bottom: 0;">\n                    <select class="form-input" id="watchlistSelect" style="width: 120px; margin-right: 10px;" onchange="analyzeFromWatchlist()">\n                        <option value="">选择股票</option>\n                    </select>\n                    <button class="btn btn-primary" onclick="addToWatchlist()">添加</button>\n                    <button class="btn btn-secondary" onclick="refreshWatchlist()">刷新</button>\n                </div>\n            </div>\n            <div id="watchlistContent"></div>\n        </div>' index.html

# 5. 更新tabs数组，将'status'改为'watchlist'
# 查找：const tabs = ['analyze', 'status'];
# 改为：const tabs = ['analyze', 'watchlist'];
sed -i "s|const tabs = \['analyze', 'status'\];|const tabs = ['analyze', 'watchlist'];|g" index.html

echo "步骤1完成：只修改HTML，不修改JavaScript"
echo "文件名：index.html"
echo "文件大小：$(ls -lh index.html | awk '{print $5}')"
echo "文件行数：$(wc -l < index.html)"

# 验证修改
echo ""
echo "=== 验证Tab按钮 ==="
grep -n "tab-watchlist\|tabAnalyze" index.html | head -5
echo ""
echo "=== 验证Tab内容 ==="
grep -n "tab-watchlist\|tab-analyze\|tab-status" index.html | head -5
echo ""
echo "=== 验证tabs数组 ==="
grep -n "const tabs = " index.html
