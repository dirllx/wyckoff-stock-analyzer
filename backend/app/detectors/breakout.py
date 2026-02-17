"""
突破形态检测器
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional
from loguru import logger

from app.detectors.base import BasePatternDetector


class BreakoutDetector(BasePatternDetector):
    """
    突破形态检测器

    特征：
    1. 价格突破关键阻力位
    2. 成交量明显放大
    3. 前期有整理/震荡期
    4. 突破后持续上涨
    """

    def __init__(self):
        super().__init__(name="突破", pattern_type="breakout")

    def detect(self, df: pd.DataFrame, parameters: Dict = None) -> Optional[Dict]:
        """
        检测突破形态

        Args:
            df: K线数据
            parameters: 检测参数
                - resistance_deviation: 阻力位偏差比例 (默认 0.02)
                - volume_increase: 成交量增加倍数 (默认 2.0)
                - consolidation_days: 整理天数 (默认 5)

        Returns:
            突破形态结果或None
        """
        if len(df) < 20:
            return None

        # 默认参数
        params = {
            "resistance_deviation": 0.02,
            "volume_increase": 2.0,
            "consolidation_days": 5
        }
        if parameters:
            params.update(parameters)

        latest = df.iloc[-1]
        resistance_level = df.tail(20)["high"].max()
        avg_volume = df.tail(params["consolidation_days"] + 5)["volume"].mean()

        # 1. 检查是否突破阻力位
        distance_to_resistance = abs(latest["high"] - resistance_level) / resistance_level
        above_resistance = latest["close"] > resistance_level * (1 - params["resistance_deviation"])

        if not above_resistance:
            return None

        # 2. 检查成交量是否明显放大
        volume_ratio = latest["volume"] / avg_volume if avg_volume > 0 else 1
        if volume_ratio < params["volume_increase"]:
            return None

        # 3. 检查前期是否有整理期（价格波动小）
        consolidation = df.tail(params["consolidation_days"])
        price_range = (consolidation["high"].max() - consolidation["low"].min()) / consolidation["close"].mean()
        is_consolidation = price_range < 0.05  # 5%以内波动算整理

        # 4. 检查突破方向（向上）
        is_upward = latest["close"] > latest["open"]

        if not is_upward:
            return None

        # 5. 计算置信度
        confidence = self.calculate_confidence(
            distance_to_resistance,
            volume_ratio,
            is_consolidation,
            is_upward
        )

        # 6. 构建详细信息
        details = {
            "resistance_level": resistance_level,
            "highest_price": latest["high"],
            "volume_ratio": round(volume_ratio, 2),
            "close_price": latest["close"],
            "is_consolidation": is_consolidation,
            "price_range": round(price_range, 4),
            "reason": f"价格突破阻力位({resistance_level:.2f})，成交量放大{volume_ratio:.2f}倍"
        }

        logger.debug(f"检测到突破形态: {confidence:.2f}")

        return self.format_result(
            confidence=confidence,
            trigger_price=latest["close"],
            direction="LONG",
            details=details
        )

    def calculate_confidence(
        self,
        distance_to_resistance: float,
        volume_ratio: float,
        is_consolidation: bool,
        is_upward: bool
    ) -> float:
        """
        计算突破形态置信度

        考虑因素：
        - 突破幅度越大，置信度越高
        - 成交量放大倍数越大，置信度越高
        - 前期整理越充分，置信度越高
        - 突破方向
        """
        score = 0.5  # 基础分

        # 突破幅度评分 (0-0.15)
        if distance_to_resistance < 0.01:
            score += 0.15
        elif distance_to_resistance < 0.02:
            score += 0.1

        # 成交量评分 (0-0.25)
        if volume_ratio > 2.5:
            score += 0.25
        elif volume_ratio > 2.0:
            score += 0.2
        elif volume_ratio > 1.5:
            score += 0.15

        # 整理期评分 (0-0.1)
        if is_consolidation:
            score += 0.1

        return min(0.95, score)  # 最高0.95
