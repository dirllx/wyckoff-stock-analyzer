"""
Pytest配置和共享fixtures
"""
import pytest
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta
from app.models.database import Stock, StockQuote
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 添加项目根目录到Python路径
backend_root = Path(__file__).parent.parent
sys.path.insert(0, str(backend_root))


@pytest.fixture
def sample_stock_data():
    """示例K线数据"""
    return [
        {
            "date": "2024-01-01",
            "open": 100.0,
            "high": 105.0,
            "low": 98.0,
            "close": 103.0,
            "volume": 1000000,
        },
        {
            "date": "2024-01-02",
            "open": 103.0,
            "high": 108.0,
            "low": 102.0,
            "close": 107.0,
            "volume": 1200000,
        },
        {
            "date": "2024-01-03",
            "open": 107.0,
            "high": 110.0,
            "low": 106.0,
            "close": 109.0,
            "volume": 900000,
        }
    ]


@pytest.fixture
def sample_quotes_with_ma():
    """示例包含MA数据的K线"""
    return [
        {
            "date": "2024-01-01",
            "open": 100.0,
            "high": 105.0,
            "low": 98.0,
            "close": 103.0,
            "volume": 1000000,
            "ma5": 101.0,
            "ma10": 100.5,
            "ma20": 100.0,
            "ma60": 99.5,
            "ma120": 99.0,
            "ma250": 98.5
        }
    ]


@pytest.fixture
def sample_stock():
    """示例股票对象"""
    stock = Stock()
    stock.id = 1
    stock.code = "TEST001"
    stock.name = "测试股票"
    stock.market = "A股"
    return stock


@pytest.fixture
def sample_quotes_list():
    """创建示例StockQuote对象列表（100条）"""
    quotes = []
    for i in range(100):
        quote = StockQuote()
        quote.stock_id = 1
        quote.timeframe = "daily"
        quote.date = datetime(2024, 1, 1) + timedelta(days=i)
        quote.open = 100.0 + i * 0.5
        quote.high = 105.0 + i * 0.5
        quote.low = 98.0 + i * 0.5
        quote.close = 103.0 + i * 0.5
        quote.volume = 1000000 + i * 5000
        quote.ma5 = 101.0 + i * 0.5
        quote.ma10 = 100.5 + i * 0.5
        quote.ma20 = 100.0 + i * 0.5
        quote.ma60 = 99.5 + i * 0.5
        quote.ma120 = 99.0 + i * 0.5
        quote.ma250 = 98.5 + i * 0.5
        quote.volume_ma5 = 1100000 + i * 5000
        quote.obv = 1000000 + i * 10000  # 添加OBV值
        quotes.append(quote)
    return quotes
