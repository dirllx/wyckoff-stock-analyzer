#!/bin/bash

cd "/Users/dirllx/Claude Code/wyckoff-stock-analyzer"

# 打开Chrome浏览器并访问页面
open -a "Google Chrome" "http://localhost:3000/index.html"

# 等待5秒让页面加载
sleep 5

# 截图保存到test.png
screencapture -x -R 0,0,1920,1080 /Users/dirllx/Claude\ Code/wyckoff-stock-analyzer/test_chart.png

echo "截图已保存到 test_chart.png"
