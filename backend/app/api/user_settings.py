"""
用户配置管理API
基于实际功能需求设计的配置系统
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.services.config_service import ConfigService

router = APIRouter(prefix="/api/v1/settings", tags=["用户配置"])


# ===================== 配置数据模型 =====================

class AnalysisConfig(BaseModel):
    """分析配置"""
    default_timeframe: str = "daily"  # 默认分析周期
    multi_timeframes: List[str] = ["daily", "weekly", "30", "60"]  # 多周期默认启用
    signal_threshold: int = 3  # 信号触发阈值（分数）
    enable_cache: bool = True  # 是否启用缓存


class DataConfig(BaseModel):
    """数据配置"""
    kline_count: int = 500  # K线数量
    cache_ttl_hours: int = 1  # 缓存时长（小时）
    enable_redis: bool = True  # 是否启用Redis


class DisplayConfig(BaseModel):
    """显示配置"""
    watchlist_columns: int = 5  # 关注列表每行显示数量
    default_sort: str = "score_desc"  # 默认排序
    show_investment_advice: bool = True  # 显示投资建议


class NotificationConfig(BaseModel):
    """通知配置"""
    feishu_webhook: Optional[str] = None  # 飞书Webhook URL
    enable_notification: bool = False  # 是否启用通知
    min_notify_score: int = 4  # 最小通知评分
    rate_limit_minutes: int = 30  # 限流时间（分钟）


class TradingConfig(BaseModel):
    """交易建议配置"""
    stop_loss_percent: float = 5.0  # 止损建议（%）
    take_profit_percent: float = 8.0  # 止盈建议（%）
    position_percent: float = 20.0  # 建议仓位（%）


class AllSettings(BaseModel):
    """所有配置"""
    analysis: AnalysisConfig
    data: DataConfig
    display: DisplayConfig
    notification: NotificationConfig
    trading: TradingConfig


# ===================== 配置存储 =====================

# 简单内存存储（生产环境应使用数据库）
_settings_storage = {
    "analysis": {
        "default_timeframe": "daily",
        "multi_timeframes": ["daily", "weekly", "30", "60"],
        "signal_threshold": 3,
        "enable_cache": True
    },
    "data": {
        "kline_count": 500,
        "cache_ttl_hours": 1,
        "enable_redis": True
    },
    "display": {
        "watchlist_columns": 5,
        "default_sort": "score_desc",
        "show_investment_advice": True
    },
    "notification": {
        "feishu_webhook": None,
        "enable_notification": False,
        "min_notify_score": 4,
        "rate_limit_minutes": 30
    },
    "trading": {
        "stop_loss_percent": 5.0,
        "take_profit_percent": 8.0,
        "position_percent": 20.0
    }
}


# ===================== API接口 =====================

@router.get("/")
async def get_all_settings():
    """获取所有配置"""
    return _settings_storage


@router.get("/{category}")
async def get_settings_category(category: str):
    """获取指定类别的配置"""
    if category not in _settings_storage:
        raise HTTPException(status_code=404, detail=f"配置类别不存在: {category}")
    return _settings_storage[category]


@router.put("/{category}")
async def update_settings_category(category: str, settings: dict):
    """更新指定类别的配置"""
    if category not in _settings_storage:
        raise HTTPException(status_code=404, detail=f"配置类别不存在: {category}")

    # 更新配置
    _settings_storage[category].update(settings)

    return {
        "message": f"{category} 配置已更新",
        "settings": _settings_storage[category]
    }


@router.post("/")
async def save_all_settings(settings: AllSettings):
    """保存所有配置"""
    _settings_storage["analysis"] = settings.analysis.dict()
    _settings_storage["data"] = settings.data.dict()
    _settings_storage["display"] = settings.display.dict()
    _settings_storage["notification"] = settings.notification.dict()
    _settings_storage["trading"] = settings.trading.dict()

    return {
        "message": "所有配置已保存",
        "settings": _settings_storage
    }


@router.post("/reset")
async def reset_settings():
    """重置所有配置为默认值"""
    global _settings_storage
    _settings_storage = {
        "analysis": {
            "default_timeframe": "daily",
            "multi_timeframes": ["daily", "weekly", "30", "60"],
            "signal_threshold": 3,
            "enable_cache": True
        },
        "data": {
            "kline_count": 500,
            "cache_ttl_hours": 1,
            "enable_redis": True
        },
        "display": {
            "watchlist_columns": 5,
            "default_sort": "score_desc",
            "show_investment_advice": True
        },
        "notification": {
            "feishu_webhook": None,
            "enable_notification": False,
            "min_notify_score": 4,
            "rate_limit_minutes": 30
        },
        "trading": {
            "stop_loss_percent": 5.0,
            "take_profit_percent": 8.0,
            "position_percent": 20.0
        }
    }

    return {
        "message": "配置已重置为默认值",
        "settings": _settings_storage
    }
