"""
弹簧形态检测器
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional
from loguru import logger

from app.detectors.base import BasePatternDetector


class SpringDetector(BasePatternDetector):
    """
    弹簧形态检测器

    特征：
    1. 价格短暂跌破关键支撑位
    2. 成交量异常放大
    3. 快速反弹回升
    4. 在支撑位附近企稳
    """

    def __init__(self):
        super().__init__(name="弹簧", pattern_type="spring")

    def detect(self, df: pd.DataFrame, parameters: Dict = None) -> Optional[Dict]:
        """
        检测弹簧形态

        Args:
            df: K线数据
            parameters: 检测参数
                - support_deviation: 支撑位偏差比例 (默认 0.02)
                - volume_increase: 成交量增加倍数 (默认 1.5)
                - recovery_days: 回升天数 (默认 3)

        Returns:
            弹簧形态结果或None
        """
        if len(df) < 20:
            return None

        # 默认参数
        params = {
            "support_deviation": 0.02,
            "volume_increase": 1.5,
            "recovery_days": 3
        }
        if parameters:
            params.update(parameters)

        latest = df.iloc[-1]
        support_level = df.tail(20)["low"].min()
        avg_volume = df.tail(5)["volume"].mean()

        # 1. 检查是否跌破支撑位
        distance_to_support = abs(latest["low"] - support_level) / support_level
        below_support = latest["low"] < support_level * (1 + params["support_deviation"])

        if not below_support:
            return None

        # 2. 检查成交量是否异常放大
        volume_ratio = latest["volume"] / avg_volume if avg_volume > 0 else 1
        if volume_ratio < params["volume_increase"]:
            return None

        # 3. 检查是否快速回升（阳线或十字星）
        is_green_candle = latest["close"] > latest["open"]
        recovery = is_green_candle or (abs(latest["close"] - latest["open"]) / latest["close"] < 0.005)

        if not recovery:
            return None

        # 4. 计算置信度
        confidence = self.calculate_confidence(
            distance_to_support,
            volume_ratio,
            recovery
        )

        # 5. 构建详细信息
        details = {
            "support_level": support_level,
            "lowest_price": latest["low"],
            "volume_ratio": round(volume_ratio, 2),
            "close_price": latest["close"],
            "is_recovery": recovery,
            "reason": f"价格跌至支撑位({support_level:.2f})后反弹，成交量放大{volume_ratio:.2f}倍"
        }

        logger.debug(f"检测到弹簧形态: {confidence:.2f}")

        return self.format_result(
            confidence=confidence,
            trigger_price=latest["close"],
            direction="LONG",
            details=details
        )

    def calculate_confidence(
        self,
        distance_to_support: float,
        volume_ratio: float,
        recovery: bool
    ) -> float:
        """
        计算弹簧形态置信度

        考虑因素：
        - 距离支撑位越近，置信度越高
        - 成交量放大倍数越大，置信度越高
        - 是否快速回升
        """
        score = 0.5  # 基础分

        # 距离支撑位评分 (0-0.2)
        if distance_to_support < 0.01:
            score += 0.2
        elif distance_to_support < 0.02:
            score += 0.15

        # 成交量评分 (0-0.2)
        if volume_ratio > 2.0:
            score += 0.2
        elif volume_ratio > 1.5:
            score += 0.15
        elif volume_ratio > 1.2:
            score += 0.1

        # 回升评分 (0-0.1)
        if recovery:
            score += 0.1

        return min(0.95, score)  # 最高0.95
