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

router = APIRouter(tags=["多周期分析"])


@router.post(
    "/stocks/{code}/analyze-multi",
    summary="多周期综合分析",
    description="""
    对指定股票进行多时间周期的综合分析。

    ## 分析逻辑

    1. 同时分析多个时间周期（日线、周线、月线等）
    2. 统计各周期的信号方向
    3. 计算综合信号和一致性

    ## 返回内容

    - **各周期分析结果**: 每个周期的威科夫分析
    - **综合信号**: 多周期一致的方向判断
    - **一致性**: HIGH/MEDIUM/LOW
    - **缓存统计**: 命中率、命中数量

    ## 示例请求

    ```
    POST /api/v1/stocks/688234/analyze-multi
    ```

    ## 示例响应

    ```json
    {
      "stock_code": "688234",
      "timeframes": {
        "daily": {...},
        "weekly": {...}
      },
      "summary": {
        "direction": "LONG",
        "suggestion": "BUY",
        "consistency": "HIGH",
        "confidence": 75.5
      },
      "cache_stats": {
        "cache_hit_count": 2,
        "total_timeframes": 3,
        "cache_hit_rate": 66.7
      },
      "from_cache": false
    }
    ```

    ## 缓存机制

    - 使用Redis缓存分析结果
    - 提高响应速度
    - 减少重复计算
    """
)
def analyze_multi_timeframes(
    code: str,
    db: Session = Depends(get_db)
):
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


@router.get(
    "/timeframes/available",
    summary="获取可用的时间周期",
    description="""
    获取系统配置的所有时间周期及其状态。

    ## 返回内容

    - 周期代码（daily, weekly, monthly等）
    - 周期名称
    - 是否启用
    - 优先级

    ## 示例响应

    ```json
    {
      "total": 4,
      "items": [
        {
          "timeframe": "daily",
          "name": "日线",
          "enabled": true,
          "priority": 1
        },
        {
          "timeframe": "weekly",
          "name": "周线",
          "enabled": true,
          "priority": 2
        }
      ]
    }
    ```
    """
)
def get_available_timeframes(db: Session = Depends(get_db)):
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
