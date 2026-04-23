#!/bin/bash

set -e

VERSION=${1:-latest}
REGISTRY="ghcr.io/dirllx"

echo "威科夫股票分析器 - 构建打包脚本 v$VERSION"
echo "======================================"

# 构建前端镜像
echo "构建前端镜像..."
docker build -t $REGISTRY/wyckoff-frontend:$VERSION -f frontend/Dockerfile frontend/
docker tag $REGISTRY/wyckoff-frontend:$VERSION $REGISTRY/wyckoff-frontend:latest

# 构建后端镜像
echo "构建后端镜像..."
docker build -t $REGISTRY/wyckoff-backend:$VERSION -f backend/Dockerfile backend/
docker tag $REGISTRY/wyckoff-backend:$VERSION $REGISTRY/wyckoff-backend:latest

echo ""
echo "构建完成！"
echo "镜像列表:"
docker images | grep wyckoff

echo ""
echo "推送镜像? (需要登录)"
read -p "推送到GitHub? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "推送前端镜像..."
    docker push $REGISTRY/wyckoff-frontend:$VERSION
    docker push $REGISTRY/wyckoff-frontend:latest

    echo "推送后端镜像..."
    docker push $REGISTRY/wyckoff-backend:$VERSION
    docker push $REGISTRY/wyckoff-backend:latest

    echo "推送完成！"
fi

echo ""
echo "创建离线安装包..."
mkdir -p dist
cd dist

# 保存镜像为tar文件
echo "导出镜像..."
docker save $REGISTRY/wyckoff-frontend:latest -o wyckoff-frontend.tar
docker save $REGISTRY/wyckoff-backend:latest -o wyckoff-backend.tar
docker save redis:7-alpine -o redis.tar

# 创建离线安装脚本
cat > install-offline.sh << 'EOFSCRIPT'
#!/bin/bash
set -e

echo "威科夫分析器 - 离线安装"
echo "加载Docker镜像..."

docker load -i wyckoff-frontend.tar
docker load -i wyckoff-backend.tar
docker load -i redis.tar

echo "创建配置文件..."
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
    volumes:
      - wyckoff_data:/app/data
    restart: unless-stopped

volumes:
  wyckoff_data:
EOF

docker compose up -d
echo "安装完成！访问 http://localhost:3000"
EOFSCRIPT

chmod +x install-offline.sh

# 打包
echo "打包安装文件..."
tar -czf wyckoff-analyzer-offline.tar.gz *.tar install-offline.sh

cd ..
echo "离线安装包: dist/wyckoff-analyzer-offline.tar.gz"

echo ""
echo "======================================"
echo "打包完成！"
echo "在线安装: 使用 install.sh"
echo "离线安装: 解压 dist/wyckoff-analyzer-offline.tar.gz 后运行 install-offline.sh"
echo "======================================"
