"""
测试DataStorage数据存储服务
"""
import pytest
from datetime import datetime
from app.services.data.data_storage import DataStorage
from app.models.database import Stock, StockQuote


@pytest.mark.unit
def test_get_or_create_stock_existing(db_session):
    """测试获取已存在的股票"""
    storage = DataStorage(db_session)

    # 先创建股票
    stock = storage.get_or_create_stock("TEST001")

    # 再次获取应该返回同一个股票
    stock2 = storage.get_or_create_stock("TEST001")
    assert stock.id == stock2.id
    assert stock.code == stock2.code


@pytest.mark.unit
def test_get_or_create_stock_new(db_session):
    """测试创建新股票"""
    storage = DataStorage(db_session)

    # 创建新股票
    stock = storage.get_or_create_stock("NEW001")
    assert stock is not None
    assert stock.code == "NEW001"
    assert stock.id is not None


@pytest.mark.unit
def test_get_quotes_by_timeframe(db_session, sample_stock, sample_quotes_list):
    """测试获取指定周期的K线数据"""
    storage = DataStorage(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 保存K线数据
    storage.repo.save_quotes(sample_quotes_list)

    # 获取日线数据
    quotes = storage.get_quotes_by_timeframe(
        stock_id=sample_stock.id,
        timeframe="daily",
        limit=10
    )

    assert len(quotes) == 10
    assert quotes[0].timeframe == "daily"


@pytest.mark.unit
def test_get_quotes_by_code(db_session, sample_stock, sample_quotes_list):
    """测试根据股票代码获取K线数据"""
    storage = DataStorage(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 保存K线数据
    storage.repo.save_quotes(sample_quotes_list)

    # 获取K线数据
    quotes = storage.get_quotes(
        code=sample_stock.code,
        timeframe="daily",
        limit=50
    )

    assert len(quotes) == 50
    assert all(q.timeframe == "daily" for q in quotes)


@pytest.mark.unit
def test_get_latest_quote_via_repo(db_session, sample_stock, sample_quotes_list):
    """测试获取最新K线（通过Repository）"""
    storage = DataStorage(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 保存K线数据
    storage.repo.save_quotes(sample_quotes_list)

    # 获取最新K线
    latest = storage.repo.get_latest_quote(sample_stock.id, "daily")
    assert latest is not None
    assert latest.timeframe == "daily"


@pytest.mark.unit
def test_find_stock_by_code_via_repo(db_session, sample_stock):
    """测试根据代码获取股票（通过Repository）"""
    storage = DataStorage(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 获取股票
    stock = storage.repo.find_by_code("TEST001")
    assert stock is not None
    assert stock.code == "TEST001"


@pytest.mark.unit
def test_find_stock_by_code_not_found_via_repo(db_session):
    """测试获取不存在的股票（通过Repository）"""
    storage = DataStorage(db_session)

    stock = storage.repo.find_by_code("NOTEXIST")
    assert stock is None
