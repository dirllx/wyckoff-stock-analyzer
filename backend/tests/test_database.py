"""
测试数据库和配置
"""
import pytest
from app.database import get_db, init_db
from app.models.database import Stock, StockQuote, WyckoffSignal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.models.database import Base


@pytest.fixture
def in_memory_db():
    """创建内存数据库"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine)
    session = Session()

    yield session

    session.close()


@pytest.mark.unit
def test_database_models_creation(in_memory_db):
    """测试数据库模型创建"""
    # 创建股票
    stock = Stock()
    stock.code = "TEST001"
    stock.name = "测试股票"
    stock.market = "A股"
    stock.industry = "科技"

    in_memory_db.add(stock)
    in_memory_db.commit()

    # 验证创建成功
    retrieved = in_memory_db.query(Stock).filter(Stock.code == "TEST001").first()
    assert retrieved is not None
    assert retrieved.name == "测试股票"


@pytest.mark.unit
def test_stock_quote_creation(in_memory_db):
    """测试K线数据创建"""
    # 先创建股票
    stock = Stock(code="TEST001", name="测试股票", market="A股")
    in_memory_db.add(stock)
    in_memory_db.commit()

    # 创建K线数据
    quote = StockQuote()
    quote.stock_id = stock.id
    quote.timeframe = "daily"
    quote.date = "2024-01-01"
    quote.open = 100.0
    quote.high = 105.0
    quote.low = 98.0
    quote.close = 103.0
    quote.volume = 1000000

    in_memory_db.add(quote)
    in_memory_db.commit()

    # 验证创建成功
    retrieved = in_memory_db.query(StockQuote).filter(StockQuote.stock_id == stock.id).first()
    assert retrieved is not None
    assert retrieved.close == 103.0


@pytest.mark.unit
def test_wyckoff_signal_creation(in_memory_db):
    """测试威科夫信号创建"""
    # 先创建股票
    stock = Stock(code="TEST001", name="测试股票", market="A股")
    in_memory_db.add(stock)
    in_memory_db.commit()

    # 创建信号
    signal = WyckoffSignal()
    signal.stock_id = stock.id
    signal.timeframe = "daily"
    signal.date = "2024-01-01"
    signal.signal_type = "BREAKOUT"
    signal.direction = "LONG"
    signal.score = 4
    signal.confidence = 85.0

    in_memory_db.add(signal)
    in_memory_db.commit()

    # 验证创建成功
    retrieved = in_memory_db.query(WyckoffSignal).filter(WyckoffSignal.stock_id == stock.id).first()
    assert retrieved is not None
    assert retrieved.signal_type == "BREAKOUT"


@pytest.mark.unit
def test_stock_relationships(in_memory_db):
    """测试股票和K线的关系"""
    # 创建股票
    stock = Stock(code="TEST001", name="测试股票", market="A股")
    in_memory_db.add(stock)
    in_memory_db.commit()

    # 创建多条K线
    for i in range(10):
        quote = StockQuote()
        quote.stock_id = stock.id
        quote.timeframe = "daily"
        quote.date = f"2024-01-{i+1:02d}"
        quote.close = 100.0 + i
        in_memory_db.add(quote)

    in_memory_db.commit()

    # 验证关系
    quotes = in_memory_db.query(StockQuote).filter(StockQuote.stock_id == stock.id).all()
    assert len(quotes) == 10
