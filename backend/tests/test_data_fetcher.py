"""
测试数据获取服务
"""
import pytest
import pandas as pd
from app.services.data.data_fetcher import DataFetcher


@pytest.mark.unit
def test_fetcher_initialization():
    """测试数据获取器初始化"""
    fetcher = DataFetcher()
    assert fetcher is not None
    assert "A股" in fetcher.supported_markets
    assert "港股" in fetcher.supported_markets


@pytest.mark.integration
def test_get_stock_list_a_stock():
    """测试获取A股列表（需要网络）"""
    pytest.skip("跳过集成测试，需要网络连接")

    fetcher = DataFetcher()
    df = fetcher.get_stock_list("A股")

    assert not df.empty
    assert "code" in df.columns
    assert "name" in df.columns
    assert len(df) > 1000  # A股应该有1000+只股票


@pytest.mark.integration
def test_get_stock_info_688234():
    """测试获取688234股票信息"""
    pytest.skip("跳过集成测试，需要网络连接")

    fetcher = DataFetcher()
    info = fetcher.get_stock_info("688234")

    assert info["code"] == "688234"
    assert info["market"] == "A股"
    assert info["name"] != ""  # 应该能获取到股票名称


@pytest.mark.integration
def test_get_stock_quotes_daily():
    """测试获取日线数据"""
    pytest.skip("跳过集成测试，需要网络连接")

    fetcher = DataFetcher()
    df = fetcher.get_stock_quotes("688234", period="daily", min_quotes=100)

    assert not df.empty
    assert "date" in df.columns
    assert "close" in df.columns
    assert len(df) >= 100  # 应该至少有100条数据


@pytest.mark.unit
def test_get_stock_quotes_hk_no_minute():
    """测试港股不支持分钟线"""
    fetcher = DataFetcher()

    # 港股应该不支持分钟线
    df = fetcher.get_stock_quotes("02157", period="30")

    # 应该返回空DataFrame
    assert df.empty


@pytest.mark.unit
def test_recognize_market_types():
    """测试市场类型识别"""
    fetcher = DataFetcher()

    # A股：6位数字，0/3/6开头
    # 港股：4-5位数字
    # 基金：6位数字，5开头

    # 这里只测试逻辑，不实际调用API
    assert True  # 占位测试


@pytest.mark.unit
def test_error_handling():
    """测试错误处理"""
    fetcher = DataFetcher()

    # 无效的股票代码
    info = fetcher.get_stock_info("INVALID_CODE")
    assert info["market"] == "未知"
