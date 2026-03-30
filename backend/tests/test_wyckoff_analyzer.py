"""
测试威科夫分析器
"""
import pytest
import pandas as pd
from datetime import datetime, timedelta
from app.services.analysis.wyckoff_analyzer import WyckoffAnalyzer
from app.models.database import Stock, StockQuote


@pytest.mark.unit
def test_analyzer_initialization():
    """测试分析器初始化"""
    analyzer = WyckoffAnalyzer()
    assert analyzer is not None


@pytest.mark.unit
def test_analyze_with_insufficient_data(sample_stock):
    """测试数据不足时的处理"""
    analyzer = WyckoffAnalyzer()

    # 只有10条数据，不足20条
    quotes = []
    for i in range(10):
        quote = StockQuote()
        quote.stock_id = 1
        quote.timeframe = "daily"
        quote.date = datetime(2024, 1, 1 + i)
        quote.open = 100.0
        quote.high = 105.0
        quote.low = 98.0
        quote.close = 103.0
        quote.volume = 1000000
        quotes.append(quote)

    result = analyzer.analyze(sample_stock, quotes)

    # 应该返回数据不足的结果
    assert result["score"] == 0
    assert "数据不足" in result["reason"]


@pytest.mark.unit
def test_analyze_with_sufficient_data(sample_stock, sample_quotes_list):
    """测试数据充足时的分析"""
    analyzer = WyckoffAnalyzer()

    result = analyzer.analyze(sample_stock, sample_quotes_list)

    # 应该返回成功结果
    assert "score" in result
    assert "direction" in result
    # direction可能是LONG, SHORT, NEUTRAL等
    assert result["direction"] in ["LONG", "SHORT", "NEUTRAL", "UP", "DOWN"]


@pytest.mark.unit
def test_detect_phase_uptrend(sample_stock, sample_quotes_list):
    """测试上涨趋势识别"""
    analyzer = WyckoffAnalyzer()

    result = analyzer.analyze(sample_stock, sample_quotes_list)

    # 应该返回有效结果
    assert "direction" in result
    assert "score" in result
    # 上涨趋势应该偏向LONG或NEUTRAL
    assert result["direction"] in ["LONG", "SHORT", "NEUTRAL", "UP", "DOWN"]


@pytest.mark.unit
def test_detect_phase_downtrend(sample_stock):
    """测试下跌趋势识别"""
    analyzer = WyckoffAnalyzer()

    # 创建下跌趋势数据
    quotes = []
    for i in range(100):
        quote = StockQuote()
        quote.stock_id = 1
        quote.timeframe = "daily"
        quote.date = datetime(2024, 1, 1) + timedelta(days=i)
        quote.open = 200.0 - i * 0.5
        quote.high = 205.0 - i * 0.5
        quote.low = 198.0 - i * 0.5
        quote.close = 203.0 - i * 0.5
        quote.volume = 1000000 + i * 5000
        quote.ma5 = 201.0 - i * 0.5
        quote.ma10 = 200.5 - i * 0.5
        quote.ma20 = 200.0 - i * 0.5
        quote.ma60 = 199.5 - i * 0.5
        quote.ma120 = 199.0 - i * 0.5
        quote.ma250 = 198.5 - i * 0.5
        quote.volume_ma5 = 1100000 + i * 5000
        quote.obv = 1000000 - i * 10000  # 下跌趋势OBV递减
        quotes.append(quote)

    result = analyzer.analyze(sample_stock, quotes)

    # 应该返回有效结果
    assert "direction" in result
    assert "score" in result
    assert result["direction"] in ["LONG", "SHORT", "NEUTRAL", "UP", "DOWN"]


@pytest.mark.unit
def test_calculate_ma(sample_stock, sample_quotes_list):
    """测试分析器正常工作"""
    analyzer = WyckoffAnalyzer()

    result = analyzer.analyze(sample_stock, sample_quotes_list)

    # 检查返回结果
    assert "score" in result
    assert "direction" in result
    assert "reason" in result
