"""
形态识别API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.services.pattern_service import PatternRecognitionService
from app.services.data.data_fetcher import DataFetcher
from app.services.data.data_storage import DataStorage
from app.services.data.source_scheduler import get_scheduler
from app.models.database import Stock
from app.repositories.stock_repository import StockRepository
from app.utils.converters import dict_to_stock_quotes
import pandas as pd

router = APIRouter(prefix="/api/v1/stocks", tags=["形态识别"])


@router.post(
    "/{code}/patterns",
    summary="识别技术形态",
    description="""
    自动识别股票K线中的经典技术形态。

    ## 支持的形态

    - **Spring**: 弹簧形态 - 破位后快速收回
    - **Breakout**: 突破形态 - 突破关键阻力位

    ## 识别要求

    - 至少需要20条K线数据
    - 支持日线和周线分析

    ## 返回内容

    - 形态类型
    - 识别置信度
    - 形态位置（日期、价格）
    - 形态描述

    ## 示例请求

    ```
    POST /api/v1/stocks/688234/patterns?timeframe=daily
    ```

    ## 示例响应

    ```json
    {
      "stock_code": "688234",
      "timeframe": "daily",
      "total": 2,
      "patterns": [
        {
          "type": "Spring",
          "date": "2024-03-15",
          "confidence": 85,
          "description": "检测到弹簧形态"
        }
      ]
    }
    ```
    """
)
async def recognize_patterns(
    code: str,
    timeframe: str = "daily",
    db: Session = Depends(get_db)
):
    # 获取或创建股票
    repo = StockRepository(db)
    stock = repo.find_by_code(code)
    if not stock:
        raise HTTPException(status_code=404, detail=f"股票 {code} 不存在")

    # 获取K线数据 - 优先使用调度器
    quotes = None
    try:
        # 使用多数据源调度器获取数据
        scheduler = get_scheduler()
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        end_date_str = datetime.now().strftime("%Y-%m-%d")

        # 调用调度器
        quotes_dict = scheduler.fetch_with_fallback(
            code=code,
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date_str
        )

        # 转换为StockQuote对象
        quotes = dict_to_stock_quotes(quotes_dict, stock.id, timeframe)

    except Exception as e:
        # 降级到数据库查询
        from loguru import logger
        logger.warning(f"调度器获取失败，降级到数据库: {e}")
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


@router.get(
    "/{code}/patterns/history",
    summary="获取形态识别历史",
    description="""
    获取指定股票的历史形态识别记录。

    ## 参数说明

    - **pattern_type**: 可选，过滤特定形态类型
    - **days**: 查询最近N天的记录（默认30天）

    ## 示例请求

    ```
    GET /api/v1/stocks/688234/patterns/history?pattern_type=Spring&days=7
    ```
    """
)
def get_pattern_history(
    code: str,
    pattern_type: str = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
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


@router.get(
    "/patterns/list",
    summary="获取支持的形态类型",
    description="""
    返回系统支持的所有技术形态类型列表。

    ## 返回内容

    - 形态名称
    - 形态描述
    - 识别参数

    ## 示例响应

    ```json
    {
      "total": 2,
      "patterns": [
        {
          "name": "Spring",
          "description": "弹簧形态"
        },
        {
          "name": "Breakout",
          "description": "突破形态"
        }
      ]
    }
    ```
    """
)
def list_supported_patterns():
    from app.detectors import PatternFactory

    return {
        "total": len(PatternFactory.get_supported_patterns()),
        "patterns": PatternFactory.get_supported_patterns()
    }
