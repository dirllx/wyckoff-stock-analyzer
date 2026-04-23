# 威科夫股票分析器 - 安装指南

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 操作系统: Windows / macOS / Linux
- 内存: 最少 2GB
- 磁盘: 最少 5GB

## 安装前准备

### 1. 安装 Docker

**Windows:**
```
下载: https://www.docker.com/products/docker-desktop
安装后启动 Docker Desktop
```

**macOS:**
```
下载: https://www.docker.com/products/docker-desktop
安装后启动 Docker Desktop
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. 验证安装
```bash
docker --version
docker compose version
```

## 安装方式

### 方式一: 在线安装（推荐）

适合网络畅通的环境，自动从GitHub拉取最新镜像。

```bash
# 下载安装脚本
curl -fsSL https://raw.githubusercontent.com/dirllx/wyckoff-stock-analyzer/main/install.sh -o install.sh

# 运行安装
chmod +x install.sh
./install.sh
```

### 方式二: 离线安装

适合无网络或内网环境。

```bash
# 1. 在有网络的环境打包
./package.sh

# 2. 复制 dist/wyckoff-analyzer-1.0.0.tar.gz 到目标机器

# 3. 解压并安装
tar -xzf wyckoff-analyzer-1.0.0.tar.gz
cd wyckoff-analyzer-1.0.0
./install.sh
```

### 方式三: 源码安装

适合开发者或需要自定义配置。

```bash
# 克隆仓库
git clone https://github.com/dirllx/wyckoff-stock-analyzer.git
cd wyckoff-stock-analyzer

# 构建镜像
docker compose build

# 启动服务
docker compose up -d
```

## 使用方法

### 启动服务
```bash
docker compose up -d
# 或使用脚本: ./start.sh
```

### 停止服务
```bash
docker compose down
# 或使用脚本: ./stop.sh
```

### 查看日志
```bash
# 所有服务
docker compose logs -f

# 仅前端
docker compose logs -f frontend

# 仅后端
docker compose logs -f backend
```

### 重启服务
```bash
docker compose restart
```

### 更新版本
```bash
# 拉取最新镜像
docker compose pull

# 重新创建容器
docker compose up -d
```

## 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端界面 | http://localhost:3000 | 主应用界面 |
| 后端API | http://localhost:8000 | API接口 |
| API文档 | http://localhost:8000/docs | Swagger文档 |

## 目录结构

```
wyckoff-analyzer/
├── frontend/          # 前端静态文件
├── backend/           # 后端应用
├── docker-compose.yml # Docker编排配置
├── install.sh         # 安装脚本
├── start.sh           # 启动脚本
├── stop.sh            # 停止脚本
└── INSTALL.md         # 本说明文档
```

## 配置说明

### 环境变量

编辑 `.env` 文件（复制自 `.env.example`）：

```bash
# 数据库
DATABASE_URL=sqlite:///./wyckoff.db

# API配置
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# 数据源配置
DATA_SOURCE=ashare
```

### 端口修改

编辑 `docker-compose.yml`，修改端口映射：

```yaml
services:
  frontend:
    ports:
      - "3000:3000"  # 改为 "8080:3000" 则访问 8080
  backend:
    ports:
      - "8000:8000"  # 改为 "9000:8000" 则访问 9000
```

## 数据持久化

数据存储在Docker卷中：

```bash
# 查看卷
docker volume ls | grep wyckoff

# 备份数据
docker run --rm -v wyckoff_wyckoff_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/wyckoff-data-backup.tar.gz -C /data .

# 恢复数据
docker run --rm -v wyckoff_wyckoff_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/wyckoff-data-backup.tar.gz -C /data
```

## 卸载

### 完全卸载（删除数据）
```bash
docker compose down -v
rm -rf wyckoff-analyzer
```

### 保留数据卸载
```bash
docker compose down
```

## 故障排查

### 问题: 端口被占用
```bash
# 查看占用端口的进程
lsof -i :3000
lsof -i :8000

# 停止占用进程或修改 docker-compose.yml 端口
```

### 问题: 容器无法启动
```bash
# 查看详细日志
docker compose logs backend
docker compose logs frontend

# 重新构建镜像
docker compose build --no-cache
docker compose up -d
```

### 问题: 数据无法加载
```bash
# 检查数据库权限
docker exec -it wyckoff-backend ls -la /app/

# 重置数据库
docker exec -it wyckoff-backend rm /app/wyckoff.db
docker compose restart backend
```

### 问题: 前端页面空白
```bash
# 检查前端容器状态
docker ps | grep frontend

# 查看nginx日志
docker compose logs frontend
```

## 技术支持

- GitHub: https://github.com/dirllx/wyckoff-stock-analyzer
- Issues: https://github.com/dirllx/wyckoff-stock-analyzer/issues

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-04-23 | 初始版本，支持基础分析功能 |
