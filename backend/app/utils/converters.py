"""
数据转换工具函数
"""
from typing import List, Optional
from datetime import datetime
import pandas as pd
from app.models.database import StockQuote


def _safe_float(value, default: Optional[float] = None) -> Optional[float]:
    """
    安全地将值转换为float

    Args:
        value: 要转换的值
        default: 默认值（当转换失败时使用）

    Returns:
        float值或None
    """
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return default
    return default


def dataframe_to_dict(df: pd.DataFrame) -> List[dict]:
    """
    将DataFrame转换为字典列表

    Args:
        df: pandas DataFrame

    Returns:
        字典列表
    """
    if df is None or df.empty:
        return []

    # 转换为字典并确保数值类型正确
    records = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            value = row[col]
            # 处理NaN值
            if pd.isna(value):
                record[col] = None
            # 确保数值字段为float类型
            elif col in ['open', 'high', 'low', 'close', 'volume', 'amount',
                        'ma5', 'ma10', 'ma15', 'ma20', 'ma30', 'ma60', 'ma90', 'ma120', 'ma250',
                        'volume_ma5', 'obv']:
                record[col] = float(value) if value is not None else None
            else:
                record[col] = value
        records.append(record)

    return records


def dict_to_stock_quotes(
    quotes_dict: List[dict],
    stock_id: int,
    timeframe: str
) -> List[StockQuote]:
    """
    将字典列表转换为StockQuote对象列表

    Args:
        quotes_dict: K线数据字典列表，每个字典包含date, open, high, low, close, volume等字段
        stock_id: 股票ID
        timeframe: 时间周期 (daily/weekly/monthly/30/60)

    Returns:
        StockQuote对象列表

    Raises:
        ValueError: 如果date字段格式不正确
    """
    quotes = []
    for q_dict in quotes_dict:
        try:
            # 尝试解析日期，支持多种格式
            date_str = q_dict["date"]
            if isinstance(date_str, str):
                # 尝试不同的日期格式
                for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y%m%d"]:
                    try:
                        date = datetime.strptime(date_str, fmt)
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError(f"不支持的日期格式: {date_str}")
            else:
                # 如果已经是datetime对象，直接使用
                date = date_str

            quote = StockQuote(
                stock_id=stock_id,
                timeframe=timeframe,
                date=date,
                open=_safe_float(q_dict.get("open")),
                high=_safe_float(q_dict.get("high")),
                low=_safe_float(q_dict.get("low")),
                close=_safe_float(q_dict.get("close")),
                volume=_safe_float(q_dict.get("volume"), default=0),
                amount=_safe_float(q_dict.get("amount")),
                ma5=_safe_float(q_dict.get("ma5")),
                ma10=_safe_float(q_dict.get("ma10")),
                ma15=_safe_float(q_dict.get("ma15")),
                ma20=_safe_float(q_dict.get("ma20")),
                ma30=_safe_float(q_dict.get("ma30")),
                ma60=_safe_float(q_dict.get("ma60")),
                ma90=_safe_float(q_dict.get("ma90")),
                ma120=_safe_float(q_dict.get("ma120")),
                ma250=_safe_float(q_dict.get("ma250")),
                volume_ma5=_safe_float(q_dict.get("volume_ma5")),
                obv=_safe_float(q_dict.get("obv"))
            )
            quotes.append(quote)
        except Exception as e:
            from loguru import logger
            logger.warning(f"转换K线数据失败: {e}, 数据: {q_dict}")
            continue

    return quotes
