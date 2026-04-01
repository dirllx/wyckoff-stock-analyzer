#!/bin/bash

# 威科夫股票分析系统 - 前端启动脚本

echo "================================"
echo "威科夫股票分析系统 - 前端启动"
echo "================================"
echo ""

# 检查后端是否运行
echo "1. 检查后端服务..."
if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行正常 (http://localhost:8000)"
else
    echo "❌ 后端服务未运行，请先启动后端:"
    echo "   cd backend && ./start.sh"
    exit 1
fi

echo ""
echo "2. 选择启动方式:"
echo "   [1] 使用Python HTTP服务器 (推荐)"
echo "   [2] 直接在浏览器打开 (可能遇到CORS问题)"
echo "   [3] 使用测试页面"
echo ""
read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "启动Python HTTP服务器..."
        echo "前端地址: http://localhost:8080"
        echo "按 Ctrl+C 停止服务器"
        echo ""
        cd "/Users/dirllx/Claude Code/wyckoff-stock-analyzer/frontend_new"
        python3 -m http.server 8080
        ;;
    2)
        echo ""
        echo "在浏览器中打开主页面..."
        open "/Users/dirllx/Claude Code/wyckoff-stock-analyzer/frontend_new/index.html"
        echo "✅ 已在浏览器中打开"
        echo "⚠️  注意: 直接打开可能遇到CORS限制，建议使用HTTP服务器"
        ;;
    3)
        echo ""
        echo "在浏览器中打开测试页面..."
        open "/Users/dirllx/Claude Code/wyckoff-stock-analyzer/frontend_new/test.html"
        echo "✅ 已在浏览器中打开测试页面"
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac

echo ""
echo "================================"
echo "使用说明:"
echo "1. 股票代码: 688234 (或其他股票代码)"
echo "2. 时间周期: 日线/周线/月线/30分钟/60分钟"
echo "3. 点击'分析'按钮查看结果"
echo "================================"
