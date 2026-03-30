#!/bin/bash
# Redis 安装脚本 for macOS
# 适用于没有管理员权限的情况

echo "🔧 Redis 安装脚本"
echo "=================="

# 方法1: 检查是否已有Redis
if [ -f "$HOME/redis-stable/src/redis-server" ]; then
    echo "✅ Redis已编译在 $HOME/redis-stable/"
    echo "启动命令: $HOME/redis-stable/src/redis-server"
    exit 0
fi

# 方法2: 下载并编译Redis（推荐，不需要管理员权限）
echo ""
echo "📥 正在下载Redis源码..."
cd /tmp
curl -L https://github.com/redis/redis/archive/refs/tags/7.2.3.tar.gz -o redis.tar.gz

if [ $? -ne 0 ]; then
    echo "❌ 下载失败，请检查网络连接"
    echo ""
    echo "📖 手动安装步骤："
    echo "1. 打开浏览器访问: https://github.com/redis/redis/releases"
    echo "2. 下载最新版本的tar.gz文件"
    echo "3. 解压后，在终端运行: make"
    echo "4. 启动: ./src/redis-server"
    exit 1
fi

echo "✅ 下载完成"
echo "🔨 正在编译Redis（可能需要几分钟）..."

tar xzf redis.tar.gz
cd redis-7.2.3
make

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Redis编译成功！"
    echo ""
    echo "📂 安装位置: $(pwd)"
    echo ""
    echo "🚀 启动Redis:"
    echo "   cd $(pwd)"
    echo "   ./src/redis-server"
    echo ""
    echo "💡 后台启动:"
    echo "   ./src/redis-server --daemonize yes"
    echo ""
    echo "✅ 验证运行:"
    echo "   ./src/redis-cli ping"
    echo "   应该返回: PONG"
else
    echo "❌ 编译失败"
    echo "可能缺少编译工具，请安装Xcode Command Line Tools:"
    echo "   xcode-select --install"
    exit 1
fi
