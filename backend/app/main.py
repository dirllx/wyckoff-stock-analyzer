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
from app.api import data_sources_router

# 配置日志
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO"
)

# 创建FastAPI应用
app = FastAPI(
    title="威科夫股票分析系统 API",
    description="""
基于威科夫方法的智能股票分析系统，提供A股、港股、基金等金融产品的技术分析和形态识别功能。

## 主要功能

### 📊 股票分析
- **威科夫分析**: 基于威科夫方法论的市场阶段识别（吸筹、上涨、派发、下跌）
- **多周期分析**: 支持日线、周线、月线及分钟线分析
- **形态识别**: 自动识别Spring、Breakout等经典技术形态
- **实时行情**: 提供实时股价查询服务

### 📈 技术指标
- 移动平均线: MA5/MA10/MA20/MA60/MA120/MA250
- 成交量指标: OBV（能量潮）、Volume MA5
- 威科夫信号: 方向、强度、置信度评分

### 🎯 数据支持
- **A股市场**: 沪深全市场股票（688科创板支持）
- **港股市场**: 港股实时数据
- **基金ETF**: 场内基金数据

## 数据来源

数据来源于东方财富网，通过akshare库获取。

## 使用限制

- 分析接口限制: 10次/分钟
- 建议使用Redis缓存提升性能

## 技术栈

- **框架**: FastAPI
- **数据库**: SQLite
- **缓存**: Redis（支持降级）
- **数据源**: akshare

---

**注意**: 本系统仅供学习参考，不构成投资建议。
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    tags_metadata=[
        {
            "name": "健康检查",
            "description": "系统健康状态检查接口",
        },
        {
            "name": "股票分析",
            "description": "股票威科夫分析、K线数据查询、信号获取",
        },
        {
            "name": "形态识别",
            "description": "技术形态识别（Spring、Breakout等）",
        },
        {
            "name": "多周期分析",
            "description": "多时间周期综合分析",
        },
        {
            "name": "风险管理",
            "description": "风险控制和建议",
        },
        {
            "name": "实时行情",
            "description": "实时股价查询",
        },
        {
            "name": "关注列表",
            "description": "用户自选股管理",
        },
        {
            "name": "配置管理",
            "description": "系统配置参数",
        },
        {
            "name": "数据源管理",
            "description": "多数据源配置、测速、优先级管理",
        },
    ]
)

# 配置速率限制器
limiter = Limiter(key_func=lambda: "127.0.0.1")  # 暂时禁用基于IP的速率限制
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
    初始化数据库、清除旧版本缓存
    """
    logger.info("正在初始化数据库...")
    try:
        init_db()
        logger.info("数据库初始化成功")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")

    # 清除旧版本缓存
    try:
        from app.services.redis_service import RedisService
        RedisService.clear_old_version_cache()
    except Exception as e:
        logger.warning(f"清除旧版本缓存失败: {e}")


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


# 注册路由（使用标准化的tags）
app.include_router(health_router, prefix="/api/v1", tags=["健康检查"])
app.include_router(stocks_router, prefix="/api/v1", tags=["股票分析"])
app.include_router(patterns_router, prefix="/api/v1", tags=["形态识别"])
app.include_router(multi_timeframe_router, prefix="/api/v1", tags=["多周期分析"])
app.include_router(risk_router, prefix="/api/v1", tags=["风险管理"])
app.include_router(realtime_router, prefix="/api/v1", tags=["实时行情"])
app.include_router(watchlist_router, prefix="/api/v1", tags=["关注列表"])
app.include_router(config_router, prefix="/api/v1", tags=["配置管理"])
app.include_router(user_settings_router, prefix="/api/v1", tags=["用户设置"])
app.include_router(feishu_router, prefix="/api/v1", tags=["飞书通知"])
app.include_router(data_sources_router, prefix="/api/v1", tags=["数据源管理"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
