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
def test_recognize_market_types():
    """测试识别市场类型"""
    fetcher = DataFetcher()

    # A股 - 688开头（科创板）
    assert fetcher._recognize_market("688234") == "A股"

    # A股 - 0开头
    assert fetcher._recognize_market("000001") == "A股"

    # A股 - 3开头
    assert fetcher._recognize_market("300001") == "A股"

    # A股 - 6开头（非科创板）
    assert fetcher._recognize_market("600000") == "A股"

    # 港股 - 4位或5位数字
    assert fetcher._recognize_market("02157") == "港股"
    assert fetcher._recognize_market("2157") == "港股"


@pytest.mark.unit
def test_get_stock_info():
    """测试获取股票信息"""
    fetcher = DataFetcher()

    # 获取科创板股票信息
    info = fetcher.get_stock_info("688234")

    # 应该返回字典
    assert isinstance(info, dict)
    assert "name" in info
    assert "market" in info


@pytest.mark.unit
def test_format_stock_code():
    """测试格式化股票代码"""
    fetcher = DataFetcher()

    # 港股代码格式化
    assert fetcher._format_stock_code("2157", "港股") == "02157"
    assert fetcher._format_stock_code("02157", "港股") == "02157"

    # A股代码不需要格式化
    assert fetcher._format_stock_code("600000", "A股") == "600000"
    assert fetcher._format_stock_code("688234", "A股") == "688234"
