"""
配置相关数据模型
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base

from app.models.database import Base


class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    config_type = Column(String(50), unique=True, nullable=False, comment="配置类型")
    config_name = Column(String(100), comment="配置名称")
    config_value = Column(JSON, comment="配置值(JSON格式)")
    enabled = Column(Boolean, default=True, comment="是否启用")
    description = Column(Text, comment="配置说明")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    def __repr__(self):
        return f"<SystemConfig {self.config_type}>"


class PatternConfig(Base):
    """形态配置表"""
    __tablename__ = "pattern_config"

    id = Column(Integer, primary_key=True, index=True)
    pattern_type = Column(String(50), unique=True, nullable=False, comment="形态类型")
    pattern_name = Column(String(100), comment="形态名称")
    enabled = Column(Boolean, default=True, comment="是否启用")
    accuracy_mode = Column(String(20), default="strict", comment="精度模式: strict/loose")
    parameters = Column(JSON, comment="形态参数")
    min_confidence = Column(Float, default=0.5, comment="最小置信度")
    description = Column(Text, comment="形态说明")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    def __repr__(self):
        return f"<PatternConfig {self.pattern_type}>"


class TimeframeConfig(Base):
    """时间周期配置表"""
    __tablename__ = "timeframe_config"

    id = Column(Integer, primary_key=True, index=True)
    timeframe = Column(String(20), unique=True, nullable=False, comment="时间周期代码")
    timeframe_name = Column(String(50), comment="周期名称")
    enabled = Column(Boolean, default=True, comment="是否启用")
    data_retention_days = Column(Integer, default=90, comment="数据保留天数")
    update_frequency = Column(String(20), comment="更新频率: daily/weekly/hourly")
    priority = Column(Integer, default=1, comment="优先级")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    def __repr__(self):
        return f"<TimeframeConfig {self.timeframe}>"


class FeishuConfig(Base):
    """飞书通知配置表"""
    __tablename__ = "feishu_config"

    id = Column(Integer, primary_key=True, index=True)
    webhook_url = Column(String(500), comment="Webhook URL")
    enabled = Column(Boolean, default=False, comment="是否启用")
    trigger_on_signal = Column(Boolean, default=True, comment="信号生成时触发")
    trigger_on_risk = Column(Boolean, default=True, comment="风险预警时触发")
    min_signal_score = Column(Integer, default=5, comment="最小信号评分")
    template_type = Column(String(50), default="simple", comment="模板类型")
    custom_template = Column(Text, comment="自定义模板")
    rate_limit_minutes = Column(Integer, default=30, comment="发送频率限制(分钟)")
    last_sent_at = Column(DateTime, comment="最后发送时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    def __repr__(self):
        return f"<FeishuConfig enabled={self.enabled}>"


class RiskMonitorConfig(Base):
    """风险监控配置表"""
    __tablename__ = "risk_monitor_config"

    id = Column(Integer, primary_key=True, index=True)
    config_name = Column(String(100), comment="配置名称")
    max_loss_ratio = Column(Float, default=0.10, comment="最大亏损比例")
    max_position_ratio = Column(Float, default=0.30, comment="最大单只股票持仓比例")
    warning_loss_ratio = Column(Float, default=0.05, comment="预警亏损比例")
    stop_loss_enabled = Column(Boolean, default=False, comment="是否启用自动止损")
    enabled = Column(Boolean, default=True, comment="是否启用")
    alert_levels = Column(JSON, comment="预警等级配置")
    description = Column(Text, comment="配置说明")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    def __repr__(self):
        return f"<RiskMonitorConfig max_loss={self.max_loss_ratio}>"


class PatternHistory(Base):
    """形态识别历史表"""
    __tablename__ = "pattern_history"

    id = Column(Integer, primary_key=True, index=True)
    stock_id = Column(Integer, comment="股票ID")
    stock_code = Column(String(20), index=True, comment="股票代码")
    pattern_type = Column(String(50), index=True, comment="形态类型")
    timeframe = Column(String(10), index=True, comment="时间周期")

    # 形态识别结果
    confidence = Column(Float, comment="置信度(0-1)")
    trigger_price = Column(Float, comment="触发价格")
    trigger_date = Column(DateTime, index=True, comment="触发日期")
    direction = Column(String(10), comment="方向: LONG/SHORT")

    # 详细信息
    details = Column(JSON, comment="详细信息")
    verified = Column(Boolean, default=False, comment="是否验证")
    verify_profit = Column(Float, comment="验证后盈亏")

    created_at = Column(DateTime, default=datetime.now, index=True, comment="识别时间")

    def __repr__(self):
        return f"<PatternHistory {self.stock_code} {self.pattern_type}>"
