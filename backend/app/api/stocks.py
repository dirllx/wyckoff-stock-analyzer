"""
股票分析API（修复版）
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from loguru import logger

from app.database import get_db
from app.models.database import Stock, StockQuote, WyckoffSignal
from app.models.schemas import (
    StockAnalysisRequest,
    StockAnalysisResponse,
    WyckoffSignalResponse,
    MessageResponse
)
from app.services import DataStorage, WyckoffAnalyzer

router = APIRouter()


@router.post("/stocks/analyze", response_model=StockAnalysisResponse)
async def analyze_stock(request: StockAnalysisRequest, db: Session = Depends(get_db)):
    """
    分析股票威科夫信号

    Args:
        request: 分析请求 (股票代码、时间周期)
        db: 数据库会话

    Returns:
        分析结果
    """
    try:
        # 获取或创建股票（修复：如果不存在则自动创建）
        storage = DataStorage(db)
        stock = storage.get_or_create_stock(request.code)

        # 获取K线数据
        quotes = storage.get_quotes(request.code, request.timeframe, limit=300)

        if not quotes:
            # 尝试更新数据
            logger.info(f"股票{request.code}没有K线数据，尝试更新...")
            storage.update_stock_quotes(request.code, request.timeframe)
            quotes = storage.get_quotes(request.code, request.timeframe, limit=300)

            if not quotes:
                raise HTTPException(
                    status_code=400,
                    detail=f"股票{request.code}暂无数据，请稍后再试"
                )

        # 执行威科夫分析
        analyzer = WyckoffAnalyzer()
        analysis_result = analyzer.analyze(stock, quotes)

        # 如果分析结果有效，保存信号
        if analysis_result["score"] >= 3:
            # 检查是否已有今日信号
            today = datetime.now().date()
            existing_signal = db.query(WyckoffSignal).filter(
                WyckoffSignal.stock_id == stock.id,
                WyckoffSignal.timeframe == request.timeframe,
                WyckoffSignal.date >= datetime.combine(today, datetime.min.time())
            ).first()

            if not existing_signal:
                # 创建新信号
                signal = WyckoffSignal(
                    stock_id=stock.id,
                    date=datetime.now(),
                    timeframe=request.timeframe,
                    signal_type=analysis_result["signal_type"],
                    direction=analysis_result["direction"],
                    score=analysis_result["score"],
                    confidence=analysis_result["confidence"],
                    strength=analysis_result["strength"],
                    trigger_price=quotes[-1].close,
                    suggestion=analysis_result["suggestion"],
                    reason=analysis_result["reason"],
                    verified="PENDING"
                )
                db.add(signal)
                db.commit()
                logger.info(f"创建威科夫信号: {request.code} {analysis_result['direction']} 分数{analysis_result['score']}")

        # 获取最近的信号
        recent_signals = db.query(WyckoffSignal).filter(
            WyckoffSignal.stock_id == stock.id,
            WyckoffSignal.timeframe == request.timeframe
        ).order_by(WyckoffSignal.date.desc()).limit(5).all()

        # 构建响应
        return StockAnalysisResponse(
            stock=stock,
            current_quote=quotes[-1] if quotes else None,
            signals=[
                WyckoffSignalResponse.model_validate(signal)
                for signal in recent_signals
            ],
            analysis_summary=analysis_result
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"分析股票失败: {e}")
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/stocks/{code}/signals", response_model=list[WyckoffSignalResponse])
async def get_stock_signals(code: str, db: Session = Depends(get_db)):
    """
    获取股票的历史威科夫信号

    Args:
        code: 股票代码
        db: 数据库会话

    Returns:
        信号列表
    """
    stock = db.query(Stock).filter(Stock.code == code).first()
    if not stock:
        raise HTTPException(status_code=404, detail=f"股票代码{code}不存在")

    signals = db.query(WyckoffSignal).filter(
        WyckoffSignal.stock_id == stock.id
    ).order_by(WyckoffSignal.date.desc()).limit(20).all()

    return [
        WyckoffSignalResponse.model_validate(signal)
        for signal in signals
    ]


@router.post("/stocks/{code}/update")
async def update_stock_data(code: str, db: Session = Depends(get_db)):
    """
    手动更新股票数据

    Args:
        code: 股票代码
        db: 数据库会话

    Returns:
        更新结果
    """
    try:
        storage = DataStorage(db)
        # 先创建股票（如果不存在）
        storage.get_or_create_stock(code)

        success = storage.update_stock_quotes(code)

        if success:
            return MessageResponse(
                message=f"股票{code}数据更新成功"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"股票{code}数据更新失败"
            )

    except Exception as e:
        logger.error(f"更新股票数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")


@router.get("/stocks/{code}/quotes")
async def get_stock_quotes(
    code: str,
    timeframe: str = "daily",
    limit: int = 300,
    db: Session = Depends(get_db)
):
    """
    获取股票K线数据（用于图表展示）

    Args:
        code: 股票代码
        timeframe: 时间周期
        limit: 返回数量

    Returns:
        K线数据列表
    """
    try:
        storage = DataStorage(db)
        # 先创建股票（如果不存在）
        stock = storage.get_or_create_stock(code)

        quotes = storage.get_quotes(code, timeframe, limit)

        # 动态计算额外的均线（MA20/MA30/MA60/MA90/MA120/MA250）
        # 注意：MA20直接使用数据库中的值，不重新计算
        closes = [q.close for q in quotes]

        def calculate_ma(data, window):
            if len(data) < window:
                return [None] * len(data)
            ma = []
            for i in range(len(data)):
                if i < window - 1:
                    ma.append(None)
                else:
                    ma.append(sum(data[i-window+1:i+1]) / window)
            return ma

        # MA20直接使用数据库中的值（不计算）
        ma20 = [q.ma20 for q in quotes]
        ma30 = calculate_ma(closes, 30)
        ma60 = calculate_ma(closes, 60)
        ma90 = calculate_ma(closes, 90)
        ma120 = calculate_ma(closes, 120)
        ma250 = calculate_ma(closes, 250)

        return {
            "code": code,
            "timeframe": timeframe,
            "total": len(quotes),
            "quotes": [
                {
                    "date": q.date.strftime("%Y-%m-%d %H:%M:%S"),
                    "open": q.open,
                    "high": q.high,
                    "low": q.low,
                    "close": q.close,
                    "volume": q.volume,
                    "ma5": q.ma5,
                    "ma10": q.ma10,
                    "ma20": q.ma20,
                    "ma20": ma20[i] if i < len(ma20) else None,
                    "ma30": ma30[i] if i < len(ma30) else None,
                    "ma60": ma60[i] if i < len(ma60) else None,
                    "ma90": ma90[i] if i < len(ma90) else None,
                    "ma120": ma120[i] if i < len(ma120) else None,
                    "ma250": ma250[i] if i < len(ma250) else None,
                    "volume_ma5": q.volume_ma5,
                    "obv": q.obv
                }
                for i, q in enumerate(quotes)
            ]
        }
    except Exception as e:
        logger.error(f"获取K线数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")
