"""
测试数据模型
"""
import pytest
from app.models.config import SystemConfig, TimeframeConfig, PatternConfig
from app.models.watchlist_schemas import WatchlistAddRequest


@pytest.mark.unit
def test_system_config_creation():
    """测试SystemConfig创建"""
    config = SystemConfig(
        config_type="analysis",
        config_value={"default_timeframe": "daily"}
    )

    assert config.config_type == "analysis"
    assert config.config_value["default_timeframe"] == "daily"


@pytest.mark.unit
def test_timeframe_config_creation():
    """测试TimeframeConfig创建"""
    config = TimeframeConfig(
        timeframe="daily",
        timeframe_name="日线",
        enabled=True,
        priority=1
    )

    assert config.timeframe == "daily"
    assert config.enabled is True
    assert config.priority == 1


@pytest.mark.unit
def test_pattern_config_creation():
    """测试PatternConfig创建"""
    config = PatternConfig(
        pattern_type="Spring",
        enabled=True,
        parameters={"lookback": 20}
    )

    assert config.pattern_type == "Spring"
    assert config.enabled is True


@pytest.mark.unit
def test_watchlist_add_request():
    """测试WatchlistAddRequest"""
    request = WatchlistAddRequest(
        code="TEST001",
        watch_type="favorite"
    )

    assert request.code == "TEST001"
    assert request.watch_type == "favorite"
