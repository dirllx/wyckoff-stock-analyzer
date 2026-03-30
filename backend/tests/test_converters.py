"""
测试数据转换工具函数
"""
import pytest
from datetime import datetime
from app.utils.converters import dict_to_stock_quotes


@pytest.mark.unit
def test_dict_to_stock_quotes_basic(sample_stock_data):
    """测试基本的K线数据转换"""
    quotes = dict_to_stock_quotes(sample_stock_data, stock_id=1, timeframe="daily")

    assert len(quotes) == 3
    assert quotes[0].stock_id == 1
    assert quotes[0].timeframe == "daily"
    assert quotes[0].open == 100.0
    assert quotes[0].high == 105.0
    assert quotes[0].low == 98.0
    assert quotes[0].close == 103.0
    assert quotes[0].volume == 1000000


@pytest.mark.unit
def test_dict_to_stock_quotes_with_ma(sample_quotes_with_ma):
    """测试包含MA数据的K线转换"""
    quotes = dict_to_stock_quotes(sample_quotes_with_ma, stock_id=1, timeframe="daily")

    assert len(quotes) == 1
    assert quotes[0].ma5 == 101.0
    assert quotes[0].ma10 == 100.5
    assert quotes[0].ma20 == 100.0
    assert quotes[0].ma60 == 99.5
    assert quotes[0].ma120 == 99.0
    assert quotes[0].ma250 == 98.5


@pytest.mark.unit
def test_dict_to_stock_quotes_date_format():
    """测试不同日期格式的解析"""
    # 测试YYYY-MM-DD格式
    data1 = [{"date": "2024-01-01", "open": 100, "high": 105, "low": 98, "close": 103, "volume": 1000000}]
    quotes1 = dict_to_stock_quotes(data1, stock_id=1, timeframe="daily")
    assert quotes1[0].date == datetime(2024, 1, 1)

    # 测试YYYYMMDD格式
    data2 = [{"date": "20240101", "open": 100, "high": 105, "low": 98, "close": 103, "volume": 1000000}]
    quotes2 = dict_to_stock_quotes(data2, stock_id=1, timeframe="daily")
    assert quotes2[0].date == datetime(2024, 1, 1)

    # 测试YYYY-MM-DD HH:MM:SS格式
    data3 = [{"date": "2024-01-01 10:30:00", "open": 100, "high": 105, "low": 98, "close": 103, "volume": 1000000}]
    quotes3 = dict_to_stock_quotes(data3, stock_id=1, timeframe="30")
    assert quotes3[0].date == datetime(2024, 1, 1, 10, 30, 0)


@pytest.mark.unit
def test_dict_to_stock_quotes_missing_optional_fields():
    """测试缺失可选字段的情况"""
    data = [{"date": "2024-01-01", "open": 100, "high": 105, "low": 98, "close": 103, "volume": 1000000}]
    quotes = dict_to_stock_quotes(data, stock_id=1, timeframe="daily")

    # 可选字段应该为None
    assert quotes[0].ma5 is None
    assert quotes[0].ma10 is None
    assert quotes[0].volume_ma5 is None
    assert quotes[0].obv is None


@pytest.mark.unit
def test_dict_to_stock_quotes_invalid_date():
    """测试无效日期格式的处理"""
    data = [{"date": "invalid-date", "open": 100, "high": 105, "low": 98, "close": 103, "volume": 1000000}]
    quotes = dict_to_stock_quotes(data, stock_id=1, timeframe="daily")

    # 无效数据应该被跳过
    assert len(quotes) == 0


@pytest.mark.unit
def test_dict_to_stock_quotes_empty_list():
    """测试空列表的处理"""
    quotes = dict_to_stock_quotes([], stock_id=1, timeframe="daily")
    assert len(quotes) == 0
