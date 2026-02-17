"""
形态识别API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.pattern_service import PatternRecognitionService
from app.services.data.data_fetcher import DataFetcher
from app.services.data.data_storage import DataStorage
from app.models.database import Stock
import pandas as pd

router = APIRouter(prefix="/api/v1/stocks", tags=["形态识别"])


@router.post("/{code}/patterns")
def recognize_patterns(
    code: str,
    timeframe: str = "daily",
    db: Session = Depends(get_db)
):
    """
    识别股票形态

    Args:
        code: 股票代码
        timeframe: 时间周期 (daily/weekly)
    """
    # 获取或创建股票
    stock = db.query(Stock).filter(Stock.code == code).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"股票 {code} 不存在")

    # 获取K线数据
    storage = DataStorage(db)
    quotes = storage.get_quotes_by_timeframe(stock.id, timeframe)

    if not quotes or len(quotes) < 20:
        raise HTTPException(
            status_code=400,
            detail="数据不足，需要至少20条K线数据"
        )

    # 转换为DataFrame
    data = []
    for q in quotes:
        data.append({
            "date": q.date,
            "open": q.open,
            "high": q.high,
            "low": q.low,
            "close": q.close,
            "volume": q.volume,
            "ma5": q.ma5,
            "ma10": q.ma10,
            "ma20": q.ma20,
            "volume_ma5": q.volume_ma5,
            "obv": q.obv
        })
    df = pd.DataFrame(data).sort_values("date").reset_index(drop=True)

    # 形态识别
    pattern_service = PatternRecognitionService(db)
    patterns = pattern_service.recognize_patterns(stock, df, timeframe)

    return {
        "stock_code": code,
        "timeframe": timeframe,
        "total": len(patterns),
        "patterns": patterns
    }


@router.get("/{code}/patterns/history")
def get_pattern_history(
    code: str,
    pattern_type: str = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    获取形态识别历史

    Args:
        code: 股票代码
        pattern_type: 形态类型（可选）
        days: 查询最近多少天
    """
    pattern_service = PatternRecognitionService(db)
    history = pattern_service.get_pattern_history(
        stock_code=code,
        pattern_type=pattern_type,
        days=days
    )

    return {
        "stock_code": code,
        "pattern_type": pattern_type,
        "days": days,
        "total": len(history),
        "items": history
    }


@router.get("/patterns/list")
def list_supported_patterns():
    """获取支持的形态类型列表"""
    from app.detectors import PatternFactory

    return {
        "total": len(PatternFactory.get_supported_patterns()),
        "patterns": PatternFactory.get_supported_patterns()
    }
