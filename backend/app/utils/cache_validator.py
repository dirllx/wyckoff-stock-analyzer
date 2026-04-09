"""
缓存时效性验证工具

用于判断缓存数据是否需要更新
"""
from datetime import datetime, time, timedelta
from loguru import logger


class CacheValidator:
    """缓存时效性验证器"""

    # A股交易时间
    MORNING_START = time(9, 30)
    MORNING_END = time(11, 30)
    AFTERNOON_START = time(13, 0)
    AFTERNOON_END = time(15, 0)

    @staticmethod
    def is_trading_time(now: datetime = None) -> bool:
        """
        判断当前是否是交易时间

        Args:
            now: 当前时间，默认使用系统时间

        Returns:
            bool: True表示是交易时间
        """
        if now is None:
            now = datetime.now()

        # 周末不交易
        if now.weekday() >= 5:  # 5=周六, 6=周日
            return False

        current_time = now.time()

        # 检查是否在交易时段内
        is_morning = CacheValidator.MORNING_START <= current_time <= CacheValidator.MORNING_END
        is_afternoon = CacheValidator.AFTERNOON_START <= current_time <= CacheValidator.AFTERNOON_END

        return is_morning or is_afternoon

    @staticmethod
    def is_market_closed(now: datetime = None) -> bool:
        """
        判断市场是否已收盘

        Args:
            now: 当前时间，默认使用系统时间

        Returns:
            bool: True表示已收盘（非交易日或已过15:00）
        """
        if now is None:
            now = datetime.now()

        # 周末视为已收盘
        if now.weekday() >= 5:
            return True

        # 已过15:00视为收盘
        return now.time() >= CacheValidator.AFTERNOON_END

    @staticmethod
    def is_cache_fresh(timeframe: str, latest_date: datetime, now: datetime = None) -> bool:
        """
        判断缓存数据是否新鲜（是否需要更新）

        Args:
            timeframe: 时间周期 (daily, weekly, monthly, 30, 60)
            latest_date: 缓存中最新数据的日期时间
            now: 当前时间，默认使用系统时间

        Returns:
            bool: True表示缓存新鲜，不需要更新
        """
        if now is None:
            now = datetime.now()

        if latest_date is None:
            return False

        if timeframe == 'daily':
            return CacheValidator._is_daily_cache_fresh(latest_date, now)

        elif timeframe == 'weekly':
            return CacheValidator._is_weekly_cache_fresh(latest_date, now)

        elif timeframe == 'monthly':
            return CacheValidator._is_monthly_cache_fresh(latest_date, now)

        elif timeframe in ['30', '60']:
            return CacheValidator._is_minute_cache_fresh(timeframe, latest_date, now)

        else:
            logger.warning(f"未知的时间周期: {timeframe}")
            return False

    @staticmethod
    def _is_daily_cache_fresh(latest_date: datetime, now: datetime) -> bool:
        """
        判断日线缓存是否新鲜

        规则：
        1. 如果已过15:00，最新数据必须是今天
        2. 如果未过15:00，使用昨天数据也可以
        3. 周末使用周五数据
        """
        latest_day = latest_date.date()
        today = now.date()

        # 已过收盘时间，必须要有今天的数据
        if CacheValidator.is_market_closed(now):
            return latest_day >= today

        # 未过收盘时间，检查是否是今天或最近交易日
        if latest_day == today:
            return True

        # 如果今天是周一，检查周五的数据
        if now.weekday() == 0:  # 周一
            # 最新数据应该是上周五
            last_friday = today - timedelta(days=3)
            return latest_day >= last_friday

        # 其他情况，最新数据应该是昨天
        yesterday = today - timedelta(days=1)
        return latest_day >= yesterday

    @staticmethod
    def _is_weekly_cache_fresh(latest_date: datetime, now: datetime) -> bool:
        """
        判断周线缓存是否新鲜

        规则：
        1. 如果已过周五15:00，最新数据必须是本周
        2. 如果未过周五15:00，使用上周数据也可以
        """
        # 获取本周的周一
        week_start = now.date() - timedelta(days=now.weekday())

        # 已过周五收盘，检查是否有本周数据
        if now.weekday() >= 4 and now.time() >= CacheValidator.AFTERNOON_END:
            return latest_date.date() >= week_start

        # 未过周五收盘，检查是否有上周数据
        last_week_start = week_start - timedelta(days=7)
        return latest_date.date() >= last_week_start

    @staticmethod
    def _is_monthly_cache_fresh(latest_date: datetime, now: datetime) -> bool:
        """
        判断月线缓存是否新鲜

        规则：
        1. 如果已过月末收盘，最新数据必须是本月
        2. 如果未过月末收盘，使用上月数据也可以
        """
        current_month_start = now.date().replace(day=1)
        latest_month = latest_date.date().replace(day=1)

        # 简化判断：如果最新数据是本月或上月，视为新鲜
        # （月线更新频率低，不需要太严格）
        return latest_month >= current_month_start - timedelta(days=32)

    @staticmethod
    def _is_minute_cache_fresh(timeframe: str, latest_date: datetime, now: datetime) -> bool:
        """
        判断分钟线缓存是否新鲜

        规则：
        1. 仅在交易时间内判断
        2. 最新数据时间 >= 当前时间 - 周期时长
        3. 非交易时间不强制刷新

        Args:
            timeframe: '30' 或 '60'
            latest_date: 最新数据时间
            now: 当前时间
        """
        # 非交易时间，不过期
        if not CacheValidator.is_trading_time(now):
            return True

        # 计算允许的最大时间差（分钟）
        max_diff_minutes = int(timeframe)

        # 计算时间差
        time_diff = (now - latest_date).total_seconds() / 60

        # 如果时间差小于周期时长，视为新鲜
        # 例如：30分钟线，最新数据是19:45，现在是20:10，差25分钟，仍然新鲜
        return time_diff <= max_diff_minutes

    @staticmethod
    def should_refresh_cache(timeframe: str, latest_date: datetime = None, now: datetime = None) -> bool:
        """
        判断是否需要刷新缓存

        Args:
            timeframe: 时间周期
            latest_date: 缓存中最新数据的日期时间（None表示无缓存）
            now: 当前时间

        Returns:
            bool: True表示需要刷新
        """
        if latest_date is None:
            return True

        is_fresh = CacheValidator.is_cache_fresh(timeframe, latest_date, now)
        return not is_fresh

    @staticmethod
    def get_cache_status(timeframe: str, latest_date: datetime = None, now: datetime = None) -> dict:
        """
        获取缓存状态详情

        Returns:
            dict: 包含 is_fresh, should_refresh, reason 等信息
        """
        if now is None:
            now = datetime.now()

        if latest_date is None:
            return {
                'is_fresh': False,
                'should_refresh': True,
                'reason': '无缓存数据',
                'latest_date': None,
                'current_time': now
            }

        is_fresh = CacheValidator.is_cache_fresh(timeframe, latest_date, now)
        should_refresh = not is_fresh

        reason = ''
        if is_fresh:
            reason = '缓存数据新鲜，无需刷新'
        elif timeframe == 'daily':
            reason = f'日线数据过期（最新: {latest_date.strftime("%Y-%m-%d")}, 今天: {now.strftime("%Y-%m-%d")}）'
        elif timeframe in ['30', '60']:
            time_diff = int((now - latest_date).total_seconds() / 60)
            reason = f'{timeframe}分钟线数据过期（最新: {latest_date.strftime("%H:%M")}, 距今: {time_diff}分钟）'
        else:
            reason = f'{timeframe}数据需要更新'

        return {
            'is_fresh': is_fresh,
            'should_refresh': should_refresh,
            'reason': reason,
            'latest_date': latest_date,
            'current_time': now,
            'timeframe': timeframe
        }
