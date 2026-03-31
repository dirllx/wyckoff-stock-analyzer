"""
测试形态检测器
"""
import pytest
import pandas as pd
from app.detectors.breakout import BreakoutDetector
from app.detectors.spring import SpringDetector


@pytest.fixture
def sample_dataframe():
    """创建示例K线数据"""
    return pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=100),
        'open': [100 + i * 0.5 for i in range(100)],
        'high': [105 + i * 0.5 for i in range(100)],
        'low': [98 + i * 0.5 for i in range(100)],
        'close': [103 + i * 0.5 for i in range(100)],
        'volume': [1000000] * 100,
        'ma20': [100 + i * 0.5 for i in range(100)],
        'ma60': [99 + i * 0.5 for i in range(100)],
    })


@pytest.mark.unit
def test_breakout_detector_initialization():
    """测试BreakoutDetector初始化"""
    detector = BreakoutDetector()
    assert detector is not None


@pytest.mark.unit
def test_breakout_detector_detect(sample_dataframe):
    """测试突破检测"""
    detector = BreakoutDetector()

    patterns = detector.detect(sample_dataframe, "TEST001", "daily")

    # 应该返回列表
    assert isinstance(patterns, list)


@pytest.mark.unit
def test_spring_detector_initialization():
    """测试SpringDetector初始化"""
    detector = SpringDetector()
    assert detector is not None


@pytest.mark.unit
def test_spring_detector_detect(sample_dataframe):
    """测试Spring检测"""
    detector = SpringDetector()

    patterns = detector.detect(sample_dataframe, "TEST001", "daily")

    # 应该返回列表
    assert isinstance(patterns, list)
