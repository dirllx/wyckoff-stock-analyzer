"""
测试ConfigService配置服务
"""
import pytest
from app.services.config_service import ConfigService
from app.models.config import SystemConfig


@pytest.mark.unit
def test_config_service_initialization(db_session):
    """测试ConfigService初始化"""
    service = ConfigService(db_session)
    assert service is not None
    assert service.db == db_session


@pytest.mark.integration
def test_get_enabled_timeframes(db_session):
    """测试获取启用的周期列表"""
    service = ConfigService(db_session)

    # 获取启用的周期（如果没有配置数据，可能返回空列表）
    timeframes = service.get_enabled_timeframes()

    # 应该返回列表
    assert isinstance(timeframes, list)


@pytest.mark.integration
def test_get_all_timeframes(db_session):
    """测试获取所有时间周期配置"""
    service = ConfigService(db_session)

    # 获取所有周期配置（可能为空）
    timeframes = service.get_all_timeframes()

    assert isinstance(timeframes, list)


@pytest.mark.integration
def test_get_timeframe_config(db_session):
    """测试获取特定周期配置"""
    service = ConfigService(db_session)

    # 获取日线配置（可能不存在）
    daily_config = service.get_timeframe_config("daily")

    # 如果配置不存在，返回None
    if daily_config:
        assert daily_config.timeframe == "daily"


@pytest.mark.unit
def test_get_enabled_patterns(db_session):
    """测试获取启用的形态列表"""
    service = ConfigService(db_session)

    # 获取启用的形态
    patterns = service.get_enabled_patterns()

    assert isinstance(patterns, list)


@pytest.mark.integration
def test_get_all_patterns(db_session):
    """测试获取所有形态配置"""
    service = ConfigService(db_session)

    # 获取所有形态配置（可能为空）
    patterns = service.get_all_patterns()

    assert isinstance(patterns, list)


@pytest.mark.integration
def test_get_pattern_config(db_session):
    """测试获取特定形态配置"""
    service = ConfigService(db_session)

    # 获取Spring形态配置（可能不存在）
    spring_config = service.get_pattern_config("Spring")

    # 如果配置不存在，返回None
    if spring_config:
        assert spring_config.pattern_type == "Spring"


@pytest.mark.integration
def test_get_all_configs(db_session):
    """测试获取所有配置"""
    service = ConfigService(db_session)

    # 获取所有配置
    configs = service.get_all_configs()

    assert isinstance(configs, dict)
    # 配置键可能因数据库状态而异
    assert len(configs) > 0
