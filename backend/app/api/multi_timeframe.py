"""
多周期分析API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.multi_timeframe import MultiTimeframeService
from app.services.config_service import ConfigService

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
    """
    try:
        mt_service = MultiTimeframeService(db)
        result = mt_service.analyze_all_timeframes(code)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
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
