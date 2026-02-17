"""
配置管理服务
"""
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.config import (
    SystemConfig, PatternConfig, TimeframeConfig,
    FeishuConfig, RiskMonitorConfig
)


class ConfigService:
    """配置管理服务"""

    def __init__(self, db: Session):
        self.db = db

    # ==================== 系统配置 ====================

    def get_system_config(self, config_type: str) -> Optional[Dict]:
        """获取系统配置"""
        config = self.db.query(SystemConfig).filter(
            SystemConfig.config_type == config_type
        ).first()
        if config and config.enabled:
            return config.config_value
        return None

    def update_system_config(self, config_type: str, config_value: Dict) -> SystemConfig:
        """更新系统配置"""
        config = self.db.query(SystemConfig).filter(
            SystemConfig.config_type == config_type
        ).first()
        if config:
            config.config_value = config_value
        else:
            config = SystemConfig(
                config_type=config_type,
                config_value=config_value
            )
            self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    # ==================== 形态配置 ====================

    def get_enabled_patterns(self) -> List[str]:
        """获取启用的形态类型列表"""
        patterns = self.db.query(PatternConfig).filter(
            PatternConfig.enabled == True
        ).all()
        return [p.pattern_type for p in patterns]

    def get_pattern_config(self, pattern_type: str) -> Optional[PatternConfig]:
        """获取单个形态配置"""
        return self.db.query(PatternConfig).filter(
            PatternConfig.pattern_type == pattern_type
        ).first()

    def get_all_patterns(self) -> List[PatternConfig]:
        """获取所有形态配置"""
        return self.db.query(PatternConfig).order_by(
            PatternConfig.id
        ).all()

    def update_pattern_config(
        self,
        pattern_type: str,
        enabled: Optional[bool] = None,
        accuracy_mode: Optional[str] = None,
        parameters: Optional[Dict] = None,
        min_confidence: Optional[float] = None
    ) -> PatternConfig:
        """更新形态配置"""
        pattern = self.get_pattern_config(pattern_type)
        if not pattern:
            raise ValueError(f"形态 {pattern_type} 不存在")

        if enabled is not None:
            pattern.enabled = enabled
        if accuracy_mode is not None:
            pattern.accuracy_mode = accuracy_mode
        if parameters is not None:
            pattern.parameters = parameters
        if min_confidence is not None:
            pattern.min_confidence = min_confidence

        self.db.commit()
        self.db.refresh(pattern)
        return pattern

    # ==================== 周期配置 ====================

    def get_enabled_timeframes(self) -> List[str]:
        """获取启用的时间周期列表"""
        timeframes = self.db.query(TimeframeConfig).filter(
            TimeframeConfig.enabled == True
        ).order_by(TimeframeConfig.priority).all()
        return [tf.timeframe for tf in timeframes]

    def get_timeframe_config(self, timeframe: str) -> Optional[TimeframeConfig]:
        """获取单个周期配置"""
        return self.db.query(TimeframeConfig).filter(
            TimeframeConfig.timeframe == timeframe
        ).first()

    def get_all_timeframes(self) -> List[TimeframeConfig]:
        """获取所有周期配置"""
        return self.db.query(TimeframeConfig).order_by(
            TimeframeConfig.priority
        ).all()

    def update_timeframe_config(
        self,
        timeframe: str,
        enabled: Optional[bool] = None,
        data_retention_days: Optional[int] = None
    ) -> TimeframeConfig:
        """更新周期配置"""
        tf_config = self.get_timeframe_config(timeframe)
        if not tf_config:
            raise ValueError(f"周期 {timeframe} 不存在")

        if enabled is not None:
            tf_config.enabled = enabled
        if data_retention_days is not None:
            tf_config.data_retention_days = data_retention_days

        self.db.commit()
        self.db.refresh(tf_config)
        return tf_config

    # ==================== 飞书配置 ====================

    def get_feishu_config(self) -> FeishuConfig:
        """获取飞书配置"""
        config = self.db.query(FeishuConfig).first()
        if not config:
            config = FeishuConfig()
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
        return config

    def update_feishu_config(
        self,
        webhook_url: Optional[str] = None,
        enabled: Optional[bool] = None,
        trigger_on_signal: Optional[bool] = None,
        trigger_on_risk: Optional[bool] = None,
        min_signal_score: Optional[int] = None,
        template_type: Optional[str] = None,
        custom_template: Optional[str] = None,
        rate_limit_minutes: Optional[int] = None
    ) -> FeishuConfig:
        """更新飞书配置"""
        config = self.get_feishu_config()

        if webhook_url is not None:
            config.webhook_url = webhook_url
        if enabled is not None:
            config.enabled = enabled
        if trigger_on_signal is not None:
            config.trigger_on_signal = trigger_on_signal
        if trigger_on_risk is not None:
            config.trigger_on_risk = trigger_on_risk
        if min_signal_score is not None:
            config.min_signal_score = min_signal_score
        if template_type is not None:
            config.template_type = template_type
        if custom_template is not None:
            config.custom_template = custom_template
        if rate_limit_minutes is not None:
            config.rate_limit_minutes = rate_limit_minutes

        self.db.commit()
        self.db.refresh(config)
        return config

    # ==================== 风险配置 ====================

    def get_risk_config(self) -> RiskMonitorConfig:
        """获取风险配置"""
        config = self.db.query(RiskMonitorConfig).first()
        if not config:
            config = RiskMonitorConfig()
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
        return config

    def update_risk_config(
        self,
        max_loss_ratio: Optional[float] = None,
        max_position_ratio: Optional[float] = None,
        warning_loss_ratio: Optional[float] = None,
        stop_loss_enabled: Optional[bool] = None,
        enabled: Optional[bool] = None
    ) -> RiskMonitorConfig:
        """更新风险配置"""
        config = self.get_risk_config()

        if max_loss_ratio is not None:
            config.max_loss_ratio = max_loss_ratio
        if max_position_ratio is not None:
            config.max_position_ratio = max_position_ratio
        if warning_loss_ratio is not None:
            config.warning_loss_ratio = warning_loss_ratio
        if stop_loss_enabled is not None:
            config.stop_loss_enabled = stop_loss_enabled
        if enabled is not None:
            config.enabled = enabled

        self.db.commit()
        self.db.refresh(config)
        return config

    # ==================== 获取所有配置 ====================

    def get_all_configs(self) -> Dict[str, Any]:
        """获取所有配置（用于API响应）"""
        return {
            "system": {
                config.config_type: config.config_value
                for config in self.db.query(SystemConfig).filter(
                    SystemConfig.enabled == True
                ).all()
            },
            "patterns": [
                {
                    "type": p.pattern_type,
                    "name": p.pattern_name,
                    "enabled": p.enabled,
                    "accuracy_mode": p.accuracy_mode,
                    "min_confidence": p.min_confidence,
                    "parameters": p.parameters
                }
                for p in self.get_all_patterns()
            ],
            "timeframes": [
                {
                    "timeframe": tf.timeframe,
                    "name": tf.timeframe_name,
                    "enabled": tf.enabled,
                    "data_retention_days": tf.data_retention_days,
                    "update_frequency": tf.update_frequency
                }
                for tf in self.get_all_timeframes()
            ],
            "feishu": {
                "enabled": self.get_feishu_config().enabled,
                "trigger_on_signal": self.get_feishu_config().trigger_on_signal,
                "trigger_on_risk": self.get_feishu_config().trigger_on_risk,
                "min_signal_score": self.get_feishu_config().min_signal_score
            },
            "risk": {
                "enabled": self.get_risk_config().enabled,
                "max_loss_ratio": self.get_risk_config().max_loss_ratio,
                "max_position_ratio": self.get_risk_config().max_position_ratio,
                "warning_loss_ratio": self.get_risk_config().warning_loss_ratio
            }
        }
