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
    DEBUG: bool = True

    # Tushare配置
    TUSHARE_TOKEN: str = ""

    # 飞书配置
    FEISHU_WEBHOOK_URL: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
