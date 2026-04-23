#!/bin/bash

set -e

INSTALL_DIR="$HOME/wyckoff-analyzer"
SERVICE_NAME="wyckoff"
VERSION="1.0.0"

echo "威科夫股票分析器 v$VERSION 安装程序"
echo "======================================"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 未安装Docker"
    echo "请访问 https://www.docker.com/get-started 下载安装"
    exit 1
fi

# 检查Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "错误: 未安装Docker Compose"
    exit 1
fi

# 创建安装目录
echo "创建安装目录: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 下载或复制文件
echo "准备应用文件..."

# 创建docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  frontend:
    image: ghcr.io/dirllx/wyckoff-frontend:latest
    container_name: wyckoff-frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: ghcr.io/dirllx/wyckoff-backend:latest
    container_name: wyckoff-backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: sqlite:///./wyckoff.db
      API_HOST: 0.0.0.0
      API_PORT: 8000
      DEBUG: "False"
    volumes:
      - wyckoff_data:/app/data
    restart: unless-stopped

volumes:
  wyckoff_data:
EOF

# 创建启动脚本
cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose up -d
echo "威科夫分析器已启动"
echo "前端: http://localhost:3000"
echo "后端: http://localhost:8000"
EOF
chmod +x start.sh

# 创建停止脚本
cat > stop.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose down
echo "威科夫分析器已停止"
EOF
chmod +x stop.sh

# 创建更新脚本
cat > update.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose pull
docker compose up -d
echo "威科夫分析器已更新"
EOF
chmod +x update.sh

# 创建卸载脚本
cat > uninstall.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker compose down -v
read -p "是否删除安装目录? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ..
    rm -rf "$(pwd)/wyckoff-analyzer"
    echo "已卸载"
fi
EOF
chmod +x uninstall.sh

# 拉取镜像并启动
echo "拉取Docker镜像..."
docker compose pull

echo "启动服务..."
docker compose up -d

echo ""
echo "安装完成！"
echo "======================================"
echo "前端地址: http://localhost:3000"
echo "后端API: http://localhost:8000"
echo ""
echo "管理命令:"
echo "  启动: ./start.sh"
echo "  停止: ./stop.sh"
echo "  更新: ./update.sh"
echo "  卸载: ./uninstall.sh"
echo "======================================"
