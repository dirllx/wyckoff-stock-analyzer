"""
形态识别服务
"""
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
import pandas as pd
from datetime import datetime

from app.services.config_service import ConfigService
from app.detectors import PatternFactory
from app.models.config import PatternHistory
from app.models.database import Stock


class PatternRecognitionService:
    """形态识别服务"""

    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)

    def recognize_patterns(
        self,
        stock: Stock,
        quotes_df: pd.DataFrame,
        timeframe: str
    ) -> List[Dict]:
        """
        识别所有启用的形态

        Args:
            stock: 股票对象
            quotes_df: K线数据DataFrame
            timeframe: 时间周期

        Returns:
            识别到的形态列表
        """
        # 获取启用的形态类型
        enabled_patterns = self.config_service.get_enabled_patterns()
        results = []

        for pattern_type in enabled_patterns:
            try:
                # 创建检测器
                detector = PatternFactory.create(pattern_type)

                # 获取形态配置
                pattern_config = self.config_service.get_pattern_config(pattern_type)
                parameters = pattern_config.parameters if pattern_config else None
                min_confidence = pattern_config.min_confidence if pattern_config else 0.5

                # 检测形态
                pattern_result = detector.detect(quotes_df, parameters)

                if pattern_result:
                    # 检查置信度是否达到要求
                    if pattern_result["confidence"] >= min_confidence:
                        # 保存到数据库
                        self._save_pattern_history(
                            stock=stock,
                            pattern_type=pattern_type,
                            timeframe=timeframe,
                            result=pattern_result
                        )
                        results.append(pattern_result)

            except Exception as e:
                print(f"形态检测失败 {pattern_type}: {e}")

        return results

    def _save_pattern_history(
        self,
        stock: Stock,
        pattern_type: str,
        timeframe: str,
        result: Dict
    ):
        """
        保存形态识别历史

        Args:
            stock: 股票对象
            pattern_type: 形态类型
            timeframe: 时间周期
            result: 形态识别结果
        """
        try:
            history = PatternHistory(
                stock_id=stock.id,
                stock_code=stock.code,
                pattern_type=pattern_type,
                timeframe=timeframe,
                confidence=result["confidence"],
                trigger_price=result["trigger_price"],
                trigger_date=datetime.now(),
                direction=result["direction"],
                details=result.get("details", {})
            )
            self.db.add(history)
            self.db.commit()
        except Exception as e:
            print(f"保存形态历史失败: {e}")
            self.db.rollback()

    def get_pattern_history(
        self,
        stock_code: str = None,
        pattern_type: str = None,
        days: int = 30
    ) -> List[PatternHistory]:
        """
        获取形态识别历史

        Args:
            stock_code: 股票代码（可选）
            pattern_type: 形态类型（可选）
            days: 查询最近多少天

        Returns:
            形态历史列表
        """
        from datetime import timedelta

        query = self.db.query(PatternHistory).filter(
            PatternHistory.created_at >= datetime.now() - timedelta(days=days)
        )

        if stock_code:
            query = query.filter(PatternHistory.stock_code == stock_code)

        if pattern_type:
            query = query.filter(PatternHistory.pattern_type == pattern_type)

        return query.order_by(PatternHistory.created_at.desc()).all()
