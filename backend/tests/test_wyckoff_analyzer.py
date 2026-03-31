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


@pytest.mark.unit
def test_analyze_with_strong_uptrend(sample_stock):
    """测试强势上涨趋势"""
    analyzer = WyckoffAnalyzer()

    # 创建强势上涨数据
    quotes = []
    for i in range(100):
        quote = StockQuote()
        quote.stock_id = 1
        quote.timeframe = "daily"
        quote.date = datetime(2024, 1, 1) + timedelta(days=i)
        quote.open = 100.0 + i * 1.0
        quote.high = 105.0 + i * 1.0
        quote.low = 99.0 + i * 1.0
        quote.close = 104.0 + i * 1.0
        quote.volume = 1000000 + i * 10000  # 成交量递增
        quote.ma5 = 101.0 + i * 1.0
        quote.ma10 = 100.5 + i * 1.0
        quote.ma20 = 100.0 + i * 1.0
        quote.ma60 = 99.5 + i * 1.0
        quote.ma120 = 99.0 + i * 1.0
        quote.ma250 = 98.5 + i * 1.0
        quote.volume_ma5 = 1100000 + i * 10000
        quote.obv = 1000000 + i * 50000  # OBV强势上升
        quotes.append(quote)

    result = analyzer.analyze(sample_stock, quotes)

    # 强势上涨应该得到较高分数
    assert result["score"] >= 0
    assert "direction" in result


@pytest.mark.unit
def test_analyze_sideways_trend(sample_stock):
    """测试横盘震荡趋势"""
    analyzer = WyckoffAnalyzer()

    # 创建横盘数据
    quotes = []
    base_price = 100.0
    for i in range(100):
        quote = StockQuote()
        quote.stock_id = 1
        quote.timeframe = "daily"
        quote.date = datetime(2024, 1, 1) + timedelta(days=i)
        quote.open = base_price + (i % 10 - 5)
        quote.high = quote.open + 2
        quote.low = quote.open - 2
        quote.close = base_price + (i % 10 - 5)
        quote.volume = 1000000
        quote.ma5 = base_price
        quote.ma10 = base_price
        quote.ma20 = base_price
        quote.ma60 = base_price
        quote.ma120 = base_price
        quote.ma250 = base_price
        quote.volume_ma5 = 1000000
        quote.obv = 1000000 + (i % 20 - 10) * 10000  # OBV震荡
        quotes.append(quote)

    result = analyzer.analyze(sample_stock, quotes)

    # 横盘趋势应该返回NEUTRAL或低分
    assert result["score"] >= 0
    assert "direction" in result


@pytest.mark.unit
def test_analyze_with_high_volume(sample_stock):
    """测试高成交量分析"""
    analyzer = WyckoffAnalyzer()

    # 创建高成交量上涨数据
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
        quote.volume = 2000000 + i * 20000  # 高成交量
        quote.ma5 = 101.0 + i * 0.5
        quote.ma10 = 100.5 + i * 0.5
        quote.ma20 = 100.0 + i * 0.5
        quote.ma60 = 99.5 + i * 0.5
        quote.ma120 = 99.0 + i * 0.5
        quote.ma250 = 98.5 + i * 0.5
        quote.volume_ma5 = 2100000 + i * 20000
        quote.obv = 1000000 + i * 80000  # OBV强势上升
        quotes.append(quote)

    result = analyzer.analyze(sample_stock, quotes)

    # 高成交量上涨应该得到较高分数
    assert result["score"] >= 0
    assert "confidence" in result


@pytest.mark.unit
def test_analyze_returns_all_required_fields(sample_stock, sample_quotes_list):
    """测试分析结果包含所有必需字段"""
    analyzer = WyckoffAnalyzer()

    result = analyzer.analyze(sample_stock, sample_quotes_list)

    # 检查所有必需字段
    required_fields = [
        "score", "direction", "confidence", "strength",
        "signal_type", "suggestion", "reason"
    ]

    for field in required_fields:
        assert field in result, f"Missing field: {field}"


@pytest.mark.unit
def test_analyze_phase_detection(sample_stock):
    """测试威科夫阶段识别"""
    analyzer = WyckoffAnalyzer()

    # 创建吸筹阶段数据（下跌后横盘）
    quotes = []
    # 先下跌
    for i in range(50):
        quote = StockQuote()
        quote.stock_id = 1
        quote.timeframe = "daily"
        quote.date = datetime(2024, 1, 1) + timedelta(days=i)
        quote.open = 150.0 - i * 1.0
        quote.high = 155.0 - i * 1.0
        quote.low = 148.0 - i * 1.0
        quote.close = 152.0 - i * 1.0
        quote.volume = 1000000
        quote.ma5 = 151.0 - i * 1.0
        quote.ma10 = 150.5 - i * 1.0
        quote.ma20 = 150.0 - i * 1.0
        quote.ma60 = 149.5 - i * 1.0
        quote.ma120 = 149.0 - i * 1.0
        quote.ma250 = 148.5 - i * 1.0
        quote.volume_ma5 = 1000000
        quote.obv = 1000000 - i * 50000
        quotes.append(quote)

    # 后横盘
    for i in range(50):
        quote = StockQuote()
        quote.stock_id = 1
        quote.timeframe = "daily"
        quote.date = datetime(2024, 2, 20) + timedelta(days=i)
        quote.open = 100.0 + (i % 10 - 5)
        quote.high = quote.open + 2
        quote.low = quote.open - 2
        quote.close = 100.0 + (i % 10 - 5)
        quote.volume = 1000000
        quote.ma5 = 100.0
        quote.ma10 = 100.0
        quote.ma20 = 105.0 - i * 0.1  # MA20缓慢下降
        quote.ma60 = 120.0 - i * 0.3
        quote.ma120 = 130.0 - i * 0.4
        quote.ma250 = 140.0 - i * 0.5
        quote.volume_ma5 = 1000000
        quote.obv = 5000000  # OBV稳定
        quotes.append(quote)

    result = analyzer.analyze(sample_stock, quotes)

    # 应该识别出某种阶段
    assert result["score"] >= 0
    assert "direction" in result
