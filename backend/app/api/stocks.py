"""
股票分析API（修复版）
"""
from datetime import datetime, time, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from loguru import logger
from slowapi import Limiter

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
    RedisService,
    get_stock_data_with_fallback,
    get_analysis_with_fallback
)
from app.services.data.source_scheduler import get_scheduler
from app.utils.converters import dict_to_stock_quotes
from app.repositories.stock_repository import StockRepository

router = APIRouter()
limiter = Limiter(key_func=lambda r: r.client.host if r else "127.0.0.1")


@router.post(
    "/stocks/analyze",
    response_model=StockAnalysisResponse,
    summary="威科夫股票分析",
    description="""
    执行威科夫方法分析，识别市场阶段和交易信号。

    ## 分析内容

    1. **市场阶段识别**: 吸筹(A)、上涨(B)、派发(C)、下跌(D)
    2. **信号方向**: LONG(做多)/SHORT(做空)/NEUTRAL(中性)
    3. **置信度评分**: 0-100分，分数越高信号越强
    4. **建议操作**: BUY/SELL/HOLD

    ## 时间周期支持

    - **日线**: daily - 推荐用于中长期分析
    - **周线**: weekly - 趋势判断
    - **月线**: monthly - 长期趋势
    - **分钟线**: 30/60 - 短线交易

    ## 信号保存规则

    - 仅保存score >= 3的信号
    - 仅在交易日保存
    - 分钟线仅在交易时段保存

    ## 示例

    ```json
    {
      "code": "688234",
      "timeframe": "daily"
    }
    ```

    ## 速率限制

    - 每分钟最多10次请求
    ```
    """
)
# @limiter.limit("10/minute")  # 暂时禁用速率限制
async def analyze_stock(request: Request, body: StockAnalysisRequest, db: Session = Depends(get_db)):
    try:
        # ========== Redis缓存：先检查缓存 ==========
        cached_analysis = get_cached_analysis(body.code, body.timeframe)
        if cached_analysis:
            logger.info(f"✅ 从缓存获取分析结果: {body.code} {body.timeframe}")

            # 从缓存返回时，仍然需要查询最近的信号
            repo = StockRepository(db)
            stock = repo.find_by_code(body.code)
            if not stock:
                # 如果股票不存在，创建它
                storage = DataStorage(db)
                stock = storage.get_or_create_stock(body.code)

            # 获取最近的信号
            recent_signals = db.query(WyckoffSignal).filter(
                WyckoffSignal.stock_id == stock.id,
                WyckoffSignal.timeframe == body.timeframe
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
        logger.info(f"缓存未命中，执行完整分析: {body.code} {body.timeframe}")

        # 获取或创建股票（修复：如果不存在则自动创建）
        storage = DataStorage(db)
        stock = storage.get_or_create_stock(body.code)

        # 分钟线数据：每次都强制更新，确保实时性
        # 日线/周线/月线：使用缓存，提高性能
        quotes = None
        if body.timeframe in ['1', '5', '15', '30', '60']:
            # 分钟线：强制更新，不使用缓存
            logger.info(f"⚡ 分钟线数据强制更新: {body.code} {body.timeframe}")
            update_success = storage.update_stock_quotes(body.code, body.timeframe)
            quotes = storage.get_quotes(body.code, body.timeframe, limit=500)
        elif not body.end_date:
            # 日线/周线/月线：检查缓存，支持降级
            try:
                quotes = get_cached_stock_data(body.code, body.timeframe)
                if quotes:
                    logger.info(f"✅ 从缓存获取K线数据: {body.code} {body.timeframe} ({len(quotes)}条)")
                    # 如果是字典列表，转换为StockQuote对象
                    if quotes and isinstance(quotes[0], dict):
                        quotes = dict_to_stock_quotes(quotes, stock.id, body.timeframe)
            except Exception as e:
                # Redis失败时降级到数据库
                logger.warning(f"⚠️ Redis读取失败，降级到数据库: {e}")
                quotes = None

        if not quotes:
            # 缓存未命中或指定了end_date，使用多数据源调度器获取数据
            if body.end_date:
                logger.info(f"指定日期分析，使用调度器获取数据: {body.code} {body.timeframe} 截止日期 {body.end_date}")
            else:
                logger.info(f"缓存未命中，使用调度器获取数据: {body.code} {body.timeframe}")

            # 使用调度器获取数据（自动选择最优数据源，支持降级）
            try:
                scheduler = get_scheduler()
                start_date = (datetime.now() - timedelta(days=365*3)).strftime("%Y-%m-%d")  # 默认获取3年数据
                end_date_str = body.end_date if body.end_date else datetime.now().strftime("%Y-%m-%d")

                # 调用调度器获取数据
                quotes_dict = scheduler.fetch_with_fallback(
                    code=body.code,
                    timeframe=body.timeframe,
                    start_date=start_date,
                    end_date=end_date_str
                )

                # 转换为DataFrame并保存到数据库
                import pandas as pd
                quotes_df = pd.DataFrame(quotes_dict)

                # 确保日期是datetime类型
                if 'date' in quotes_df.columns and not pd.api.types.is_datetime64_any_dtype(quotes_df['date']):
                    quotes_df['date'] = pd.to_datetime(quotes_df['date'])

                # 保存到数据库（会自动计算MA指标）
                if not quotes_df.empty:
                    saved_count = storage.save_quotes(body.code, quotes_df, body.timeframe)
                    logger.info(f"✅ 调度器成功获取 {len(quotes_dict)} 条数据，保存到数据库 {saved_count} 条")

                # 从数据库获取带MA值的K线数据（而不是从原始字典创建）
                quotes = storage.get_quotes(body.code, body.timeframe, limit=500)

            except Exception as e:
                logger.warning(f"⚠️ 调度器获取失败，降级到传统方式: {e}")

                # 降级到原有的 storage.update_stock_quotes 方式
                if body.end_date:
                    logger.info(f"指定日期分析，获取数据: {body.code} {body.timeframe} 截止日期 {body.end_date}")
                else:
                    logger.info(f"缓存未命中，更新数据: {body.code} {body.timeframe}")

                update_success = storage.update_stock_quotes(body.code, body.timeframe)

                # 获取K线数据（更新后获取）
                quotes = storage.get_quotes(body.code, body.timeframe, limit=500)

            # 如果指定了end_date，过滤到该日期
            if body.end_date and quotes:
                try:
                    # 统一解析日期格式：支持 YYYY-MM-DD (ISO 8601) 或 YYYYMMDD
                    date_str = body.end_date.replace('-', '')
                    target_date = datetime.strptime(date_str, "%Y%m%d")

                    # 过滤出<=目标日期的数据
                    quotes = [q for q in quotes if q.date.date() <= target_date.date()]

                    logger.info(f"过滤到 {target_date.date()}，剩余 {len(quotes)} 条数据")
                except Exception as e:
                    logger.warning(f"日期解析失败: {body.end_date}, 错误: {e}，使用所有数据")

            # 缓存K线数据（转换为字典格式）- 仅在未指定end_date时缓存
            # 重要：只缓存有均线数据的完整K线，避免缓存无均线的原始数据
            if quotes and not body.end_date:
                # 检查是否有均线数据
                has_ma = quotes[0].ma5 is not None if quotes else False

                if has_ma:
                    # 有均线数据，可以缓存
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
                    cache_stock_data(body.code, body.timeframe, quotes_dict)
                    logger.info(f"💾 已缓存K线数据: {body.code} {body.timeframe}")
                else:
                    # 没有均线数据，从数据库重新获取完整数据并缓存
                    logger.info(f"⚠️ 当前数据无均线，从数据库重新获取完整数据: {body.code} {body.timeframe}")
                    full_quotes = storage.get_quotes(body.code, body.timeframe, limit=500)
                    if full_quotes and full_quotes[0].ma5 is not None:
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
                            for q in full_quotes
                        ]
                        cache_stock_data(body.code, body.timeframe, quotes_dict)
                        logger.info(f"💾 已缓存完整K线数据（含均线）: {body.code} {body.timeframe}")
                    else:
                        logger.warning(f"⚠️ 数据库中也无均线数据，跳过缓存: {body.code} {body.timeframe}")

        if not quotes:
            raise HTTPException(
                status_code=400,
                detail=f"股票{body.code}暂无数据，请稍后再试"
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
                logger.info(f"跳过非交易日信号: {body.code} {body.timeframe} {quote_date.date()} ({quote_date.strftime('%A')})")
            else:
                # 对于分钟线，验证是否在交易时段内
                is_trading_time = True
                if body.timeframe in ['30', '60']:
                    signal_time = quote_date.time()
                    # A股交易时间：9:30-11:30, 13:00-15:00
                    morning_start = time(9, 30)
                    morning_end = time(11, 30)
                    afternoon_start = time(13, 0)
                    afternoon_end = time(15, 0)

                    is_trading_time = (morning_start <= signal_time <= morning_end) or \
                                     (afternoon_start <= signal_time <= afternoon_end)

                    if not is_trading_time:
                        logger.info(f"跳过非交易时段信号: {body.code} {body.timeframe} {quote_date}")

                if is_trading_time:
                    # 检查是否已有该周期的当日信号
                    start_of_day = datetime.combine(quote_date.date(), time(0, 0, 0))
                    end_of_day = datetime.combine(quote_date.date(), time(23, 59, 59))

                    existing_signal = db.query(WyckoffSignal).filter(
                        WyckoffSignal.stock_id == stock.id,
                        WyckoffSignal.timeframe == body.timeframe,
                        WyckoffSignal.date >= start_of_day,
                        WyckoffSignal.date < end_of_day
                    ).first()

                    if not existing_signal:
                        # 创建新信号（使用K线日期作为信号日期）
                        signal = WyckoffSignal(
                            stock_id=stock.id,
                            date=quote_date,
                            timeframe=body.timeframe,
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
                        logger.info(f"创建威科夫信号: {body.code} {body.timeframe} {quote_date.date()} {analysis_result['direction']} 分数{analysis_result['score']}")

        # 获取最近的信号
        recent_signals = db.query(WyckoffSignal).filter(
            WyckoffSignal.stock_id == stock.id,
            WyckoffSignal.timeframe == body.timeframe
        ).order_by(WyckoffSignal.date.desc()).limit(5).all()

        # ========== Redis缓存：缓存分析结果 ==========
        cache_data = {
            "current_quote": {
                "date": quotes[-1].date.strftime("%Y-%m-%d %H:%M:%S"),
                "timeframe": body.timeframe,
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
        cache_analysis(body.code, body.timeframe, cache_data)
        logger.info(f"💾 已缓存分析结果: {body.code} {body.timeframe}")

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


@router.get(
    "/stocks/{code}/signals",
    response_model=list[WyckoffSignalResponse],
    summary="获取威科夫信号历史",
    description="""
    获取股票的历史威科夫信号记录。

    ## 信号类型

    - **SPRING**: 弹簧形态（吸筹阶段）
    - **BREAKOUT**: 突破形态
    - **TEST**: 测试形态
    - **LPS**: 最后支撑点

    ## 信号字段

    - **direction**: LONG/SHORT/NEUTRAL
    - **score**: 信号强度(1-5)
    - **confidence**: 置信度(0-100)
    - **suggestion**: BUY/SELL/HOLD
    - **verified**: 信号验证状态

    ## 返回数量

    - 最多返回20条最新信号
    - 按日期降序排列

    ## 示例请求

    ```
    GET /api/v1/stocks/688234/signals
    ```
    """
)
async def get_stock_signals(code: str, db: Session = Depends(get_db)):
    repo = StockRepository(db)
    stock = repo.find_by_code(code)
    if not stock:
        raise HTTPException(status_code=404, detail=f"股票代码{code}不存在")

    signals = db.query(WyckoffSignal).filter(
        WyckoffSignal.stock_id == stock.id
    ).order_by(WyckoffSignal.date.desc()).limit(20).all()

    return [
        WyckoffSignalResponse.model_validate(signal)
        for signal in signals
    ]


@router.post(
    "/stocks/{code}/update",
    summary="更新股票数据",
    description="""
    手动触发股票数据更新，从数据源获取最新K线数据。

    ## 使用场景

    - 数据过期需要刷新
    - 首次添加股票
    - 补充历史数据

    ## 更新逻辑

    - **分钟线**: 每次强制更新，确保实时性
    - **日线/周线/月线**: 增量更新，只获取新数据
    - 更新完成后自动清除Redis缓存

    ## 示例请求

    ```
    POST /api/v1/stocks/688234/update?timeframe=daily
    ```

    ## 注意事项

    - 更新操作可能需要几秒钟
    - 频繁更新可能被数据源限流
    - 建议使用缓存接口提高性能
    """
)
async def update_stock_data(
    code: str,
    timeframe: str = "daily",
    db: Session = Depends(get_db)
):
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


@router.get(
    "/stocks/{code}/quotes",
    summary="获取股票K线数据",
    description="""
    获取股票K线数据，包含价格、成交量、技术指标等。

    ## 支持的时间周期

    - **daily**: 日线数据
    - **weekly**: 周线数据
    - **monthly**: 月线数据
    - **30/60**: 分钟线数据

    ## 返回字段

    - **OHLCV**: 开高低收量
    - **均线**: MA5/MA10/MA15/MA20/MA30/MA60/MA90/MA120/MA250
    - **成交量指标**: volume_ma5, obv

    ## 缓存机制

    - 日线/周线/月线使用Redis缓存
    - 数据未缓存时自动更新

    ## 示例请求

    ```
    GET /api/v1/stocks/688234/quotes?timeframe=daily&limit=100
    ```

    ## 示例响应

    ```json
    {
      "code": "688234",
      "timeframe": "daily",
      "total": 500,
      "from_cache": true,
      "quotes": [...]
    }
    ```
    """
)
async def get_stock_quotes(
    code: str,
    timeframe: str = "daily",
    limit: int = 500,
    db: Session = Depends(get_db)
):
    try:
        storage = DataStorage(db)

        # 先创建股票（如果不存在）
        stock = storage.get_or_create_stock(code)

        # ========== Redis缓存：先检查缓存 ==========
        cached_quotes = get_cached_stock_data(code, timeframe)
        if cached_quotes:
            # 缓存中的数据是升序（旧→新），需要取最后limit条（最新的数据）
            return_quotes = cached_quotes[-limit:] if len(cached_quotes) > limit else cached_quotes
            logger.info(f"✅ 从缓存返回K线数据: {code} {timeframe} ({len(return_quotes)}条，缓存共{len(cached_quotes)}条)")
            return {
                "code": code,
                "timeframe": timeframe,
                "total": len(return_quotes),
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
                    for q in return_quotes
                ]
            }

        # ========== 缓存未命中，检查数据库 ==========
        logger.info(f"缓存未命中，检查数据库: {code} {timeframe}")

        # 先检查数据库是否有数据
        quotes = storage.get_quotes(code, timeframe, limit=limit)

        if quotes and len(quotes) > 0:
            logger.info(f"✅ 从数据库读取K线数据: {code} {timeframe} ({len(quotes)}条)")

            # 转换为字典格式（用于返回）
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

            # 缓存时，使用完整的数据库数据（不受请求limit影响）
            # 防止小limit请求导致缓存不完整
            try:
                full_quotes = storage.get_quotes(code, timeframe, limit=500)
                if full_quotes and len(full_quotes) > len(quotes):
                    logger.info(f"📦 缓存完整数据: {code} {timeframe} ({len(full_quotes)}条，而非请求的{len(quotes)}条)")
                    full_quotes_dict = [
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
                        for q in full_quotes
                    ]
                    cache_stock_data(code, timeframe, full_quotes_dict)
                    logger.info(f"💾 已缓存完整K线数据: {code} {timeframe} ({len(full_quotes_dict)}条)")
                else:
                    # 数据库没有更多数据，缓存当前数据
                    cache_stock_data(code, timeframe, quotes_dict)
                    logger.info(f"💾 已缓存K线数据: {code} {timeframe} ({len(quotes_dict)}条)")
            except Exception as e:
                logger.warning(f"⚠️ 缓存完整数据失败，使用当前数据: {e}")
                cache_stock_data(code, timeframe, quotes_dict)
                logger.info(f"💾 已缓存K线数据: {code} {timeframe} ({len(quotes_dict)}条)")

            return {
                "code": code,
                "timeframe": timeframe,
                "total": len(quotes_dict),
                "from_cache": False,
                "from_scheduler": False,
                "quotes": quotes_dict
            }

        # ========== 数据库没有数据，使用调度器获取 ==========
        logger.info(f"数据库无数据，使用调度器获取: {code} {timeframe}")

        try:
            # 使用多数据源调度器获取数据
            scheduler = get_scheduler()
            start_date = (datetime.now() - timedelta(days=365*3)).strftime("%Y-%m-%d")
            end_date_str = datetime.now().strftime("%Y-%m-%d")

            # 调用调度器
            quotes_dict = scheduler.fetch_with_fallback(
                code=code,
                timeframe=timeframe,
                start_date=start_date,
                end_date=end_date_str
            )

            if not quotes_dict or len(quotes_dict) == 0:
                raise HTTPException(
                    status_code=404,
                    detail=f"股票{code}暂无{timeframe}数据"
                )

            # 应用limit限制
            quotes_dict = quotes_dict[:limit] if len(quotes_dict) > limit else quotes_dict

            # 保存到数据库并计算MA
            from app.utils.converters import dict_to_stock_quotes
            import pandas as pd
            stock_obj = storage.get_or_create_stock(code)
            quotes_obj = dict_to_stock_quotes(quotes_dict, stock_obj.id, timeframe)

            # 计算MA并保存
            df = pd.DataFrame(quotes_dict)
            df = storage._calculate_indicators(df)

            for i, q in enumerate(quotes_obj):
                q.ma5 = df.iloc[i]["ma5"]
                q.ma10 = df.iloc[i]["ma10"]
                q.ma15 = df.iloc[i]["ma15"]
                q.ma20 = df.iloc[i]["ma20"]
                q.ma30 = df.iloc[i]["ma30"]
                q.ma60 = df.iloc[i]["ma60"]
                q.ma90 = df.iloc[i]["ma90"]
                q.ma120 = df.iloc[i]["ma120"]
                q.ma250 = df.iloc[i]["ma250"]
                q.volume_ma5 = df.iloc[i]["volume_ma5"]
                q.obv = df.iloc[i]["obv"]
                storage.db.add(q)
            storage.db.commit()

            # 重新从数据库读取（包含MA）
            quotes = storage.get_quotes(code, timeframe, limit)
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
                for q in quotes[:limit]
            ]

            # 缓存完整数据（不受请求limit影响）
            try:
                if len(quotes) > limit:
                    full_quotes_dict = [
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
                    cache_stock_data(code, timeframe, full_quotes_dict)
                    logger.info(f"💾 已缓存完整K线数据: {code} {timeframe} ({len(full_quotes_dict)}条)")
                else:
                    cache_stock_data(code, timeframe, quotes_dict)
                    logger.info(f"💾 已缓存K线数据: {code} {timeframe} ({len(quotes_dict)}条)")
            except Exception as e:
                logger.warning(f"⚠️ 缓存数据失败: {e}")

            logger.info(f"返回股票{code} {timeframe}数据，共{len(quotes_dict)}条")

            return {
                "code": code,
                "timeframe": timeframe,
                "total": len(quotes_dict),
                "from_cache": False,
                "from_scheduler": True,
                "quotes": quotes_dict
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"⚠️ 调度器获取失败: {e}，降级到传统方式")

            # 降级：尝试原有方式
            update_success = storage.update_stock_quotes(code, timeframe)

            # 获取完整数据（用于缓存），不受请求limit影响
            full_quotes = storage.get_quotes(code, timeframe, limit=500)

            if not full_quotes:
                raise HTTPException(
                    status_code=404,
                    detail=f"股票{code}暂无{timeframe}数据"
                )

            # 根据请求limit截取数据（用于返回）
            quotes = full_quotes[:limit] if limit < len(full_quotes) else full_quotes

            # 转换为字典格式（便于缓存和返回）
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

            # 缓存完整数据（不是被limit截断的数据）
            full_quotes_dict = [
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
                for q in full_quotes
            ]

            # 缓存完整数据
            cache_stock_data(code, timeframe, full_quotes_dict)
            logger.info(f"💾 已缓存完整K线数据: {code} {timeframe} ({len(full_quotes_dict)}条)")

            logger.info(f"返回股票{code} {timeframe}数据，共{len(quotes)}条")

            return {
                "code": code,
                "timeframe": timeframe,
                "total": len(quotes),
                "from_cache": False,
                "from_scheduler": False,  # 标识来自传统方式
                "quotes": quotes_dict
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取K线数据失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")
