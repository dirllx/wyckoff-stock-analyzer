# Wyckoff Stock Analyzer - 测试环境部署说明

## 部署状态
✅ 后端服务：已部署并运行
✅ 前端服务：已部署并运行

## 服务信息
- **后端 API**: http://localhost:8000
- **前端界面**: http://localhost:3000
- **API 文档**: http://localhost:8000/docs
- **数据库**: SQLite (位于 /root/.openclaw/workspace/wyckoff-stock-analyzer/wyckoff.db)
- **Redis**: localhost:6379 (未启用，可选择性配置)

## 项目位置
- **代码仓库**: /root/wyckoff-stock-analyzer
- **虚拟环境**: /root/wyckoff-stock-analyzer/venv
- **前端文件**: /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend
- **数据库文件**: /root/.openclaw/workspace/wyckoff-stock-analyzer/wyckoff.db
- **配置文件**: /root/.openclaw/workspace/wyckoff-stock-analyzer/.env
- **日志文件**:
  - 后端: /tmp/wyckoff.log
  - 前端: /tmp/frontend.log

## 管理脚本

### 启动所有服务
```bash
# 启动后端
bash /root/.openclaw/workspace/wyckoff-stock-analyzer/start.sh

# 启动前端
bash /root/.openclaw/workspace/wyckoff-stock-analyzer/start-frontend.sh
```

### 停止所有服务
```bash
# 停止后端
bash /root/.openclaw/workspace/wyckoff-stock-analyzer/stop.sh

# 停止前端
bash /root/.openclaw/workspace/wyckoff-stock-analyzer/stop-frontend.sh
```

### 查看日志
```bash
# 后端日志
tail -f /tmp/wyckoff.log

# 前端日志
tail -f /tmp/frontend.log
```

### 查看日志
```bash
tail -f /tmp/wyckoff.log
```

### 手动启动（调试模式）

#### 后端
```bash
cd /root/wyckoff-stock-analyzer/backend
source ../venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 前端
```bash
cd /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend
python3 -m http.server 3000
```

## 主要 API 端点

### 健康检查
```bash
curl http://localhost:8000/api/v1/health
```

### 股票分析
```bash
curl -X POST http://localhost:8000/api/v1/stocks/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "688234", "timeframe": "daily"}'
```

### 获取股票 K 线数据
```bash
curl "http://localhost:8000/api/v1/stocks/688234/quotes?timeframe=daily&limit=10"
```

### 更新股票数据
```bash
curl -X POST http://localhost:8000/api/v1/stocks/688234/update
```

## 已配置的股票代码
- 688234 (A股)
- 000001 (A股)
- 688052 (A股)
- 600570 (A股)
- 516100 (未知)
- 588250 (未知)
- 588290 (未知)

## 技术栈

### 后端
- Python 3.12
- FastAPI 0.115.0
- SQLAlchemy 2.0.28
- SQLite
- Uvicorn 0.30.0
- Akshare (股票数据)
- Easyquotation (实时行情)

### 前端
- HTML5 + CSS3 + JavaScript (ES6+)
- Lightweight Charts (K线图表库)
- Python HTTP Server (静态文件服务)

## 注意事项
1. **后端服务**运行在 8000 端口
2. **前端服务**运行在 3000 端口
3. 使用 SQLite 数据库，数据持久化
4. 后端支持自动重启（--reload 模式）
5. 前端使用 Lightweight Charts 图表库
6. 日志记录:
   - 后端: /tmp/wyckoff.log
   - 前端: /tmp/frontend.log
7. 虚拟环境路径: /root/wyckoff-stock-analyzer/venv

## 下一步
- ✅ 已完成：启动前端服务
- 可选：配置 Redis 缓存
- 可选：配置飞书通知
- 可选：配置 Tushare Token
- 可选：配置 Nginx 反向代理
- 可选：启用 HTTPS

## 部署时间
- 后端部署: 2026-03-01 02:08 GMT+8
- 前端部署: 2026-03-01 02:11 GMT+8
- 系统测试: 2026-03-01 02:12 GMT+8 (全部通过 ✅)
