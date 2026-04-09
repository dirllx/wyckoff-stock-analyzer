"""
智能数据源调度器
支持多数据源优先级配置、自动测速、故障降级
"""
import asyncio
import time
import yaml
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from pathlib import Path
from loguru import logger
from functools import wraps
from collections import defaultdict

from app.services.data.data_fetcher import DataFetcher
from app.services.data.baostock_fetcher import BaostockFetcher
from app.services.data.easyquotation_fetcher import EasyquotationFetcher
from app.services.data.ashare_fetcher import AshareFetcher
from app.services.data.mcp_fetcher import MCPFetcher


def measure_time(func):
    """测量函数执行时间"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = (time.time() - start) * 1000  # 毫秒
        return result, elapsed
    return wrapper


class DataSourceStats:
    """数据源统计信息"""

    def __init__(self, name: str):
        self.name = name
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.response_times = []  # 最近100次响应时间
        self.last_success_time: Optional[datetime] = None
        self.last_failure_time: Optional[datetime] = None
        self.last_error: Optional[str] = None

    def record_success(self, response_time_ms: float):
        """记录成功请求"""
        self.total_requests += 1
        self.successful_requests += 1
        self.response_times.append(response_time_ms)
        if len(self.response_times) > 100:
            self.response_times.pop(0)
        self.last_success_time = datetime.now()

    def record_failure(self, error: str):
        """记录失败请求"""
        self.total_requests += 1
        self.failed_requests += 1
        self.last_failure_time = datetime.now()
        self.last_error = error

    @property
    def success_rate(self) -> float:
        """成功率"""
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests

    @property
    def avg_response_time(self) -> float:
        """平均响应时间（毫秒）"""
        if not self.response_times:
            return 0
        return sum(self.response_times) / len(self.response_times)

    @property
    def is_available(self) -> bool:
        """是否可用（成功率>50%）"""
        return self.success_rate > 0.5

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            "name": self.name,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": f"{self.success_rate * 100:.2f}%",
            "avg_response_time_ms": round(self.avg_response_time, 2),
            "last_success_time": self.last_success_time.isoformat() if self.last_success_time else None,
            "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "last_error": self.last_error,
            "is_available": self.is_available
        }


class SourceScheduler:
    """数据源调度器"""

    def __init__(self, config_path: str = None):
        """
        初始化调度器

        Args:
            config_path: 配置文件路径
        """
        if config_path is None:
            config_path = Path(__file__).parent.parent.parent / "config" / "data_sources.yaml"

        self.config_path = Path(config_path)
        self.config = self._load_config()

        # 初始化数据源
        self.sources: Dict[str, Any] = {
            "mcp": MCPFetcher(),                  # a-share-mcp数据源，基于Baostock，高质量数据
            "ashare": AshareFetcher(),           # Sina/腾讯API，无需登录，速度快
            "baostock": BaostockFetcher(),       # 备用数据源
            "akshare": DataFetcher(),            # 东方财富，可能被代理拦截
            "easyquotation": EasyquotationFetcher(source="sina"),  # 实时行情
        }

        # 初始化统计
        self.stats: Dict[str, DataSourceStats] = {
            name: DataSourceStats(name)
            for name in self.sources.keys()
        }

        # 测速缓存
        self.speed_test_cache: Dict[str, Dict[str, float]] = {}  # {timeframe: {source: time}}

        # 启动自动测速任务（仅在事件循环运行时）
        # 注意：在非async上下文中初始化调度器时会跳过
        try:
            loop = asyncio.get_running_loop()
            if self.config.get("global", {}).get("auto_speed_test", False):
                self._start_speed_test_task()
        except RuntimeError:
            # 没有运行中的事件循环，跳过自动测速任务
            pass

    def _load_config(self) -> dict:
        """加载配置文件"""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.warning(f"加载配置文件失败: {e}，使用默认配置")
            return self._default_config()

    def _default_config(self) -> dict:
        """默认配置"""
        return {
            "global": {"auto_speed_test": False},
            "sources": {
                "ashare": {"enabled": True, "priority": 1},
                "mcp": {"enabled": True, "priority": 2},
                "baostock": {"enabled": True, "priority": 3},
                "akshare": {"enabled": True, "priority": 4}
            },
            "scheduling": {"strategy": "priority", "auto_fallback": True},
            "timeframe_priority": {
                "daily": ["ashare", "mcp", "baostock", "akshare"],
                "weekly": ["ashare", "mcp", "baostock", "akshare"],
                "monthly": ["ashare", "mcp", "baostock", "akshare"],
                "30": ["ashare", "mcp", "baostock", "akshare"],
                "60": ["ashare", "mcp", "baostock", "akshare"],
                "15": ["ashare", "mcp", "baostock", "akshare"],
                "5": ["ashare", "mcp", "baostock", "akshare"]
            }
        }

    def get_priority_list(self, timeframe: str) -> List[str]:
        """
        获取指定周期的数据源优先级列表

        Args:
            timeframe: 时间周期

        Returns:
            数据源名称列表（按优先级排序）
        """
        # 1. 优先使用周期特定配置
        timeframe_priority = self.config.get("timeframe_priority", {})
        if timeframe in timeframe_priority:
            priority_list = timeframe_priority[timeframe]
            # 过滤未启用的数据源
            enabled_sources = [
                s for s in priority_list
                if self.config["sources"].get(s, {}).get("enabled", True)
            ]
            if enabled_sources:
                return enabled_sources

        # 2. 使用各数据源的周期特定配置
        sources_config = self.config.get("sources", {})
        source_priorities = []

        for source_name, source_config in sources_config.items():
            if not source_config.get("enabled", True):
                continue

            # 检查是否支持该周期
            supported = source_config.get("supported_timeframes", [])
            if timeframe not in supported:
                continue

            # 获取周期特定优先级
            timeframe_cfg = source_config.get("timeframe_config", {}).get(timeframe, {})
            priority = timeframe_cfg.get("priority", source_config.get("priority", 999))

            source_priorities.append((priority, source_name))

        # 按优先级排序
        source_priorities.sort(key=lambda x: x[0])
        return [name for _, name in source_priorities]

    def fetch_with_fallback(
        self,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str = None,
        max_attempts: int = 0
    ) -> List[Dict]:
        """
        使用数据源获取数据，支持自动降级

        Args:
            code: 股票代码
            timeframe: 时间周期
            start_date: 开始日期
            end_date: 结束日期
            max_attempts: 最大尝试次数（0表示尝试所有）

        Returns:
            K线数据列表
        """
        priority_list = self.get_priority_list(timeframe)

        if not priority_list:
            raise ValueError(f"没有支持周期 {timeframe} 的数据源")

        logger.info(f"数据源优先级列表 ({timeframe}): {priority_list}")

        attempts = 0
        last_error = None

        for source_name in priority_list:
            if max_attempts > 0 and attempts >= max_attempts:
                break

            attempts += 1
            source = self.sources.get(source_name)

            if not source:
                logger.warning(f"数据源 {source_name} 未初始化，跳过")
                continue

            try:
                logger.info(f"尝试使用 {source_name} 获取数据...")

                # 调用数据源（同步方法，不需要await）
                if source_name == "mcp":
                    data, elapsed = self._fetch_from_mcp(
                        source, code, timeframe, start_date, end_date
                    )
                elif source_name == "ashare":
                    data, elapsed = self._fetch_from_ashare(
                        source, code, timeframe, start_date, end_date
                    )
                elif source_name == "akshare":
                    data, elapsed = self._fetch_from_akshare(
                        source, code, timeframe, start_date, end_date
                    )
                elif source_name == "baostock":
                    data, elapsed = self._fetch_from_baostock(
                        source, code, timeframe, start_date, end_date
                    )
                elif source_name == "easyquotation":
                    data, elapsed = self._fetch_from_easyquotation(
                        source, code, timeframe, start_date, end_date
                    )
                else:
                    raise NotImplementedError(f"未实现的数据源: {source_name}")

                # 检查数据是否为空
                if data is None or (hasattr(data, '__len__') and len(data) == 0):
                    last_error = Exception(f"{source_name} 返回空数据")
                    self.stats[source_name].record_failure(str(last_error))
                    logger.warning(f"❌ {source_name} 返回空数据，尝试下一个数据源")
                    continue

                # 记录成功
                self.stats[source_name].record_success(elapsed)
                logger.success(f"✅ {source_name} 成功获取 {len(data)} 条数据，耗时 {elapsed:.0f}ms")

                return data

            except Exception as e:
                last_error = e
                self.stats[source_name].record_failure(str(e))
                logger.warning(f"❌ {source_name} 获取失败: {e}，尝试下一个数据源")

                # 如果不是最后一次尝试，继续降级
                continue

        # 所有数据源都失败
        raise Exception(f"所有数据源获取失败，最后错误: {last_error}")

    def _fetch_from_ashare(
        self,
        fetcher: AshareFetcher,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str
    ) -> tuple[List[Dict], float]:
        """从Ashare获取数据（同步方法）"""
        start = time.time()

        data = fetcher.get_stock_quotes(
            code=code,
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date or datetime.now().strftime("%Y-%m-%d")
        )

        elapsed = (time.time() - start) * 1000
        return data, elapsed

    def _fetch_from_mcp(
        self,
        fetcher: MCPFetcher,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str
    ) -> tuple[List[Dict], float]:
        """从MCP获取数据（同步方法）"""
        start = time.time()

        data = fetcher.get_stock_quotes(
            code=code,
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date or datetime.now().strftime("%Y-%m-%d")
        )

        elapsed = (time.time() - start) * 1000
        return data, elapsed

    def _fetch_from_akshare(
        self,
        fetcher: DataFetcher,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str
    ) -> tuple[List[Dict], float]:
        """从akshare获取数据（同步方法）"""
        from app.utils.converters import dataframe_to_dict

        start = time.time()

        # 转换周期参数（akshare使用period参数）
        period_map = {
            "daily": "daily",
            "weekly": "weekly",
            "monthly": "monthly",
            "1": "1",
            "5": "5",
            "15": "15",
            "30": "30",
            "60": "60"
        }

        period = period_map.get(timeframe, timeframe)

        # 转换日期格式（akshare使用YYYYMMDD格式）
        start_date_formatted = start_date.replace("-", "")
        end_date_formatted = (end_date or datetime.now().strftime("%Y-%m-%d")).replace("-", "")

        # akshare的get_stock_quotes是同步方法，不需要await
        df = fetcher.get_stock_quotes(
            code=code,
            period=period,
            start_date=start_date_formatted,
            end_date=end_date_formatted
        )

        # 转换DataFrame为List[Dict]
        data = dataframe_to_dict(df)

        elapsed = (time.time() - start) * 1000
        return data, elapsed

    def _fetch_from_baostock(
        self,
        fetcher: BaostockFetcher,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str
    ) -> tuple[List[Dict], float]:
        """从Baostock获取数据（同步方法）"""
        start = time.time()

        data = fetcher.get_stock_quotes(
            code=code,
            timeframe=timeframe,
            start_date=start_date,
            end_date=end_date or datetime.now().strftime("%Y-%m-%d")
        )

        elapsed = (time.time() - start) * 1000
        return data, elapsed

    def _fetch_from_easyquotation(
        self,
        fetcher: EasyquotationFetcher,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str
    ) -> tuple[List[Dict], float]:
        """从Easyquotation获取数据（同步方法）"""
        start = time.time()

        # Easyquotation不支持历史K线数据
        # 如果请求的是历史K线，抛出异常让调度器跳过
        if timeframe != "realtime":
            raise NotImplementedError(
                f"Easyquotation不支持{timeframe}周期，仅支持实时行情(realtime)"
            )

        # 获取实时行情
        realtime_data = fetcher.get_realtime_quotes([code])

        # 转换为标准格式（单条数据）
        if code in realtime_data:
            quote = realtime_data[code]
            data = [{
                "date": quote.get("date", datetime.now().strftime("%Y-%m-%d")),
                "time": quote.get("time", ""),
                "open": quote["open"],
                "high": quote["high"],
                "low": quote["low"],
                "close": quote["close"],
                "volume": quote["volume"],
                "amount": quote.get("amount", 0)
            }]
        else:
            data = []

        elapsed = (time.time() - start) * 1000
        return data, elapsed

    async def speed_test(
        self,
        code: str = "000001",
        timeframes: List[str] = None
    ) -> Dict[str, Dict[str, float]]:
        """
        测试所有数据源速度

        Args:
            code: 测试用股票代码
            timeframes: 测试的周期列表

        Returns:
            {timeframe: {source: response_time_ms}}
        """
        if timeframes is None:
            timeframes = ["daily", "weekly", "monthly"]

        results = {}

        for timeframe in timeframes:
            results[timeframe] = {}

            for source_name in self.sources.keys():
                source = self.sources[source_name]

                # 检查是否支持该周期
                source_config = self.config["sources"].get(source_name, {})
                supported = source_config.get("supported_timeframes", [])
                if timeframe not in supported:
                    continue

                try:
                    logger.info(f"测速: {source_name} - {timeframe}")

                    start = time.time()

                    # 测试获取少量数据
                    if source_name == "akshare":
                        await source.get_stock_quotes(
                            code=code,
                            timeframe=timeframe,
                            start_date="2024-01-01",
                            end_date="2024-01-31"
                        )
                    elif source_name == "baostock":
                        source.get_stock_quotes(
                            code=code,
                            timeframe=timeframe,
                            start_date="2024-01-01",
                            end_date="2024-01-31"
                        )

                    elapsed = (time.time() - start) * 1000
                    results[timeframe][source_name] = elapsed

                    logger.success(f"✅ {source_name} - {timeframe}: {elapsed:.0f}ms")

                except Exception as e:
                    logger.warning(f"❌ {source_name} - {timeframe}: {e}")
                    results[timeframe][source_name] = -1  # 失败标记

        # 更新缓存
        self.speed_test_cache = results

        # 如果启用自动排序，更新配置
        if self.config.get("scheduling", {}).get("strategy") == "speed_based":
            self._auto_reorder_by_speed(results)

        return results

    def _auto_reorder_by_speed(self, speed_results: Dict[str, Dict[str, float]]):
        """根据测速结果自动排序数据源优先级"""
        logger.info("根据测速结果自动排序数据源...")

        for timeframe, source_times in speed_results.items():
            # 过滤失败的数据源
            valid_sources = {
                k: v for k, v in source_times.items()
                if v > 0
            }

            # 按速度排序
            sorted_sources = sorted(
                valid_sources.items(),
                key=lambda x: x[1]
            )

            # 更新配置
            priority_list = [name for name, _ in sorted_sources]
            self.config.setdefault("timeframe_priority", {})[timeframe] = priority_list

            logger.info(f"{timeframe} 优先级更新为: {priority_list}")

    def _start_speed_test_task(self):
        """启动自动测速任务"""
        interval = self.config.get("speed_test", {}).get("interval", 3600)

        async def run_speed_test():
            while True:
                try:
                    await asyncio.sleep(interval)
                    test_stock = self.config.get("speed_test", {}).get("test_stock", "000001")
                    test_timeframes = self.config.get("speed_test", {}).get("test_timeframes", ["daily", "weekly"])

                    logger.info("开始自动测速...")
                    await self.speed_test(test_stock, test_timeframes)
                    logger.info("自动测速完成")

                except Exception as e:
                    logger.error(f"自动测速失败: {e}")

        # 在后台运行
        asyncio.create_task(run_speed_test())

    def get_stats(self) -> Dict[str, dict]:
        """获取所有数据源的统计信息"""
        return {
            name: stats.to_dict()
            for name, stats in self.stats.items()
        }

    def get_config(self) -> dict:
        """获取当前配置"""
        return self.config

    def reload_config(self):
        """重新加载配置文件"""
        logger.info("重新加载配置文件...")
        self.config = self._load_config()
        logger.info("配置文件已重新加载")

    def update_priority(self, timeframe: str, priority_list: List[str]):
        """
        手动更新数据源优先级

        Args:
            timeframe: 时间周期
            priority_list: 数据源优先级列表
        """
        self.config.setdefault("timeframe_priority", {})[timeframe] = priority_list
        logger.info(f"已更新 {timeframe} 的数据源优先级: {priority_list}")

    def save_config(self):
        """保存当前配置到文件"""
        with open(self.config_path, 'w', encoding='utf-8') as f:
            yaml.dump(self.config, f, allow_unicode=True)
        logger.info(f"配置已保存到 {self.config_path}")


# 全局单例
_scheduler: Optional[SourceScheduler] = None


def get_scheduler() -> SourceScheduler:
    """获取调度器单例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = SourceScheduler()
    return _scheduler
