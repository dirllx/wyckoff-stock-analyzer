# Wyckoff Stock Analyzer - 快速参考

## 一键启动

```bash
# 启动所有服务
cd /root/.openclaw/workspace/wyckoff-stock-analyzer
bash start.sh
bash start-frontend.sh

# 停止所有服务
bash stop.sh
bash stop-frontend.sh
```

## 访问地址

- **前端界面**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/api/v1/health

## 常用命令

### 服务管理
```bash
# 查看服务状态
ps aux | grep uvicorn
ps aux | grep "http.server 3000"

# 重启服务
bash stop.sh && bash start.sh
bash stop-frontend.sh && bash start-frontend.sh

# 运行系统测试
bash test-all.sh
```

### 日志查看
```bash
# 后端日志
tail -f /tmp/wyckoff.log

# 前端日志
tail -f /tmp/frontend.log
```

### API 测试
```bash
# 股票 K 线数据
curl "http://localhost:8000/api/v1/stocks/688234/quotes?limit=10"

# 分析股票
curl -X POST http://localhost:8000/api/v1/stocks/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "688234", "timeframe": "daily"}'

# 更新股票数据
curl -X POST http://localhost:8000/api/v1/stocks/688234/update
```

### 数据库查询
```bash
# 进入 Python 环境
cd /root/wyckoff-stock-analyzer/backend
source ../venv/bin/activate
python3

# 查询股票列表
import sqlite3
conn = sqlite3.connect('/root/.openclaw/workspace/wyckoff-stock-analyzer/wyckoff.db')
cursor = conn.cursor()
cursor.execute('SELECT code, name FROM stocks')
print(cursor.fetchall())
```

## 已配置股票代码

- 688234 (A股)
- 000001 (A股)
- 688052 (A股)
- 600570 (A股)
- 516100 (未知)
- 588250 (未知)
- 588290 (未知)

## 故障排查

### 前端无法访问
```bash
# 检查前端服务
ps aux | grep "http.server 3000"

# 检查端口占用
ss -tlnp | grep 3000

# 重启前端服务
bash stop-frontend.sh && bash start-frontend.sh
```

### 后端无法访问
```bash
# 检查后端服务
ps aux | grep uvicorn

# 查看后端日志
tail -50 /tmp/wyckoff.log

# 重启后端服务
bash stop.sh && bash start.sh
```

### 数据库错误
```bash
# 检查数据库文件
ls -lh /root/.openclaw/workspace/wyckoff-stock-analyzer/wyckoff.db

# 恢复备份
cp /root/wyckoff-stock-analyzer/backend/wyckoff.db.backup1 \
   /root/.openclaw/workspace/wyckoff-stock-analyzer/wyckoff.db
```

## 开发调试

### 后端调试模式
```bash
cd /root/wyckoff-stock-analyzer/backend
source ../venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 前端调试模式
```bash
cd /root/.openclaw/workspace/wyckoff-stock-analyzer/frontend
python3 -m http.server 3000
```

## 更新代码

```bash
# 拉取最新代码
cd /root/wyckoff-stock-analyzer
git pull

# 更新依赖
cd backend
source ../venv/bin/activate
pip install -r requirements.txt

# 重启服务
bash /root/.openclaw/workspace/wyckoff-stock-analyzer/stop.sh
bash /root/.openclaw/workspace/wyckoff-stock-analyzer/start.sh
```
