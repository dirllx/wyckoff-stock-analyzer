"""
测试WyckoffAnalyzer核心方法
"""
import pytest
import pandas as pd
from datetime import datetime, timedelta
from app.services.analysis.wyckoff_analyzer import WyckoffAnalyzer
from app.models.database import Stock


@pytest.fixture
def analyzer():
    """创建分析器实例"""
    return WyckoffAnalyzer()


@pytest.fixture
def sample_stock():
    """创建示例股票"""
    stock = Stock()
    stock.id = 1
    stock.code = "TEST001"
    stock.name = "测试股票"
    return stock


@pytest.fixture
def sample_dataframe_uptrend():
    """创建上涨趋势DataFrame"""
    data = {
        'date': pd.date_range('2024-01-01', periods=100),
        'open': [100 + i * 0.5 for i in range(100)],
        'high': [105 + i * 0.5 for i in range(100)],
        'low': [98 + i * 0.5 for i in range(100)],
        'close': [103 + i * 0.5 for i in range(100)],
        'volume': [1000000 + i * 10000 for i in range(100)],
        'ma5': [101 + i * 0.5 for i in range(100)],
        'ma10': [100.5 + i * 0.5 for i in range(100)],
        'ma20': [100 + i * 0.5 for i in range(100)],
        'ma60': [99 + i * 0.5 for i in range(100)],
        'ma120': [98.5 + i * 0.5 for i in range(100)],
        'ma250': [98 + i * 0.5 for i in range(100)],
        'volume_ma5': [1100000 + i * 10000 for i in range(100)],
        'obv': [1000000 + i * 50000 for i in range(100)],
    }
    return pd.DataFrame(data)


@pytest.mark.unit
def test_analyze_volume(analyzer, sample_dataframe_uptrend):
    """测试成交量分析"""
    result = analyzer._analyze_volume(sample_dataframe_uptrend)

    assert isinstance(result, dict)
    # 检查有效字段
    assert 'type' in result
    assert result['type'] == 'VOLUME'


@pytest.mark.unit
def test_analyze_effort_result(analyzer, sample_dataframe_uptrend):
    """测试价量配合分析"""
    result = analyzer._analyze_effort_result(
        sample_dataframe_uptrend,
        volume_weight=0.5,
        price_weight=0.5
    )

    assert isinstance(result, dict)
    assert 'relation_type' in result


@pytest.mark.unit
def test_analyze_sps(analyzer, sample_dataframe_uptrend):
    """测试SPS分析"""
    result = analyzer._analyze_sps(sample_dataframe_uptrend)

    assert isinstance(result, dict)


@pytest.mark.unit
def test_analyze_trend(analyzer, sample_dataframe_uptrend):
    """测试趋势分析"""
    result = analyzer._analyze_trend(sample_dataframe_uptrend)

    assert isinstance(result, dict)
    # 检查有效字段
    assert 'type' in result
    assert result['type'] == 'TREND'


@pytest.mark.unit
def test_generate_ma_signals(analyzer, sample_dataframe_uptrend):
    """测试MA信号生成"""
    signals = analyzer._generate_ma_signals(sample_dataframe_uptrend)

    assert isinstance(signals, list)


@pytest.mark.unit
def test_infer_wyckoff_phase(analyzer, sample_dataframe_uptrend):
    """测试威科夫阶段推断"""
    # 创建趋势和成交量分析结果
    trend_analysis = {
        'type': 'TREND',
        'direction': 'LONG',
        'strength': 'STRONG',
        'reason': '均线多头排列，上涨趋势'
    }
    volume_analysis = {
        'type': 'VOLUME',
        'anomaly': False,
        'direction': 'LONG',
        'strength': 'STRONG',
        'reason': '成交量正常，OBV上升，资金流入'
    }

    phase = analyzer._infer_wyckoff_phase(
        sample_dataframe_uptrend,
        trend_analysis,
        volume_analysis
    )
    # 返回格式是 U(放量上涨), D(放量下跌) 等
    assert phase is not None
    assert isinstance(phase, str)


@pytest.mark.unit
def test_combine_signals(analyzer):
    """测试信号组合"""
    volume = {
        'type': 'VOLUME',
        'direction': 'LONG',
        'strength': 'STRONG',
        'obv_trend': 'UP',
        'reason': '成交量正常，OBV上升，资金流入'
    }
    effort_result = {
        'type': 'EFFORT_RESULT',
        'relation_type': '量价齐升',
        'signal_direction': 'STRONG_CONFIRMATION',
        'reason': '量价协调'
    }
    sps = {
        'type': 'SPS',
        'direction': 'NEUTRAL',
        'strength': 'WEAK',
        'has_sps': False,
        'reason': '无明确SPS信号'
    }
    trend = {
        'type': 'TREND',
        'direction': 'LONG',
        'strength': 'STRONG',
        'reason': '均线多头排列，上涨趋势'
    }

    result = analyzer._combine_signals(
        volume,
        effort_result,
        sps,
        trend
    )

    assert isinstance(result, dict)
    assert 'score' in result


@pytest.mark.unit
def test_analyze_with_enough_data(sample_stock):
    """测试数据充足时的完整分析"""
    analyzer = WyckoffAnalyzer()

    # 创建100条K线数据
    quotes = []
    for i in range(100):
        quote = type('Quote', (), {
            'stock_id': 1,
            'timeframe': 'daily',
            'date': datetime(2024, 1, 1) + timedelta(days=i),
            'open': 100.0 + i * 0.5,
            'high': 105.0 + i * 0.5,
            'low': 98.0 + i * 0.5,
            'close': 103.0 + i * 0.5,
            'volume': 1000000 + i * 5000,
            'ma5': 101.0 + i * 0.5,
            'ma10': 100.5 + i * 0.5,
            'ma15': 100.0 + i * 0.5,
            'ma20': 100.0 + i * 0.5,
            'ma30': 99.5 + i * 0.5,
            'ma60': 99.0 + i * 0.5,
            'ma90': 98.5 + i * 0.5,
            'ma120': 98.0 + i * 0.5,
            'ma250': 97.5 + i * 0.5,
            'volume_ma5': 1100000 + i * 5000,
            'obv': 1000000 + i * 10000,
        })()
        quotes.append(quote)

    result = analyzer.analyze(sample_stock, quotes)

    assert result is not None
    assert 'score' in result
    assert 'direction' in result
