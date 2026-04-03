# Uvicorn生产环境配置
# 资源占用优化版本

import uvicorn

# 生产环境配置
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        # === 性能优化 ===
        workers=1,                    # 单worker模式（避免多进程资源占用）
        worker_class="uvicorn.workers.UvicornWorker",  # 使用同步worker
        limit_concurrency=10,         # 限制并发连接数
        timeout=30,                   # 请求超时30秒
        timeout_keep_alive=2,        # keep-alive超时2秒

        # === 禁用开发模式功能 ===
        reload=False,                 # 禁用自动重载（避免文件监控开销）
        log_level="warning",          # 降低日志级别
        access_log=True,             # 启用访问日志
        use_colors=False,             # 禁用颜色（减少日志开销）

        # === 资源限制 ===
        loop="uvloop",                # 使用uvloop（更快、更省资源）
        # 注意：需要先安装 uvloop: pip install uvloop
    )
