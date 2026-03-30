"""
多周期分析API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from loguru import logger

from app.database import get_db
from app.services.multi_timeframe import MultiTimeframeService
from app.services.config_service import ConfigService
from app.services.redis_service import (
    get_cached_multi_timeframe,
    cache_multi_timeframe,
    RedisService
)

router = APIRouter(prefix="/api/v1", tags=["多周期分析"])


@router.post("/stocks/{code}/analyze-multi")
def analyze_multi_timeframes(
    code: str,
    db: Session = Depends(get_db)
):
    """
    多周期综合分析

    Args:
        code: 股票代码

    Returns:
        多周期分析结果，包含from_cache字段表示是否来自缓存
    """
    try:
        # 获取配置的所有周期
        config_service = ConfigService(db)
        timeframes_config = config_service.get_all_timeframes()
        timeframes = [tf.timeframe for tf in timeframes_config if tf.enabled]

        # ========== Redis缓存：先检查缓存 ==========
        logger.info(f"多周期分析: {code}, 检查缓存...")
        cached_result = get_cached_multi_timeframe(code, timeframes)

        if cached_result:
            logger.info(f"✅ 从缓存获取多周期分析结果: {code} ({len(timeframes)}个周期)")
            # 添加from_cache标记
            cached_result["from_cache"] = True
            return cached_result

        # ========== 缓存未命中，执行完整分析 ==========
        logger.info(f"缓存未命中，执行多周期分析: {code} ({len(timeframes)}个周期)")

        mt_service = MultiTimeframeService(db)
        result = mt_service.analyze_all_timeframes(code)

        # ========== Redis缓存：缓存分析结果 ==========
        cache_multi_timeframe(code, timeframes, result)
        logger.info(f"💾 已缓存多周期分析结果: {code} ({len(timeframes)}个周期)")

        # 添加from_cache标记
        result["from_cache"] = False

        return result

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"多周期分析失败: {code}, 错误: {e}")
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/timeframes/available")
def get_available_timeframes(db: Session = Depends(get_db)):
    """获取可用的时间周期配置"""
    config_service = ConfigService(db)
    timeframes = config_service.get_all_timeframes()

    return {
        "total": len(timeframes),
        "items": [
            {
                "timeframe": tf.timeframe,
                "name": tf.timeframe_name,
                "enabled": tf.enabled,
                "priority": tf.priority
            }
            for tf in timeframes
        ]
    }
