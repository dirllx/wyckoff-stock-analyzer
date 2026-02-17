"""
数据库模型定义
"""
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Stock(Base):
    """股票信息表"""
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False, comment="股票代码")
    name = Column(String(50), comment="股票名称")
    market = Column(String(10), comment="市场: A股/港股")
    industry = Column(String(50), comment="行业")
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    # 关联
    quotes = relationship("StockQuote", back_populates="stock", cascade="all, delete-orphan")
    signals = relationship("WyckoffSignal", back_populates="stock", cascade="all, delete-orphan")


class StockQuote(Base):
    """股票行情数据表"""
    __tablename__ = "stock_quotes"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, comment="股票ID")
    date = Column(DateTime, index=True, nullable=False, comment="日期时间")
    timeframe = Column(String(10), index=True, comment="时间周期: daily/weekly/hourly")

    # OHLCV数据
    open = Column(Float, comment="开盘价")
    high = Column(Float, comment="最高价")
    low = Column(Float, comment="最低价")
    close = Column(Float, comment="收盘价")
    volume = Column(Float, comment="成交量")
    amount = Column(Float, comment="成交额")

    # 技术指标
    ma5 = Column(Float, comment="5日均线")
    ma10 = Column(Float, comment="10日均线")
    ma20 = Column(Float, comment="20日均线")
    volume_ma5 = Column(Float, comment="5日成交量均线")
    obv = Column(Float, comment="能量潮")

    created_at = Column(DateTime, default=datetime.now, comment="创建时间")

    # 关联和索引
    stock = relationship("Stock", back_populates="quotes")

    __table_args__ = (
        Index('idx_stock_date', 'stock_id', 'date', 'timeframe'),
    )


class WyckoffSignal(Base):
    """威科夫信号表"""
    __tablename__ = "wyckoff_signals"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, comment="股票ID")
    date = Column(DateTime, index=True, nullable=False, comment="信号日期")
    timeframe = Column(String(10), comment="时间周期")

    # 信号基本信息
    signal_type = Column(String(30), comment="信号类型: SPS/SPRING/BREAKOUT/TEST")
    direction = Column(String(10), comment="方向: LONG/SHORT/NEUTRAL")

    # 信号强度
    score = Column(Integer, comment="信号评分(1-10)")
    confidence = Column(Float, comment="置信度(0-1)")
    strength = Column(String(10), comment="强度: WEAK/MODERATE/STRONG")

    # 触发条件
    trigger_price = Column(Float, comment="触发价格")
    trigger_volume = Column(Float, comment="触发成交量")

    # 建议操作
    suggestion = Column(String(20), comment="建议: BUY/SELL/HOLD")
    reason = Column(Text, comment="信号原因说明")

    # 止损止盈
    stop_loss = Column(Float, comment="止损价")
    take_profit = Column(Float, comment="止盈价")

    # 验证结果
    verified = Column(String(10), comment="验证状态: PENDING/CONFIRMED/FALSE")
    verify_date = Column(DateTime, comment="验证日期")
    profit = Column(Float, comment="验证后盈亏")

    created_at = Column(DateTime, default=datetime.now, comment="创建时间")

    # 关联
    stock = relationship("Stock", back_populates="signals")


class UserPosition(Base):
    """用户持仓表"""
    __tablename__ = "user_positions"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), nullable=False, comment="股票ID")
    account_type = Column(String(20), comment="账户类型: 普通/信用/港股通")

    # 持仓信息
    quantity = Column(Float, comment="持仓数量")
    cost_price = Column(Float, comment="成本价")
    current_price = Column(Float, comment="当前价")
    market_value = Column(Float, comment="市值")
    profit = Column(Float, comment="盈亏金额")
    profit_rate = Column(Float, comment="盈亏比例(%)")

    # 风险指标
    position_ratio = Column(Float, comment="占账户比例(%)")
    risk_level = Column(String(10), comment="风险等级: LOW/MEDIUM/HIGH")

    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")
