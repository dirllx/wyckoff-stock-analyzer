"""
配置文件
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""

    # 数据库配置
    DATABASE_URL: str = "sqlite:///./wyckoff.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # API配置
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = os.getenv("DEBUG", "False") == "True"

    # 前端配置
    FRONTEND_PORT: int = 3000

    # 日志配置
    LOG_LEVEL: str = "INFO"

    # Tushare配置
    TUSHARE_TOKEN: str = ""

    # 飞书配置
    FEISHU_WEBHOOK_URL: str = ""

    # 缓存版本配置
    # 当数据结构或分析逻辑变更时，需要更新此版本号
    # 旧版本的缓存会自动失效
    CACHE_VERSION: str = "v2"  # v2: 包含MA指标的正确数据

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
