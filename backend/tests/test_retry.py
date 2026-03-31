"""
测试网络重试机制
"""
import pytest
import time
from unittest.mock import Mock, patch
from app.utils.retry import retry_on_network_error, RetryStats


@pytest.mark.unit
def test_retry_decorator_success_on_first_try():
    """测试重试装饰器 - 第一次就成功"""
    call_count = {"count": 0}

    @retry_on_network_error(max_retries=3)
    def test_func():
        call_count["count"] += 1
        return "success"

    result = test_func()

    assert result == "success"
    assert call_count["count"] == 1


@pytest.mark.unit
def test_retry_decorator_retry_then_success():
    """测试重试装饰器 - 失败后重试成功"""
    call_count = {"count": 0}

    @retry_on_network_error(max_retries=3, initial_delay=0.1)
    def test_func():
        call_count["count"] += 1
        if call_count["count"] < 2:
            # 前两次失败，模拟网络错误
            raise ConnectionError("Connection refused")
        return "success"

    result = test_func()

    assert result == "success"
    assert call_count["count"] == 2


@pytest.mark.unit
def test_retry_decorator_max_retries_exceeded():
    """测试重试装饰器 - 超过最大重试次数"""
    @retry_on_network_error(max_retries=2, initial_delay=0.1)
    def test_func():
        raise ConnectionError("Connection refused")

    # 应该抛出异常
    with pytest.raises(ConnectionError):
        test_func()


@pytest.mark.unit
def test_retry_decorator_only_network_errors():
    """测试重试装饰器 - 只重试网络错误"""
    @retry_on_network_error(max_retries=3, initial_delay=0.1)
    def test_func():
        raise ValueError("Invalid input")

    # 非网络错误应该直接失败，不重试
    with pytest.raises(ValueError):
        test_func()


@pytest.mark.unit
def test_retry_decorator_exponential_backoff():
    """测试指数退避策略"""
    start_time = time.time()
    call_count = {"count": 0}

    @retry_on_network_error(max_retries=3, initial_delay=0.1, backoff_factor=2.0)
    def test_func():
        call_count["count"] += 1
        if call_count["count"] < 3:
            raise ConnectionError("Connection refused")
        return "success"

    result = test_func()
    elapsed_time = time.time() - start_time

    assert result == "success"
    assert call_count["count"] == 3
    # 应该有延迟（0.1 + 0.2 = 0.3秒）
    assert elapsed_time >= 0.3


@pytest.mark.unit
def test_retry_stats():
    """测试重试统计"""
    stats = RetryStats()

    stats.record_retry("test_func")
    stats.record_retry("test_func")
    stats.record_success("test_func")

    stats_data = stats.get_stats()

    assert stats_data["retry_counts"]["test_func"] == 2
    assert stats_data["success_counts"]["test_func"] == 1


@pytest.mark.unit
def test_retry_decorator_with_proxy_error():
    """测试ProxyError重试"""
    call_count = {"count": 0}

    @retry_on_network_error(max_retries=2, initial_delay=0.1)
    def test_func():
        call_count["count"] += 1
        if call_count["count"] < 2:
            raise ConnectionError("ProxyError: Unable to connect to proxy")
        return "success"

    result = test_func()

    assert result == "success"
    assert call_count["count"] == 2


@pytest.mark.unit
def test_retry_decorator_with_remote_disconnect():
    """测试RemoteDisconnected重试"""
    call_count = {"count": 0}

    @retry_on_network_error(max_retries=2, initial_delay=0.1)
    def test_func():
        call_count["count"] += 1
        if call_count["count"] < 2:
            raise ConnectionError("RemoteDisconnected: Remote end closed connection")
        return "success"

    result = test_func()

    assert result == "success"
    assert call_count["count"] == 2
