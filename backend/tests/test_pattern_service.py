"""
测试PatternService形态识别服务
"""
import pytest
import pandas as pd
from app.services.pattern_service import PatternRecognitionService
from app.models.database import Stock


@pytest.mark.unit
def test_pattern_service_initialization(db_session):
    """测试PatternService初始化"""
    service = PatternRecognitionService(db_session)
    assert service is not None
    assert service.db == db_session


@pytest.mark.unit
def test_recognize_patterns_with_data(db_session, sample_stock):
    """测试识别形态（有数据）"""
    service = PatternRecognitionService(db_session)

    # 创建简单的DataFrame
    df = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=50),
        'open': [100 + i * 0.5 for i in range(50)],
        'high': [105 + i * 0.5 for i in range(50)],
        'low': [98 + i * 0.5 for i in range(50)],
        'close': [103 + i * 0.5 for i in range(50)],
        'volume': [1000000] * 50,
        'ma5': [101 + i * 0.5 for i in range(50)],
        'ma10': [100 + i * 0.5 for i in range(50)],
        'ma20': [100 + i * 0.5 for i in range(50)],
        'volume_ma5': [1000000] * 50,
        'obv': [1000000 + i * 10000 for i in range(50)],
    })

    patterns = service.recognize_patterns(sample_stock, df, "daily")

    # 应该返回列表
    assert isinstance(patterns, list)


@pytest.mark.unit
def test_recognize_patterns_insufficient_data(db_session, sample_stock):
    """测试识别形态（数据不足）"""
    service = PatternRecognitionService(db_session)

    # 创建数据不足的DataFrame（少于20条）
    df = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=10),
        'open': [100 + i * 0.5 for i in range(10)],
        'high': [105 + i * 0.5 for i in range(10)],
        'low': [98 + i * 0.5 for i in range(10)],
        'close': [103 + i * 0.5 for i in range(10)],
        'volume': [1000000] * 10,
    })

    patterns = service.recognize_patterns(sample_stock, df, "daily")

    # 应该返回空列表
    assert isinstance(patterns, list)


@pytest.mark.unit
def test_get_pattern_history(db_session):
    """测试获取形态历史"""
    service = PatternRecognitionService(db_session)

    # 获取形态历史
    history = service.get_pattern_history(
        stock_code="TEST001",
        pattern_type=None,
        days=30
    )

    # 应该返回列表
    assert isinstance(history, list)


@pytest.mark.unit
def test_get_pattern_history_by_type(db_session):
    """测试按类型获取形态历史"""
    service = PatternRecognitionService(db_session)

    # 获取特定类型的形态历史
    history = service.get_pattern_history(
        stock_code="TEST001",
        pattern_type="Spring",
        days=7
    )

    # 应该返回列表
    assert isinstance(history, list)
