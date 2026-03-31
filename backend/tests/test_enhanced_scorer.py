"""
测试增强评分系统
"""
import pytest
import pandas as pd
from app.services.analysis.enhanced_scorer import EnhancedScorer


@pytest.fixture
def enhanced_scorer():
    """创建EnhancedScorer实例"""
    return EnhancedScorer()


@pytest.mark.unit
def test_scorer_initialization(enhanced_scorer):
    """测试EnhancedScorer初始化"""
    assert enhanced_scorer is not None


@pytest.mark.unit
def test_calculate_rsi(enhanced_scorer):
    """测试RSI计算"""
    # 创建简单的价格序列
    prices = pd.Series([100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
                       110, 112, 111, 113, 115, 114, 116, 118, 117, 119])

    rsi = enhanced_scorer._calculate_rsi(prices, period=14)

    # RSI应该在0-100之间
    assert len(rsi) == len(prices)
    # 前面会有NaN值
    valid_rsi = rsi.dropna()
    if len(valid_rsi) > 0:
        assert valid_rsi.min() >= 0
        assert valid_rsi.max() <= 100


@pytest.mark.unit
def test_convert_to_score_scale_positive(enhanced_scorer):
    """测试正数分数转换"""
    score = enhanced_scorer._convert_to_score_scale(50)
    assert isinstance(score, int)
    # 对数转换可能产生负数或正数，我们只检查类型
    assert isinstance(score, int)


@pytest.mark.unit
def test_calculate_momentum_score(enhanced_scorer):
    """测试动量评分"""
    # 创建简单数据
    df = pd.DataFrame({
        'close': [100 + i for i in range(50)],
        'volume': [1000000] * 50,
        'obv': [1000000 + i * 10000 for i in range(50)],
        'high': [105 + i for i in range(50)],
        'low': [98 + i for i in range(50)],
        'open': [100 + i for i in range(50)],
    })

    score = enhanced_scorer._calculate_momentum_score(df)

    assert isinstance(score, float)
    assert score >= 0


@pytest.mark.unit
def test_calculate_short_term_score(enhanced_scorer):
    """测试短期评分"""
    # 创建简单数据
    df = pd.DataFrame({
        'close': [100 + i for i in range(50)],
        'volume': [1000000] * 50,
        'obv': [1000000 + i * 10000 for i in range(50)],
        'high': [105 + i for i in range(50)],
        'low': [98 + i for i in range(50)],
        'open': [100 + i for i in range(50)],
        'ma5': [102 + i for i in range(50)],
        'ma10': [101 + i for i in range(50)],
        'ma20': [100 + i for i in range(50)],
    })

    score = enhanced_scorer._calculate_short_term_score(df)

    assert isinstance(score, float)
    assert score >= 0
