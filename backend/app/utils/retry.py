"""
网络重试工具
处理akshare等外部数据源的网络不稳定问题
"""
import time
import functools
from typing import Callable, Type, Tuple, Optional
from loguru import logger


def retry_on_network_error(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (
        Exception,  # 捕获所有异常，在装饰器中过滤
    )
) -> Callable:
    """
    网络重试装饰器 - 使用指数退避策略

    Args:
        max_retries: 最大重试次数（默认3次）
        initial_delay: 初始延迟时间（秒）
        backoff_factor: 退避因子（每次重试延迟时间翻倍）
        exceptions: 需要重试的异常类型

    Returns:
        装饰器函数

    示例:
        @retry_on_network_error(max_retries=3)
        def fetch_data():
            return ak.stock_zh_a_hist(...)
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    result = func(*args, **kwargs)

                    # 如果是重试后成功的，记录日志
                    if attempt > 0:
                        logger.info(
                            f"✅ {func.__name__} 重试成功 "
                            f"(第{attempt}次重试)"
                        )

                    return result

                except Exception as e:
                    last_exception = e
                    error_msg = str(e).lower()

                    # 检查是否是网络相关的错误
                    is_network_error = any(
                        keyword in error_msg
                        for keyword in [
                            'connection',
                            'timeout',
                            'proxy',
                            'remote',
                            'network',
                            'ssl',
                            'certificate',
                            'max retries',  # urllib3的错误
                            'temporary failure',
                        ]
                    )

                    # 如果不是网络错误或者是最后一次尝试，直接抛出
                    if not is_network_error or attempt >= max_retries:
                        logger.error(
                            f"❌ {func.__name__} 失败 "
                            f"({attempt + 1}/{max_retries + 1}次尝试): {e}"
                        )
                        raise

                    # 记录重试日志
                    logger.warning(
                        f"⚠️ {func.__name__} 网络错误，"
                        f"{delay}秒后重试 ({attempt + 1}/{max_retries + 1}): {e}"
                    )

                    # 等待后重试
                    time.sleep(delay)
                    delay *= backoff_factor

            # 理论上不会到这里，但为了类型检查器
            raise last_exception

        return wrapper

    return decorator


class RetryStats:
    """重试统计工具"""

    def __init__(self):
        self.retry_counts = {}
        self.success_counts = {}

    def record_retry(self, func_name: str):
        """记录重试"""
        if func_name not in self.retry_counts:
            self.retry_counts[func_name] = 0
        self.retry_counts[func_name] += 1

    def record_success(self, func_name: str):
        """记录成功"""
        if func_name not in self.success_counts:
            self.success_counts[func_name] = 0
        self.success_counts[func_name] += 1

    def get_stats(self) -> dict:
        """获取统计信息"""
        return {
            "retry_counts": self.retry_counts,
            "success_counts": self.success_counts,
        }

    def log_summary(self):
        """记录统计摘要"""
        total_retries = sum(self.retry_counts.values())
        total_success = sum(self.success_counts.values())

        if total_retries > 0:
            logger.info(
                f"📊 网络重试统计: "
                f"总重试次数={total_retries}, "
                f"总成功次数={total_success}"
            )

            # 详细统计
            for func_name, count in self.retry_counts.items():
                success_count = self.success_counts.get(func_name, 0)
                logger.info(
                    f"  - {func_name}: 重试{count}次, 成功{success_count}次"
                )


# 全局重试统计实例
retry_stats = RetryStats()
