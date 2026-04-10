"""
测试DataFetcher数据获取器
"""
import pytest
from app.services.data.data_fetcher import DataFetcher


@pytest.mark.unit
def test_data_fetcher_initialization():
    """测试DataFetcher初始化"""
    fetcher = DataFetcher()
    assert fetcher is not None


@pytest.mark.unit
@pytest.mark.skip(reason="需要网络连接，跳过")
def test_get_stock_info():
    """测试获取股票信息"""
    fetcher = DataFetcher()

    # 获取科创板股票信息
    info = fetcher.get_stock_info("688234")

    # 应该返回字典
    assert isinstance(info, dict)
    assert "name" in info
    assert "market" in info
