"""
FastAPI应用主入口
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from loguru import logger
import sys

from app.database import init_db
from app.api import health_router, stocks_router, config_router, patterns_router, multi_timeframe_router, feishu_router, risk_router, realtime_router, watchlist_router
from app.api import user_settings_router

# 配置日志
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO"
)

# 创建FastAPI应用
app = FastAPI(
    title="威科夫股票分析系统",
    description="基于威科夫指标的智能股票分析系统",
    version="1.0.0"
)

# 配置速率限制器
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """
    应用启动时执行
    初始化数据库
    """
    logger.info("正在初始化数据库...")
    try:
        init_db()
        logger.info("数据库初始化成功")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """
    应用关闭时执行
    """
    logger.info("应用正在关闭...")


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "威科夫股票分析系统",
        "version": "1.0.0",
        "docs": "/docs"
    }


# 注册路由
app.include_router(health_router, prefix="/api/v1", tags=["健康检查"])
app.include_router(stocks_router, prefix="/api/v1", tags=["股票分析"])
app.include_router(config_router)
app.include_router(user_settings_router)
app.include_router(patterns_router)
app.include_router(multi_timeframe_router)
app.include_router(feishu_router)
app.include_router(risk_router)
app.include_router(realtime_router)
app.include_router(watchlist_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
