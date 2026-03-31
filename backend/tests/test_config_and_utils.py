"""
测试配置和工具类
"""
import pytest
from app.config import settings
from app.utils.converters import dict_to_stock_quotes


@pytest.mark.unit
def test_settings_import():
    """测试配置导入"""
    from app.config import settings
    assert settings is not None


@pytest.mark.unit
def test_dict_to_stock_quotes_empty():
    """测试转换空的字典列表"""
    result = dict_to_stock_quotes([], 1, "daily")

    assert isinstance(result, list)
    assert len(result) == 0


@pytest.mark.unit
def test_dict_to_stock_quotes_basic():
    """测试基本的字典转换"""
    data = [
        {
            "date": "2024-01-01 00:00:00",
            "open": 100.0,
            "high": 105.0,
            "low": 98.0,
            "close": 103.0,
            "volume": 1000000
        }
    ]

    result = dict_to_stock_quotes(data, 1, "daily")

    assert len(result) == 1
    assert result[0].open == 100.0
    assert result[0].close == 103.0


@pytest.mark.unit
def test_dict_to_stock_quotes_with_ma():
    """测试带MA数据的转换"""
    data = [
        {
            "date": "2024-01-01 00:00:00",
            "open": 100.0,
            "high": 105.0,
            "low": 98.0,
            "close": 103.0,
            "volume": 1000000,
            "ma5": 101.0,
            "ma10": 100.5,
            "ma20": 100.0,
            "ma60": 99.5,
            "ma120": 99.0,
            "ma250": 98.5,
            "volume_ma5": 1100000,
            "obv": 1000000
        }
    ]

    result = dict_to_stock_quotes(data, 1, "daily")

    assert len(result) == 1
    assert result[0].ma5 == 101.0
    assert result[0].ma10 == 100.5
    assert result[0].obv == 1000000


@pytest.mark.unit
def test_dict_to_stock_quotes_invalid_date():
    """测试无效日期格式"""
    data = [
        {
            "date": "invalid-date",
            "open": 100.0,
            "high": 105.0,
            "low": 98.0,
            "close": 103.0,
            "volume": 1000000
        }
    ]

    result = dict_to_stock_quotes(data, 1, "daily")

    # 应该返回空列表或跳过无效数据
    assert isinstance(result, list)


@pytest.mark.unit
def test_dict_to_stock_quotes_missing_fields():
    """测试缺少必需字段"""
    data = [
        {
            "date": "2024-01-01 00:00:00",
            "open": 100.0,
            # 缺少其他字段
        }
    ]

    result = dict_to_stock_quotes(data, 1, "daily")

    # 应该返回空列表或跳过无效数据
    assert isinstance(result, list)


@pytest.mark.unit
def test_database_initialization():
    """测试数据库初始化"""
    from app.database import init_db
    from app.models.database import Base

    # 只验证函数存在，不实际初始化
    assert callable(init_db)
    assert Base is not None


@pytest.mark.unit
def test_schemas_imports():
    """测试schemas导入"""
    from app.models.schemas import (
        StockAnalysisRequest,
        StockAnalysisResponse,
        WyckoffSignalResponse,
        MessageResponse
    )

    # 验证可以创建实例
    request = StockAnalysisRequest(code="TEST001", timeframe="daily")
    assert request.code == "TEST001"
    assert request.timeframe == "daily"
