"""
形态检测器基类
"""
from typing import Dict, Optional
from abc import ABC, abstractmethod
import pandas as pd


class BasePatternDetector(ABC):
    """形态检测器基类"""

    def __init__(self, name: str, pattern_type: str):
        self.name = name
        self.pattern_type = pattern_type

    @abstractmethod
    def detect(self, df: pd.DataFrame, parameters: Dict = None) -> Optional[Dict]:
        """
        检测形态

        Args:
            df: K线数据DataFrame
            parameters: 形态参数配置

        Returns:
            形态结果字典或None
        """
        pass

    def calculate_confidence(self, *args) -> float:
        """
        计算置信度

        由子类实现具体的置信度计算逻辑
        """
        return 0.5

    def format_result(
        self,
        confidence: float,
        trigger_price: float,
        direction: str,
        details: Dict
    ) -> Dict:
        """
        格式化检测结果

        Args:
            confidence: 置信度
            trigger_price: 触发价格
            direction: 方向 LONG/SHORT
            details: 详细信息

        Returns:
            标准化的形态结果
        """
        return {
            "pattern_type": self.pattern_type,
            "pattern_name": self.name,
            "confidence": confidence,
            "trigger_price": trigger_price,
            "direction": direction,
            "details": details
        }
