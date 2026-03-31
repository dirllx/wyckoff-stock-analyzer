"""
测试Redis服务
"""
import pytest
from unittest.mock import Mock
from app.services.redis_service import RedisService


@pytest.mark.unit
def test_redis_service_initialization():
    """测试RedisService初始化"""
    service = RedisService()
    assert service is not None


@pytest.mark.unit
def test_clear_stock_cache():
    """测试清除股票缓存"""
    service = RedisService()
    service.delete = Mock(return_value=True)

    result = service.clear_stock_cache("TEST001")

    # 应该返回True
    assert result is True


@pytest.mark.unit
def test_clear_all_cache():
    """测试清除所有缓存"""
    service = RedisService()
    service.flushdb = Mock(return_value=True)

    result = service.clear_all_cache()

    # 应该返回True
    assert result is True
