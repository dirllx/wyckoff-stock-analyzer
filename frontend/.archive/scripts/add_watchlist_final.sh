#!/bin/bash
# 最终安全版本：使用sed精确修改

FILE="index.html.b1"

# 1. 恢复原始文件
cp step8-chart-full.html "$FILE"

# 2. 注释掉"测试状态"按钮（第249行，文件行号）
# 从第248行开始，查找"tabStatus"行并注释
sed -n '248,252p' "$FILE"

# 使用sed查找并注释"测试状态"按钮
sed -i '/tabStatus/ {
    N
    s|^.*$|<!-- & -->|
}' "$FILE"

# 3. 在"分析"按钮后插入"我的关注"按钮
# 从第247行开始，查找"分析"按钮并在其后插入
sed -i '/tabAnalyze/,/tabStatus/ {
    N
    N
    a\                <button class="tab-btn" id="tabWatchlist" onclick="showTab('\''watchlist'\'')">我的关注</button>
}' "$FILE"

echo "步骤1完成"
echo "文件行数: $(wc -l < "$FILE")"

# 验证
echo ""
echo "=== 验证Tab导航 ==="
sed -n '246,254p' "$FILE"
