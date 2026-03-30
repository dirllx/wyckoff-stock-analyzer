"""
多周期分析服务
"""
from typing import Dict, List
from sqlalchemy.orm import Session
import pandas as pd
from loguru import logger
from datetime import datetime

from app.services.config_service import ConfigService
from app.services.data.data_storage import DataStorage
from app.services.analysis.wyckoff_analyzer import WyckoffAnalyzer
from app.models.database import Stock, StockQuote
from app.services.redis_service import (
    get_cached_stock_data,
    cache_stock_data
)
from app.utils.converters import dict_to_stock_quotes


class MultiTimeframeService:
    """多周期分析服务"""

    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)
        self.storage = DataStorage(db)
        self.wyckoff_analyzer = WyckoffAnalyzer()

    def analyze_all_timeframes(self, code: str) -> Dict:
        """
        分析所有启用的时间周期

        Args:
            code: 股票代码

        Returns:
            多周期分析结果
        """
        # 获取股票
        stock = self.db.query(Stock).filter(Stock.code == code).first()
        if not stock:
            raise ValueError(f"股票 {code} 不存在")

        # 获取启用的周期
        enabled_timeframes = self.config_service.get_enabled_timeframes()

        # 分析每个周期
        results = {}
        long_signals = 0
        short_signals = 0
        total_confidence = 0
        cache_hit_count = 0  # 缓存命中计数

        for timeframe in enabled_timeframes:
            # ========== Redis缓存：先检查该周期的K线数据 ==========
            quotes = get_cached_stock_data(code, timeframe)

            if quotes:
                # 缓存命中
                logger.info(f"✅ 从缓存获取K线数据: {code} {timeframe}")
                cache_hit_count += 1

                # 如果是字典列表，转换为StockQuote对象
                if quotes and isinstance(quotes[0], dict):
                    quotes = dict_to_stock_quotes(quotes, stock.id, timeframe)
            else:
                # 缓存未命中，从数据库获取
                logger.info(f"缓存未命中，从数据库获取: {code} {timeframe}")
                quotes = self.storage.get_quotes_by_timeframe(
                    stock_id=stock.id,
                    timeframe=timeframe,
                    limit=100
                )

                # 转换为字典格式（与Redis存储格式一致）
                if quotes:
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

                    # 缓存K线数据
                    cache_stock_data(code, timeframe, quotes_dict)
                    # 保持quotes为StockQuote对象列表，不需要转换

            if not quotes or len(quotes) < 20:
                # 数据不足，跳过
                results[timeframe] = {
                    "status": "insufficient_data",
                    "message": "数据不足，需要至少20条K线"
                }
                continue

            # 执行威科夫分析（直接传入quotes列表，不是DataFrame）
            analysis_result = self.wyckoff_analyzer.analyze(stock, quotes)
            analysis_result["timeframe"] = timeframe
            results[timeframe] = analysis_result

            # 统计信号方向
            if analysis_result["direction"] == "LONG":
                long_signals += 1
                total_confidence += analysis_result["confidence"]
            elif analysis_result["direction"] == "SHORT":
                short_signals += 1
                total_confidence += analysis_result["confidence"]

        # 记录缓存统计
        logger.info(f"多周期分析完成: {code}, 缓存命中 {cache_hit_count}/{len(enabled_timeframes)} 个周期")

        # 计算综合信号
        summary = self._calculate_summary(
            long_signals,
            short_signals,
            len(enabled_timeframes),
            total_confidence
        )

        return {
            "stock_code": code,
            "timeframes": results,
            "summary": summary,
            "cache_stats": {
                "cache_hit_count": cache_hit_count,
                "total_timeframes": len(enabled_timeframes),
                "cache_hit_rate": round(cache_hit_count / len(enabled_timeframes) * 100, 1) if enabled_timeframes else 0
            }
        }

    def _calculate_summary(
        self,
        long_signals: int,
        short_signals: int,
        total_timeframes: int,
        total_confidence: float
    ) -> Dict:
        """
        计算多周期综合信号

        Args:
            long_signals: 做多信号数
            short_signals: 做空信号数
            total_timeframes: 总周期数
            total_confidence: 总置信度

        Returns:
            综合分析摘要
        """
        # 确定方向
        if long_signals > short_signals:
            direction = "LONG"
            suggestion = "BUY"
        elif short_signals > long_signals:
            direction = "SHORT"
            suggestion = "SELL"
        else:
            direction = "NEUTRAL"
            suggestion = "HOLD"

        # 计算平均置信度
        avg_confidence = total_confidence / total_timeframes if total_timeframes > 0 else 0

        # 计算一致性（所有周期是否方向一致）
        if long_signals == total_timeframes or short_signals == total_timeframes:
            consistency = "HIGH"
        elif long_signals > 0 and short_signals > 0:
            consistency = "MEDIUM"
        else:
            consistency = "LOW"

        return {
            "direction": direction,
            "suggestion": suggestion,
            "confidence": round(avg_confidence, 2),
            "consistency": consistency,
            "long_signals": long_signals,
            "short_signals": short_signals,
            "analyzed_timeframes": total_timeframes,
            "message": self._get_summary_message(direction, consistency)
        }

    def _get_summary_message(self, direction: str, consistency: str) -> str:
        """生成综合分析消息"""
        messages = {
            "LONG": {
                "HIGH": "多周期一致看多，趋势强烈",
                "MEDIUM": "多数周期看多，但存在分歧",
                "LOW": "信号不明确，建议观望"
            },
            "SHORT": {
                "HIGH": "多周期一致看空，趋势强烈",
                "MEDIUM": "多数周期看空，但存在分歧",
                "LOW": "信号不明确，建议观望"
            },
            "NEUTRAL": {
                "HIGH": "多周期震荡，等待方向明确",
                "MEDIUM": "多周期震荡，等待方向明确",
                "LOW": "信号不明确，建议观望"
            }
        }
        return messages.get(direction, {}).get(consistency, "分析不明确")
