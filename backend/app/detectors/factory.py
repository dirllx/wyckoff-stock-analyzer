"""
形态检测器工厂
"""
from typing import Dict, Type
from app.detectors.base import BasePatternDetector
from app.detectors.spring import SpringDetector
from app.detectors.breakout import BreakoutDetector


class PatternFactory:
    """形态检测器工厂"""

    # 注册的检测器
    _detectors: Dict[str, Type[BasePatternDetector]] = {
        "spring": SpringDetector,
        "breakout": BreakoutDetector,
        # 后续可添加更多形态
        # "shakeout": ShakeoutDetector,
        # "test": TestDetector,
        # "double_bottom": DoubleBottomDetector,
        # "v_shape": VShapeDetector,
    }

    @classmethod
    def create(cls, pattern_type: str) -> BasePatternDetector:
        """
        创建形态检测器实例

        Args:
            pattern_type: 形态类型

        Returns:
            形态检测器实例

        Raises:
            ValueError: 不支持的形态类型
        """
        detector_class = cls._detectors.get(pattern_type)
        if not detector_class:
            raise ValueError(f"不支持的形态类型: {pattern_type}")

        return detector_class()

    @classmethod
    def register(cls, pattern_type: str, detector_class: Type[BasePatternDetector]):
        """
        注册新的形态检测器

        Args:
            pattern_type: 形态类型
            detector_class: 检测器类
        """
        cls._detectors[pattern_type] = detector_class

    @classmethod
    def get_supported_patterns(cls) -> list:
        """获取支持的形态类型列表"""
        return list(cls._detectors.keys())
