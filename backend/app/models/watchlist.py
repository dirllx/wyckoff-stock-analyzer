"""
用户关注股票列表模型
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

from app.models.database import Base, Stock


class UserStockWatch(Base):
    """用户关注股票列表"""
    __tablename__ = "user_stock_watch"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, ForeignKey("stocks.id"), comment="股票ID")
    stock_code = Column(String(20), index=True, nullable=False, comment="股票代码")
    stock_name = Column(String(100), comment="股票名称（缓存）")
    priority = Column(Integer, default=0, comment="排序优先级")
    created_at = Column(DateTime, default=datetime.now, comment="添加时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    # 关联
    stock = relationship("Stock")

    def __repr__(self):
        return f"<UserStockWatch {self.stock_code}>"
