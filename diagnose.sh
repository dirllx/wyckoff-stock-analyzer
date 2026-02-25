#!/bin/bash
# 威科夫股票分析系统 - 快速诊断脚本

echo "=========================================="
echo "威科夫股票分析系统 - 快速诊断"
echo "=========================================="
echo ""

# 检查后端服务
echo "1. 检查后端服务 (端口 8000)..."
BACKEND_PID=$(ps aux | grep "uvicorn app.main:app" | grep -v grep | awk '{print $2}')
if [ -n "$BACKEND_PID" ]; then
    echo "   ✓ 后端服务运行中 (PID: $BACKEND_PID)"
else
    echo "   ✗ 后端服务未运行"
fi

# 检查前端服务
echo ""
echo "2. 检查前端服务 (端口 3000)..."
FRONTEND_PID=$(ps aux | grep "python3.*http.server 3000" | grep -v grep | awk '{print $2}')
if [ -n "$FRONTEND_PID" ]; then
    echo "   ✓ 前端服务运行中 (PID: $FRONTEND_PID)"
else
    echo "   ✗ 前端服务未运行"
fi

# 检查Redis服务
echo ""
echo "3. 检查Redis服务 (端口 6379)..."
REDIS_PID=$(ps aux | grep "redis-server" | grep -v grep | awk '{print $2}')
if [ -n "$REDIS_PID" ]; then
    echo "   ✓ Redis服务运行中 (PID: $REDIS_PID)"
else
    echo "   ✗ Redis服务未运行"
fi

# 测试后端API
echo ""
echo "4. 测试后端API健康检查..."
HEALTH_STATUS=$(curl -s http://localhost:8000/api/v1/health | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))" 2>/dev/null)
if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "   ✓ API健康状态: $HEALTH_STATUS"
else
    echo "   ✗ API健康状态: $HEALTH_STATUS"
fi

# 测试前端访问
echo ""
echo "5. 测试前端访问..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "   ✓ 前端页面可访问 (HTTP $FRONTEND_STATUS)"
else
    echo "   ✗ 前端页面无法访问 (HTTP $FRONTEND_STATUS)"
fi

# 检查数据库
echo ""
echo "6. 检查数据库文件..."
DB_FILE="/root/.openclaw/workspace/wyckoff-stock-analyzer/wyckoff.db"
if [ -f "$DB_FILE" ]; then
    DB_SIZE=$(du -h "$DB_FILE" | awk '{print $1}')
    echo "   ✓ 数据库文件存在 ($DB_SIZE)"
else
    echo "   ✗ 数据库文件不存在"
fi

# 检查日志文件
echo ""
echo "7. 检查日志文件..."
echo "   后端日志: /tmp/wyckoff-api.log"
echo "   前端日志: /tmp/frontend.log"

# 显示最近的错误
echo ""
echo "8. 最近的错误日志..."
echo "   后端错误:"
tail -5 /tmp/wyckoff-api.log 2>/dev/null | grep -i "error\|exception\|failed" || echo "   无错误"
echo ""
echo "   前端错误:"
tail -5 /tmp/frontend.log 2>/dev/null | grep -i "error\|404\|500" || echo "   无错误"

echo ""
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "访问地址:"
echo "  前端: http://45.153.246.2:3000"
echo "  API文档: http://45.153.246.2:8000/docs"
echo "  健康检查: http://45.153.246.2:8000/api/v1/health"
echo ""
echo "JavaScript测试页面:"
echo "  http://45.153.246.2:3000/test.html"
