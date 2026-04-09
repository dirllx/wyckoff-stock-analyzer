"""
a-share-mcp 数据源适配器
基于 a-share-mcp-server 项目，提供更稳定的A股数据获取
"""
import baostock as bs
import pandas as pd
from typing import List, Dict, Optional
from datetime import datetime
from loguru import logger


class MCPFetcher:
    """
    a-share-mcp 数据源获取器

    基于 https://github.com/firmmaple/a-share-mcp-server
    使用相同的 Baostock API，但提供更稳定的数据处理
    """

    def __init__(self):
        self.name = "mcp"
        self.display_name = "MCP (a-share-mcp)"

        # Baostock 字段映射
        self.kline_fields = [
            "date", "code", "open", "high", "low", "close", "preclose",
            "volume", "amount", "adjustflag", "turn", "tradestatus",
            "pctChg"
        ]

        self.basic_fields = [
            "code", "code_name", "industry", "area", "market",
            "listDate", "listStatus"
        ]

    def _login(self):
        """Baostock 登录"""
        lg = bs.login()
        if lg.error_code != '0':
            raise Exception(f"Baostock登录失败: {lg.error_msg}")
        return lg

    def get_stock_quotes(
        self,
        code: str,
        timeframe: str = "daily",
        start_date: str = None,
        end_date: str = None,
        adjustflag: str = "3"
    ) -> List[Dict]:
        """
        获取历史K线数据

        Args:
            code: 股票代码（支持 000001 或 sh.600000 格式）
            timeframe: 周期 (daily/weekly/monthly/5/15/30/60)
            start_date: 开始日期 YYYY-MM-DD
            end_date: 结束日期 YYYY-MM-DD
            adjustflag: 复权因子 (1=后复权, 2=前复权, 3=不复权)

        Returns:
            K线数据列表
        """
        # 转换股票代码格式
        bs_code = self._convert_code_to_baostock(code)

        # 转换周期参数
        frequency_map = {
            "daily": "d",
            "weekly": "w",
            "monthly": "m",
            "5": "5",
            "15": "15",
            "30": "30",
            "60": "60"
        }
        frequency = frequency_map.get(timeframe, "d")

        # 根据周期选择字段（周线/月线/分钟线不支持某些字段）
        if timeframe in ["weekly", "monthly"]:
            # 周线/月线：仅基础字段
            fields = "date,code,open,high,low,close,volume,amount,pctChg"
        elif timeframe in ["5", "15", "30", "60"]:
            # 分钟线：基础字段
            fields = "date,time,code,open,high,low,close,volume,amount,pctChg"
        else:
            # 日线：完整字段
            fields = "date,code,open,high,low,close,preclose,volume,amount,adjustflag,turn,tradestatus,pctChg"

        # 转换周期参数
        frequency_map = {
            "daily": "d",
            "weekly": "w",
            "monthly": "m",
            "5": "5",
            "15": "15",
            "30": "30",
            "60": "60"
        }
        frequency = frequency_map.get(timeframe, "d")

        # 设置默认日期
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            # 默认获取最近300天
            start_date = (datetime.now() - pd.Timedelta(days=300)).strftime("%Y-%m-%d")

        try:
            lg = self._login()

            # 获取K线数据
            rs = bs.query_history_k_data_plus(
                bs_code,
                fields,
                start_date=start_date,
                end_date=end_date,
                frequency=frequency,
                adjustflag=adjustflag
            )

            if rs.error_code != '0':
                if 'no data' in rs.error_msg.lower() or rs.error_code == '1002':
                    logger.warning(f"{bs_code} 没有数据: {rs.error_msg}")
                    return []
                else:
                    raise Exception(f"Baostock API错误: {rs.error_msg}")

            # 转换数据
            data_list = []
            while (rs.next()):
                data_list.append(rs.get_row_data())

            if not data_list:
                logger.warning(f"{bs_code} 返回空数据")
                return []

            df = pd.DataFrame(data_list, columns=rs.fields)

            # 转换为标准格式
            result = []
            for _, row in df.iterrows():
                # Baostock返回的date已经是字符串格式
                date_str = row["date"] if pd.notna(row["date"]) else ""

                result.append({
                    "date": date_str,
                    "time": row.get("time", ""),
                    "code": code,
                    "open": float(row["open"]) if pd.notna(row["open"]) and row["open"] else None,
                    "high": float(row["high"]) if pd.notna(row["high"]) and row["high"] else None,
                    "low": float(row["low"]) if pd.notna(row["low"]) and row["low"] else None,
                    "close": float(row["close"]) if pd.notna(row["close"]) and row["close"] else None,
                    "volume": float(row["volume"]) if pd.notna(row["volume"]) and row["volume"] else 0,
                    "amount": float(row["amount"]) if pd.notna(row["amount"]) and row["amount"] else 0,
                    "adjustflag": row.get("adjustflag", ""),
                    "turn": row.get("turn", ""),
                    "tradestatus": row.get("tradestatus", ""),
                    "pctChg": float(row.get("pctChg", 0)) if pd.notna(row.get("pctChg")) and row.get("pctChg") else 0
                })

            logger.info(f"MCP数据源: {code} 获取 {len(result)} 条数据 ({timeframe})")
            return result

        except Exception as e:
            logger.error(f"MCP数据源获取失败: {e}")
            raise

    def get_stock_basic_info(self, code: str) -> Dict:
        """
        获取股票基本信息

        Args:
            code: 股票代码

        Returns:
            股票基本信息字典
        """
        # 转换股票代码格式
        bs_code = self._convert_code_to_baostock(code)

        try:
            lg = self._login()

            rs = bs.query_stock_basic(code=bs_code)

            if rs.error_code != '0':
                raise Exception(f"Baostock API错误: {rs.error_msg}")

            data_list = []
            while (rs.next()):
                data_list.append(rs.get_row_data())

            if not data_list:
                raise Exception(f"股票 {code} 不存在")

            df = pd.DataFrame(data_list, columns=rs.fields)

            # 取第一条记录
            row = df.iloc[0]

            return {
                "code": code,
                "name": row.get("code_name", ""),
                "industry": row.get("industry", ""),
                "area": row.get("area", ""),
                "market": row.get("market", ""),
                "listDate": row.get("listDate", ""),
                "listStatus": row.get("listStatus", ""),
                "outstanding": row.get("outstanding", 0),
                "totals": row.get("totals", 0),
                "floats": row.get("floats", 0),
                "totalAssets": row.get("totalAssets", 0),
                "liquidAssets": row.get("liquidAssets", 0),
                "fixedAssets": row.get("fixedAssets", 0),
                "reserved": row.get("reserved", 0),
                "reservedPerShare": row.get("reservedPerShare", 0),
                "esp": row.get("esp", 0),
                "esp1": row.get("esp1", 0),
                "limitPer": row.get("limitPer", 0),
                "maxPer": row.get("maxPer", 0)
            }

        except Exception as e:
            logger.error(f"获取股票基本信息失败: {e}")
            raise

    def _convert_code_to_baostock(self, code: str) -> str:
        """
        转换股票代码为Baostock格式

        Args:
            code: 000001 或 sh.600000

        Returns:
            sh.600000 或 sz.000001
        """
        # 已经是 Baostock 格式
        if '.' in code:
            return code.lower()

        # 纯数字格式，需要添加前缀
        if len(code) == 6:
            if code.startswith('6'):
                return f"sh.{code}"
            elif code.startswith('0') or code.startswith('3'):
                return f"sz.{code}"
            else:
                # 默认上海
                return f"sh.{code}"

        return code

    def get_supported_timeframes(self) -> List[str]:
        """获取支持的时间周期"""
        return ["daily", "weekly", "monthly", "5", "15", "30", "60"]

    def get_priority(self, timeframe: str) -> int:
        """
        获取指定周期的优先级

        MCP数据源作为高质量数据源，优先级设置为 1
        """
        # MCP 数据源质量高，设置为最高优先级
        return 1


# 测试代码
if __name__ == "__main__":
    fetcher = MCPFetcher()

    # 测试获取K线数据
    print("测试获取平安银行K线数据...")
    data = fetcher.get_stock_quotes(
        code="000001",
        timeframe="daily",
        start_date="2024-01-01",
        end_date="2024-01-31"
    )
    print(f"获取到 {len(data)} 条数据")
    if data:
        print(f"第一条: {data[0]}")

    # 测试获取基本信息
    print("\n测试获取股票基本信息...")
    info = fetcher.get_stock_basic_info("000001")
    print(f"股票名称: {info['name']}")
    print(f"行业: {info['industry']}")
