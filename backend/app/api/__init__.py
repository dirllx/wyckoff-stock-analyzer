"""
API routes package
"""
from .health import router as health_router
from .stocks import router as stocks_router
from .config import router as config_router
from .patterns import router as patterns_router
from .multi_timeframe import router as multi_timeframe_router
from .feishu import router as feishu_router
from .risk import router as risk_router
from .realtime import router as realtime_router
from .watchlist import router as watchlist_router

__all__ = [
    "health_router",
    "stocks_router",
    "config_router",
    "patterns_router",
    "multi_timeframe_router",
    "feishu_router",
    "risk_router",
    "realtime_router",
    "watchlist_router"
]
