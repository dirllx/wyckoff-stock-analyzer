"""
Ashare数据获取器 - 基于Sina和腾讯API
无需登录，速度快，不受代理影响
"""
import json
import time
from datetime import datetime, date
from typing import Optional, List, Dict

import pandas as pd
import requests
from loguru import logger


class AshareFetcher:
    """
    Ashare数据获取器
    使用Sina和腾讯公开API获取A股K线数据
    """

    # API endpoints
    SINA_KLINE_URL = "http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData"
    TENCENT_DAY_URL = "http://web.ifzq.gtimg.cn/appstock/app/fqkline/get"
    TENCENT_MIN_URL = "http://ifzq.gtimg.cn/appstock/app/kline/mkline"

    TIMEOUT = 30  # 增加超时时间到30秒

    # 频率映射
    SINA_FREQ_MAP = {
        '5': 5,
        '15': 15,
        '30': 30,
        '60': 60,
        'daily': 240,
        'weekly': 1200,
        'monthly': 7200,
    }

    TENCENT_DAY_FREQ_MAP = {
        'daily': 'day',
        'weekly': 'week',
        'monthly': 'month',
    }

    def __init__(self):
        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })

    @staticmethod
    def normalize_code(code: str) -> str:
        """转换股票代码为Ashare格式"""
        code = code.strip()

        # JoinQuant格式
        if '.XSHG' in code:
            return 'sh' + code.replace('.XSHG', '')
        if '.XSHE' in code:
            return 'sz' + code.replace('.XSHE', '')

        # Baostock格式
        if '.' in code:
            parts = code.split('.')
            if len(parts) == 2:
                prefix, suffix = parts[0].lower(), parts[1]
                if prefix in ('sh', 'sz') and suffix.isdigit():
                    return f"{prefix}{suffix}"

        # 已正确格式
        if code.startswith('sh') or code.startswith('sz'):
            return code.lower()

        # 纯数字：判断交易所
        if code.isdigit():
            if code.startswith('6'):
                return f"sh{code}"
            elif code.startswith(('0', '2', '3')):
                return f"sz{code}"

        return code.lower()

    def get_stock_quotes(
        self,
        code: str,
        timeframe: str,
        start_date: str,
        end_date: str = None
    ) -> List[Dict]:
        """
        获取K线数据

        Args:
            code: 股票代码
            timeframe: 时间周期 (daily/weekly/monthly/5/15/30/60)
            start_date: 开始日期 (参考用)
            end_date: 结束日期 (参考用)

        Returns:
            K线数据列表
        """
        normalized_code = self.normalize_code(code)

        # 确定获取数量
        if timeframe in ('5', '15', '30', '60'):
            count = 320
        else:
            count = 500

        end = end_date or datetime.now().strftime("%Y-%m-%d")

        logger.info(f"Ashare获取: {code} ({timeframe})")

        # 日线/周线/月线: 先Sina后腾讯
        if timeframe in ('daily', 'weekly', 'monthly'):
            df = self._get_sina_data(normalized_code, end, count, timeframe)
            if df is not None and not df.empty:
                return self._df_to_list(df)

            df = self._get_tencent_day(normalized_code, end, count, timeframe)
            if df is not None and not df.empty:
                return self._df_to_list(df)

        # 分钟线: 腾讯
        elif timeframe in ('5', '15', '30', '60'):
            df = self._get_sina_data(normalized_code, end, count, timeframe)
            if df is not None and not df.empty:
                return self._df_to_list(df)

            df = self._get_tencent_min(normalized_code, count, timeframe)
            if df is not None and not df.empty:
                return self._df_to_list(df)

        raise ValueError(f"未获取到数据: {code} {timeframe}")

    def _get_sina_data(
        self, code: str, end_date: str, count: int, frequency: str
    ) -> Optional[pd.DataFrame]:
        """从Sina获取数据"""
        freq_min = self.SINA_FREQ_MAP.get(frequency, 240)

        params = {
            "symbol": code,
            "scale": freq_min,
            "ma": 5,
            "datalen": count,
        }

        # 重试机制
        for attempt in range(3):
            try:
                resp = self._session.get(self.SINA_KLINE_URL, params=params, timeout=self.TIMEOUT)
                data = json.loads(resp.content)

                if not data or isinstance(data, dict):
                    return None

                df = pd.DataFrame(data, columns=['day', 'open', 'high', 'low', 'close', 'volume'])
                df['open'] = df['open'].astype(float)
                df['high'] = df['high'].astype(float)
                df['low'] = df['low'].astype(float)
                df['close'] = df['close'].astype(float)
                df['volume'] = df['volume'].astype(float)
                df['day'] = pd.to_datetime(df['day'])
                df = df.set_index('day')
                df.index.name = ''

                return df

            except Exception as e:
                logger.debug(f"Sina获取失败 (尝试 {attempt + 1}/3): {e}")
                if attempt < 2:
                    time.sleep(1)  # 等待1秒后重试
                else:
                    logger.warning(f"Sina获取最终失败: {e}")
                    return None

    def _get_tencent_day(
        self, code: str, end_date: str, count: int, frequency: str
    ) -> Optional[pd.DataFrame]:
        """从腾讯获取日线数据"""
        unit = self.TENCENT_DAY_FREQ_MAP.get(frequency, 'day')

        if end_date == datetime.now().strftime('%Y-%m-%d'):
            end_date = ''

        url = f"{self.TENCENT_DAY_URL}?param={code},{unit},,{end_date},{count},qfq"

        # 重试机制
        for attempt in range(3):
            try:
                resp = self._session.get(url, timeout=self.TIMEOUT)
                st = json.loads(resp.content)

                if 'data' not in st or code not in st['data']:
                    return None

                stk = st['data'][code]
                ms = 'qfq' + unit
                buf = stk[ms] if ms in stk else stk.get(unit)

                if not buf:
                    return None

                df = pd.DataFrame(buf, columns=['time', 'open', 'close', 'high', 'low', 'volume'], dtype='float')
                df['time'] = pd.to_datetime(df['time'])
                df = df.set_index('time')
                df.index.name = ''

                return df

            except Exception as e:
                logger.debug(f"腾讯日线获取失败 (尝试 {attempt + 1}/3): {e}")
                if attempt < 2:
                    time.sleep(1)
                else:
                    logger.warning(f"腾讯日线获取最终失败: {e}")
                    return None

    def _get_tencent_min(
        self, code: str, count: int, frequency: str
    ) -> Optional[pd.DataFrame]:
        """从腾讯获取分钟线数据"""
        ts = int(frequency) if frequency.isdigit() else 5
        url = f"{self.TENCENT_MIN_URL}?param={code},m{ts},,{count}"

        try:
            resp = self._session.get(url, timeout=self.TIMEOUT)
            st = json.loads(resp.content)

            if 'data' not in st or code not in st['data']:
                return None

            mkey = 'm' + str(ts)
            buf = st['data'][code].get(mkey)
            if not buf:
                return None

            df = pd.DataFrame(buf, columns=['time', 'open', 'close', 'high', 'low', 'volume', 'n1', 'n2'])
            df = df[['time', 'open', 'close', 'high', 'low', 'volume']]
            df[['open', 'close', 'high', 'low', 'volume']] = df[['open', 'close', 'high', 'low', 'volume']].astype(float)
            df['time'] = pd.to_datetime(df['time'])
            df = df.set_index('time')
            df.index.name = ''

            # 更新最新价
            if 'qt' in st['data'][code] and code in st['data'][code]['qt']:
                try:
                    df['close'].iloc[-1] = float(st['data'][code]['qt'][code][3])
                except Exception:
                    pass

            return df

        except Exception as e:
            logger.debug(f"腾讯分钟线获取失败: {e}")
            return None

    def _df_to_list(self, df: pd.DataFrame) -> List[Dict]:
        """DataFrame转字典列表"""
        df = df.reset_index()
        # 处理空列名（索引被设为空字符串的情况）
        new_columns = []
        for c in df.columns:
            if c == '' or c == ' ':
                # 第一列通常是日期
                new_columns.append('date')
            else:
                new_columns.append(c.lower() if isinstance(c, str) else c)
        df.columns = new_columns

        # 转换为字典列表，并处理日期和numpy类型
        records = []
        for _, row in df.iterrows():
            record = {}
            for col in df.columns:
                val = row[col]
                # 处理空值
                if pd.isna(val):
                    record[col] = None
                # 处理 Timestamp 类型
                elif isinstance(val, pd.Timestamp):
                    record[col] = val.strftime('%Y-%m-%d %H:%M:%S')
                # 处理 numpy 数值类型
                elif hasattr(val, 'item'):  # numpy 类型
                    record[col] = val.item()
                else:
                    record[col] = val
            records.append(record)

        return records

    def get_stock_info(self, code: str) -> Dict:
        """获取股票基本信息"""
        return {
            "code": code,
            "name": "",
            "market": "A股",
            "industry": ""
        }
