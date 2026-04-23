#!/bin/bash

set -e

VERSION=${1:-"1.0.0"}
BUILD_DIR="dist/wyckoff-analyzer-$VERSION"

echo "威科夫股票分析器 - 分发包打包 v$VERSION"
echo "======================================"

# 清理并创建构建目录
rm -rf dist
mkdir -p "$BUILD_DIR"

# 复制前端文件
echo "复制前端文件..."
mkdir -p "$BUILD_DIR/frontend"
cp frontend/index.html "$BUILD_DIR/frontend/"
cp frontend/check_indicators.js "$BUILD_DIR/frontend/"
cp frontend/nginx.conf "$BUILD_DIR/frontend/"
cp frontend/Dockerfile "$BUILD_DIR/frontend/"

# 复制后端文件
echo "复制后端文件..."
mkdir -p "$BUILD_DIR/backend"
cp -r backend/app "$BUILD_DIR/backend/"
cp backend/requirements.txt "$BUILD_DIR/backend/"
cp backend/Dockerfile "$BUILD_DIR/backend/"
cp backend/.env.example "$BUILD_DIR/backend/.env"

# 复制配置文件
echo "复制配置文件..."
cp docker-compose.yml "$BUILD_DIR/"
cp .env.example "$BUILD_DIR/.env.example"

# 创建安装脚本
cat > "$BUILD_DIR/install.sh" << 'EOF'
#!/bin/bash

echo "威科夫股票分析器 - 安装"
echo "================================"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 请先安装Docker"
    echo "下载: https://www.docker.com/get-started"
    exit 1
fi

# 构建镜像
echo "构建Docker镜像..."
docker compose build

# 启动服务
echo "启动服务..."
docker compose up -d

echo ""
echo "安装完成！"
echo "前端: http://localhost:3000"
echo "后端: http://localhost:8000"
EOF
chmod +x "$BUILD_DIR/install.sh"

# 创建启动/停止脚本
cat > "$BUILD_DIR/start.sh" << 'EOF'
#!/bin/bash
docker compose up -d
echo "已启动"
EOF
chmod +x "$BUILD_DIR/start.sh"

cat > "$BUILD_DIR/stop.sh" << 'EOF'
#!/bin/bash
docker compose down
echo "已停止"
EOF
chmod +x "$BUILD_DIR/stop.sh"

# 创建README
cat > "$BUILD_DIR/README.txt" << 'EOF'
威科夫股票分析器
================================

安装方法:
1. 确保已安装Docker
2. 运行: ./install.sh

使用方法:
- 启动: ./start.sh
- 停止: ./stop.sh
- 查看日志: docker compose logs -f

访问地址:
- 前端界面: http://localhost:3000
- 后端API: http://localhost:8000

配置文件:
- .env: 环境配置

技术支持:
- GitHub: https://github.com/dirllx/wyckoff-stock-analyzer
EOF

# 打包
echo "打包..."
cd dist
tar -czf "wyckoff-analyzer-$VERSION.tar.gz" "wyckoff-analyzer-$VERSION"
zip -rq "wyckoff-analyzer-$VERSION.zip" "wyckoff-analyzer-$VERSION"
cd ..

echo ""
echo "======================================"
echo "打包完成！"
echo ""
echo "输出文件:"
echo "  dist/wyckoff-analyzer-$VERSION.tar.gz"
echo "  dist/wyckoff-analyzer-$VERSION.zip"
echo ""
echo "安装方法:"
echo "  1. 解压文件"
echo "  2. 运行 ./install.sh"
echo "======================================"
