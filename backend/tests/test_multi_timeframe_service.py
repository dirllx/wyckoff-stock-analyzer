"""
测试MultiTimeframeService多周期分析服务
"""
import pytest
from app.services.multi_timeframe import MultiTimeframeService
from unittest.mock import Mock


@pytest.mark.unit
def test_multi_timeframe_service_initialization(db_session):
    """测试MultiTimeframeService初始化"""
    service = MultiTimeframeService(db_session)
    assert service is not None
    assert service.db == db_session


@pytest.mark.unit
def test_calculate_summary():
    """测试计算综合信号"""
    service = MultiTimeframeService(Mock())

    # 测试做多信号
    summary = service._calculate_summary(
        long_signals=3,
        short_signals=0,
        total_timeframes=3,
        total_confidence=75.0
    )

    assert summary["direction"] == "LONG"
    assert summary["suggestion"] == "BUY"
    assert summary["long_signals"] == 3
    assert summary["short_signals"] == 0


@pytest.mark.unit
def test_calculate_summary_neutral():
    """测试中性信号"""
    service = MultiTimeframeService(Mock())

    # 测试中性信号（多空相等）
    summary = service._calculate_summary(
        long_signals=1,
        short_signals=1,
        total_timeframes=2,
        total_confidence=50.0
    )

    assert summary["direction"] == "NEUTRAL"
    assert summary["suggestion"] == "HOLD"


@pytest.mark.unit
def test_calculate_summary_short():
    """测试做空信号"""
    service = MultiTimeframeService(Mock())

    # 测试做空信号
    summary = service._calculate_summary(
        long_signals=0,
        short_signals=2,
        total_timeframes=2,
        total_confidence=60.0
    )

    assert summary["direction"] == "SHORT"
    assert summary["suggestion"] == "SELL"


@pytest.mark.unit
def test_get_summary_message():
    """测试生成综合消息"""
    service = MultiTimeframeService(Mock())

    # 测试各种消息
    message1 = service._get_summary_message("LONG", "HIGH")
    assert isinstance(message1, str)

    message2 = service._get_summary_message("SHORT", "MEDIUM")
    assert isinstance(message2, str)

    message3 = service._get_summary_message("NEUTRAL", "LOW")
    assert isinstance(message3, str)
