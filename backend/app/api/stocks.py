"""
股票分析API（修复版）
"""
from datetime import datetime, time
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
from app.services.redis_service import (
    get_cached_analysis,
    cache_analysis,
    get_cached_stock_data,
    cache_stock_data,
    RedisService
)
from app.utils.converters import dict_to_stock_quotes

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
        # ========== Redis缓存：先检查缓存 ==========
        cached_analysis = get_cached_analysis(request.code, request.timeframe)
        if cached_analysis:
            logger.info(f"✅ 从缓存获取分析结果: {request.code} {request.timeframe}")

            # 从缓存返回时，仍然需要查询最近的信号
            stock = db.query(Stock).filter(Stock.code == request.code).first()
            if not stock:
                # 如果股票不存在，创建它
                storage = DataStorage(db)
                stock = storage.get_or_create_stock(request.code)

            # 获取最近的信号
            recent_signals = db.query(WyckoffSignal).filter(
                WyckoffSignal.stock_id == stock.id,
                WyckoffSignal.timeframe == request.timeframe
            ).order_by(WyckoffSignal.date.desc()).limit(5).all()

            # 将缓存的current_quote字典转换为StockQuote对象
            current_quote_dict = cached_analysis.get("current_quote")
            current_quote = None
            if current_quote_dict:
                current_quote = StockQuote(
                    stock_id=stock.id,
                    timeframe=current_quote_dict.get("timeframe"),
                    date=datetime.strptime(current_quote_dict["date"], "%Y-%m-%d %H:%M:%S"),
                    open=current_quote_dict.get("open"),
                    high=current_quote_dict.get("high"),
                    low=current_quote_dict.get("low"),
                    close=current_quote_dict.get("close"),
                    volume=current_quote_dict.get("volume"),
                    amount=current_quote_dict.get("amount"),
                    ma5=current_quote_dict.get("ma5"),
                    ma10=current_quote_dict.get("ma10"),
                    ma15=current_quote_dict.get("ma15"),
                    ma20=current_quote_dict.get("ma20"),
                    ma30=current_quote_dict.get("ma30"),
                    ma60=current_quote_dict.get("ma60"),
                    ma90=current_quote_dict.get("ma90"),
                    ma120=current_quote_dict.get("ma120"),
                    ma250=current_quote_dict.get("ma250"),
                    volume_ma5=current_quote_dict.get("volume_ma5"),
                    obv=current_quote_dict.get("obv")
                )

            return StockAnalysisResponse(
                stock=stock,
                current_quote=current_quote,
                signals=[
                    WyckoffSignalResponse.model_validate(signal)
                    for signal in recent_signals
                ],
                analysis_summary=cached_analysis.get("analysis_summary"),
                from_cache=True
            )

        # ========== 缓存未命中，执行完整分析流程 ==========
        logger.info(f"缓存未命中，执行完整分析: {request.code} {request.timeframe}")

        # 获取或创建股票（修复：如果不存在则自动创建）
        storage = DataStorage(db)
        stock = storage.get_or_create_stock(request.code)

        # 分钟线数据：每次都强制更新，确保实时性
        # 日线/周线/月线：使用缓存，提高性能
        quotes = None
        if request.timeframe in ['1', '5', '15', '30', '60']:
            # 分钟线：强制更新，不使用缓存
            logger.info(f"⚡ 分钟线数据强制更新: {request.code} {request.timeframe}")
            update_success = storage.update_stock_quotes(request.code, request.timeframe)
            quotes = storage.get_quotes(request.code, request.timeframe, limit=500)
        elif not request.end_date:
            # 日线/周线/月线：检查缓存
            quotes = get_cached_stock_data(request.code, request.timeframe)
            if quotes:
                logger.info(f"✅ 从缓存获取K线数据: {request.code} {request.timeframe} ({len(quotes)}条)")
                # 如果是字典列表，转换为StockQuote对象
                if quotes and isinstance(quotes[0], dict):
                    quotes = dict_to_stock_quotes(quotes, stock.id, request.timeframe)

        if not quotes:
            # 缓存未命中或指定了end_date，更新数据
            if request.end_date:
                logger.info(f"指定日期分析，获取数据: {request.code} {request.timeframe} 截止日期 {request.end_date}")
            else:
                logger.info(f"缓存未命中，更新数据: {request.code} {request.timeframe}")

            update_success = storage.update_stock_quotes(request.code, request.timeframe)

            # 获取K线数据（更新后获取）
            quotes = storage.get_quotes(request.code, request.timeframe, limit=500)

            # 如果指定了end_date，过滤到该日期
            if request.end_date and quotes:
                try:
                    # 统一解析日期格式：支持 YYYY-MM-DD (ISO 8601) 或 YYYYMMDD
                    date_str = request.end_date.replace('-', '')
                    target_date = datetime.strptime(date_str, "%Y%m%d")

                    # 过滤出<=目标日期的数据
                    quotes = [q for q in quotes if q.date.date() <= target_date.date()]

                    logger.info(f"过滤到 {target_date.date()}，剩余 {len(quotes)} 条数据")
                except Exception as e:
                    logger.warning(f"日期解析失败: {request.end_date}, 错误: {e}，使用所有数据")

            # 缓存K线数据（转换为字典格式）- 仅在未指定end_date时缓存
            if quotes and not request.end_date:
                quotes_dict = [
                    {
                        "date": q.date.strftime("%Y-%m-%d %H:%M:%S"),
                        "open": q.open,
                        "high": q.high,
                        "low": q.low,
                        "close": q.close,
                        "volume": q.volume,
                        "ma5": q.ma5,
                        "ma10": q.ma10,
                        "ma15": q.ma15,
                        "ma20": q.ma20,
                        "ma30": q.ma30,
                        "ma60": q.ma60,
                        "ma90": q.ma90,
                        "ma120": q.ma120,
                        "ma250": q.ma250,
                        "volume_ma5": q.volume_ma5,
                        "obv": q.obv
                    }
                    for q in quotes
                ]
                cache_stock_data(request.code, request.timeframe, quotes_dict)
                logger.info(f"💾 已缓存K线数据: {request.code} {request.timeframe}")

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
            # 使用K线数据的实际日期，而不是当前时间
            quote_date = quotes[-1].date

            # 验证是否为交易日（周一到周五）
            if quote_date.weekday() >= 5:  # 5=周六, 6=周日
                logger.info(f"跳过非交易日信号: {request.code} {request.timeframe} {quote_date.date()} ({quote_date.strftime('%A')})")
            else:
                # 对于分钟线，验证是否在交易时段内
                is_trading_time = True
                if request.timeframe in ['30', '60']:
                    signal_time = quote_date.time()
                    # A股交易时间：9:30-11:30, 13:00-15:00
                    morning_start = time(9, 30)
                    morning_end = time(11, 30)
                    afternoon_start = time(13, 0)
                    afternoon_end = time(15, 0)

                    is_trading_time = (morning_start <= signal_time <= morning_end) or \
                                     (afternoon_start <= signal_time <= afternoon_end)

                    if not is_trading_time:
                        logger.info(f"跳过非交易时段信号: {request.code} {request.timeframe} {quote_date}")

                if is_trading_time:
                    # 检查是否已有该周期的当日信号
                    start_of_day = datetime.combine(quote_date.date(), time(0, 0, 0))
                    end_of_day = datetime.combine(quote_date.date(), time(23, 59, 59))

                    existing_signal = db.query(WyckoffSignal).filter(
                        WyckoffSignal.stock_id == stock.id,
                        WyckoffSignal.timeframe == request.timeframe,
                        WyckoffSignal.date >= start_of_day,
                        WyckoffSignal.date < end_of_day
                    ).first()

                    if not existing_signal:
                        # 创建新信号（使用K线日期作为信号日期）
                        signal = WyckoffSignal(
                            stock_id=stock.id,
                            date=quote_date,
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
                        logger.info(f"创建威科夫信号: {request.code} {request.timeframe} {quote_date.date()} {analysis_result['direction']} 分数{analysis_result['score']}")

        # 获取最近的信号
        recent_signals = db.query(WyckoffSignal).filter(
            WyckoffSignal.stock_id == stock.id,
            WyckoffSignal.timeframe == request.timeframe
        ).order_by(WyckoffSignal.date.desc()).limit(5).all()

        # ========== Redis缓存：缓存分析结果 ==========
        cache_data = {
            "current_quote": {
                "date": quotes[-1].date.strftime("%Y-%m-%d %H:%M:%S"),
                "timeframe": request.timeframe,
                "open": quotes[-1].open,
                "high": quotes[-1].high,
                "low": quotes[-1].low,
                "close": quotes[-1].close,
                "volume": quotes[-1].volume,
                "amount": quotes[-1].amount,
                "ma5": quotes[-1].ma5,
                "ma10": quotes[-1].ma10,
                "ma15": quotes[-1].ma15,
                "ma20": quotes[-1].ma20,
                "ma30": quotes[-1].ma30,
                "ma60": quotes[-1].ma60,
                "ma90": quotes[-1].ma90,
                "ma120": quotes[-1].ma120,
                "ma250": quotes[-1].ma250,
                "volume_ma5": quotes[-1].volume_ma5,
                "obv": quotes[-1].obv
            },
            "analysis_summary": analysis_result
        }
        cache_analysis(request.code, request.timeframe, cache_data)
        logger.info(f"💾 已缓存分析结果: {request.code} {request.timeframe}")

        # 构建响应
        return StockAnalysisResponse(
            stock=stock,
            current_quote=quotes[-1] if quotes else None,
            signals=[
                WyckoffSignalResponse.model_validate(signal)
                for signal in recent_signals
            ],
            analysis_summary=analysis_result,
            from_cache=False
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
async def update_stock_data(
    code: str,
    timeframe: str = "daily",
    db: Session = Depends(get_db)
):
    """
    手动更新股票数据

    Args:
        code: 股票代码
        timeframe: 时间周期 (daily/weekly/monthly/30/60)
        db: 数据库会话

    Returns:
        更新结果
    """
    try:
        storage = DataStorage(db)
        # 先创建股票（如果不存在）
        storage.get_or_create_stock(code)

        success = storage.update_stock_quotes(code, timeframe=timeframe)

        if success:
            # ========== Redis缓存：清除相关缓存 ==========
            logger.info(f"🧹 清除股票{code}的缓存...")
            RedisService.clear_stock_cache(code)

            return MessageResponse(
                message=f"股票{code}数据更新成功，缓存已清除"
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
    limit: int = 500,
    db: Session = Depends(get_db)
):
    """
    获取股票K线数据（用于图表展示）
    只查询数据，不更新数据（由analyze接口负责更新）

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

        # ========== Redis缓存：先检查缓存 ==========
        cached_quotes = get_cached_stock_data(code, timeframe)
        if cached_quotes:
            logger.info(f"✅ 从缓存返回K线数据: {code} {timeframe} ({len(cached_quotes)}条)")
            return {
                "code": code,
                "timeframe": timeframe,
                "total": len(cached_quotes),
                "from_cache": True,
                "quotes": [
                    {
                        "date": q["date"],
                        "open": q["open"],
                        "high": q["high"],
                        "low": q["low"],
                        "close": q["close"],
                        "volume": q["volume"],
                        "ma5": q.get("ma5"),
                        "ma10": q.get("ma10"),
                        "ma15": q.get("ma15"),
                        "ma20": q.get("ma20"),
                        "ma30": q.get("ma30"),
                        "ma60": q.get("ma60"),
                        "ma90": q.get("ma90"),
                        "ma120": q.get("ma120"),
                        "ma250": q.get("ma250"),
                        "volume_ma5": q.get("volume_ma5"),
                        "obv": q.get("obv")
                    }
                    for q in cached_quotes[:limit]
                ]
            }

        # ========== 缓存未命中，查询数据库 ==========
        logger.info(f"缓存未命中，查询数据库: {code} {timeframe}")
        quotes = storage.get_quotes(code, timeframe, limit)

        if not quotes:
            # 尝试获取数据，看看是否能成功
            update_success = storage.update_stock_quotes(code, timeframe)
            quotes = storage.get_quotes(code, timeframe, limit)

            if not quotes:
                # 如果还是没有数据，可能是股票代码不存在
                raise HTTPException(
                    status_code=404,
                    detail=f"股票{code}暂无{timeframe}数据。可能原因：1) 股票代码不存在或已退市 2) 数据源暂无该股票数据 3) 请检查股票代码是否正确"
                )

        # 转换为字典格式（便于缓存）
        quotes_dict = [
            {
                "date": q.date.strftime("%Y-%m-%d %H:%M:%S"),
                "open": q.open,
                "high": q.high,
                "low": q.low,
                "close": q.close,
                "volume": q.volume,
                "ma5": q.ma5,
                "ma10": q.ma10,
                "ma15": q.ma15,
                "ma20": q.ma20,
                "ma30": q.ma30,
                "ma60": q.ma60,
                "ma90": q.ma90,
                "ma120": q.ma120,
                "ma250": q.ma250,
                "volume_ma5": q.volume_ma5,
                "obv": q.obv
            }
            for q in quotes
        ]

        # 缓存查询结果
        cache_stock_data(code, timeframe, quotes_dict)
        logger.info(f"💾 已缓存K线数据: {code} {timeframe} ({len(quotes)}条)")

        logger.info(f"返回股票{code} {timeframe}数据，共{len(quotes)}条")

        return {
            "code": code,
            "timeframe": timeframe,
            "total": len(quotes),
            "from_cache": False,
            "quotes": quotes_dict[:limit]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取K线数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")
