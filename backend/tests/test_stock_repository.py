"""
测试StockRepository数据访问层
"""
import pytest
from sqlalchemy.orm import Session
from app.repositories.stock_repository import StockRepository
from app.models.database import Stock, StockQuote, WyckoffSignal
from datetime import datetime


@pytest.mark.unit
def test_repository_initialization(db_session):
    """测试Repository初始化"""
    repo = StockRepository(db_session)
    assert repo is not None
    assert repo.db == db_session


@pytest.mark.unit
def test_find_by_code_not_found(db_session):
    """测试查找不存在的股票"""
    repo = StockRepository(db_session)
    stock = repo.find_by_code("NOTEXIST")
    assert stock is None


@pytest.mark.unit
def test_find_or_create_new(db_session):
    """测试创建新股票"""
    repo = StockRepository(db_session)

    # 第一次查找，应该创建
    stock = repo.find_or_create("TEST001", name="测试股票", market="A股")
    assert stock is not None
    assert stock.code == "TEST001"
    assert stock.name == "测试股票"
    assert stock.market == "A股"

    # 第二次查找，应该返回已存在的
    stock2 = repo.find_or_create("TEST001")
    assert stock2.id == stock.id
    assert stock2.code == "TEST001"


@pytest.mark.unit
def test_find_by_id(db_session, sample_stock):
    """测试根据ID查找股票"""
    repo = StockRepository(db_session)

    # 添加测试股票到数据库
    db_session.add(sample_stock)
    db_session.commit()

    # 查找
    stock = repo.find_by_id(sample_stock.id)
    assert stock is not None
    assert stock.code == sample_stock.code


@pytest.mark.unit
def test_get_all(db_session, sample_stock):
    """测试获取所有股票"""
    repo = StockRepository(db_session)

    # 添加测试股票
    db_session.add(sample_stock)
    db_session.commit()

    # 获取所有股票
    stocks = repo.get_all()
    assert len(stocks) >= 1
    assert any(s.code == "TEST001" for s in stocks)


@pytest.mark.unit
def test_get_by_market(db_session, sample_stock):
    """测试根据市场获取股票"""
    repo = StockRepository(db_session)

    # 添加测试股票
    db_session.add(sample_stock)
    db_session.commit()

    # 获取A股股票
    stocks = repo.get_by_market("A股")
    assert len(stocks) >= 1
    assert all(s.market == "A股" for s in stocks)


@pytest.mark.unit
def test_search(db_session, sample_stock):
    """测试搜索股票"""
    repo = StockRepository(db_session)

    # 添加测试股票
    db_session.add(sample_stock)
    db_session.commit()

    # 搜索代码
    stocks = repo.search("TEST")
    assert len(stocks) >= 1
    assert any("TEST" in s.code for s in stocks)


@pytest.mark.unit
def test_save_and_get_quotes(db_session, sample_stock, sample_quotes_list):
    """测试保存和获取K线数据"""
    repo = StockRepository(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 保存K线
    success = repo.save_quotes(sample_quotes_list)
    assert success is True

    # 获取K线
    quotes = repo.get_quotes(sample_stock.id, "daily", limit=10)
    assert len(quotes) == 10
    assert quotes[0].stock_id == sample_stock.id


@pytest.mark.unit
def test_get_latest_quote(db_session, sample_stock, sample_quotes_list):
    """测试获取最新K线"""
    repo = StockRepository(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 保存K线
    repo.save_quotes(sample_quotes_list)

    # 获取最新K线
    latest = repo.get_latest_quote(sample_stock.id, "daily")
    assert latest is not None
    assert latest.stock_id == sample_stock.id


@pytest.mark.unit
def test_count_quotes(db_session, sample_stock, sample_quotes_list):
    """测试统计K线数量"""
    repo = StockRepository(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 保存K线
    repo.save_quotes(sample_quotes_list)

    # 统计数量
    count = repo.count_quotes(sample_stock.id, "daily")
    assert count == 100


@pytest.mark.unit
def test_save_signal(db_session, sample_stock):
    """测试保存威科夫信号"""
    repo = StockRepository(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 创建信号
    signal = WyckoffSignal(
        stock_id=sample_stock.id,
        timeframe="daily",
        date=datetime.now(),
        signal_type="BREAKOUT",
        direction="LONG",
        score=85
    )

    # 保存信号
    success = repo.save_signal(signal)
    assert success is True

    # 获取信号
    signals = repo.get_signals(sample_stock.id, "daily", limit=5)
    assert len(signals) == 1
    assert signals[0].signal_type == "BREAKOUT"


@pytest.mark.unit
def test_delete_quotes(db_session, sample_stock, sample_quotes_list):
    """测试删除K线数据"""
    repo = StockRepository(db_session)

    # 添加股票
    db_session.add(sample_stock)
    db_session.commit()

    # 保存K线
    repo.save_quotes(sample_quotes_list)

    # 删除K线
    count = repo.delete_quotes(sample_stock.id, "daily")
    assert count == 100

    # 验证已删除
    quotes = repo.get_quotes(sample_stock.id, "daily")
    assert len(quotes) == 0
