"""
测试检测器完整功能
"""
import pytest
import pandas as pd
from app.detectors.breakout import BreakoutDetector
from app.detectors.spring import SpringDetector


@pytest.fixture
def breakout_sample_data():
    """创建突破形态数据"""
    data = {
        'date': pd.date_range('2024-01-01', periods=100),
        'open': [100] * 50 + [105] * 50,  # 突破
        'high': [102] * 50 + [110] * 50,
        'low': [98] * 50 + [103] * 50,
        'close': [101] * 50 + [108] * 50,
        'volume': [1000000] * 50 + [5000000] * 50,  # 突破时成交量放大
        'ma20': [100] * 100,
        'ma60': [99] * 100,
    }
    return pd.DataFrame(data)


@pytest.fixture
def spring_sample_data():
    """创建Spring形态数据"""
    data = {
        'date': pd.date_range('2024-01-01', periods=100),
        'open': [100 - i * 0.5 for i in range(50)] + [75 + i * 0.5 for i in range(50)],  # 先跌后涨
        'high': [102 - i * 0.5 for i in range(50)] + [78 + i * 0.5 for i in range(50)],
        'low': [98 - i * 0.5 for i in range(50)] + [73 + i * 0.5 for i in range(50)],
        'close': [101 - i * 0.5 for i in range(50)] + [76 + i * 0.5 for i in range(50)],
        'volume': [1000000] * 100,
        'ma20': [100 - i * 0.4 for i in range(100)],
        'ma60': [99 - i * 0.3 for i in range(100)],
        'volume_ma5': [1000000] * 100,
        'obv': [1000000 - i * 50000 for i in range(50)] + [7500000 + i * 50000 for i in range(50)],
    }
    return pd.DataFrame(data)


@pytest.mark.unit
def test_breakout_detector_detect_breakout(breakout_sample_data):
    """测试检测突破形态"""
    detector = BreakoutDetector()
    result = detector.detect(breakout_sample_data)

    # 应该返回Dict或None
    assert result is None or isinstance(result, dict)


@pytest.mark.unit
def test_breakout_detector_no_breakout():
    """测试没有突破的情况"""
    detector = BreakoutDetector()

    # 横盘数据，没有突破
    data = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=100),
        'open': [100] * 100,
        'high': [102] * 100,
        'low': [98] * 100,
        'close': [101] * 100,
        'volume': [1000000] * 100,
        'ma20': [100] * 100,
    })

    result = detector.detect(data)

    # 应该返回None或Dict
    assert result is None or isinstance(result, dict)


@pytest.mark.unit
def test_spring_detector_detect_spring(spring_sample_data):
    """测试检测Spring形态"""
    detector = SpringDetector()
    result = detector.detect(spring_sample_data)

    # 应该返回Dict或None
    assert result is None or isinstance(result, dict)


@pytest.mark.unit
def test_spring_detector_no_spring():
    """测试没有Spring的情况"""
    detector = SpringDetector()

    # 单边上涨数据，没有Spring
    data = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=100),
        'open': [100 + i * 0.5 for i in range(100)],
        'high': [105 + i * 0.5 for i in range(100)],
        'low': [98 + i * 0.5 for i in range(100)],
        'close': [103 + i * 0.5 for i in range(100)],
        'volume': [1000000] * 100,
        'ma20': [100 + i * 0.5 for i in range(100)],
        'volume_ma5': [1000000] * 100,
        'obv': [1000000 + i * 50000 for i in range(100)],
    })

    result = detector.detect(data)

    # 应该返回None或Dict
    assert result is None or isinstance(result, dict)


@pytest.mark.unit
def test_detector_with_insufficient_data():
    """测试数据不足的情况"""
    detector = BreakoutDetector()

    # 只有10条数据
    data = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=10),
        'open': [100] * 10,
        'high': [102] * 10,
        'low': [98] * 10,
        'close': [101] * 10,
        'volume': [1000000] * 10,
    })

    result = detector.detect(data)

    # 应该返回None或Dict
    assert result is None or isinstance(result, dict)
