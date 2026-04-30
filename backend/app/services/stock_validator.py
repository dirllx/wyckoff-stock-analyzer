"""
股票代码验证服务
提供股票代码格式验证、股票信息查询等功能
"""
import re
from typing import Optional, Dict, List
from loguru import logger
import akshare as ak
import pandas as pd


class StockValidator:
    """股票代码验证器"""

    # A股代码格式
    # 上海: 600xxx, 601xxx, 603xxx, 605xxx, 688xxx (科创板)
    # 深圳: 000xxx, 001xxx, 002xxx, 003xxx, 300xxx (创业板)
    # ETF/基金: 5xxxxx, 15xxxx, 16xxxx 等
    CODE_PATTERNS = {
        'sh_main': re.compile(r'^60[0-9]{4}$'),      # 沪市主板
        'sh_kcb': re.compile(r'^688[0-9]{3}$'),      # 科创板
        'sz_main': re.compile(r'^00[0-2][0-9]{3}$'),  # 深市主板
        'sz_cyb': re.compile(r'^300[0-9]{3}$'),       # 创业板
        'etf': re.compile(r'^[5][0-9]{5}$'),         # ETF/基金 (5xxxxx)
        'etf_15': re.compile(r'^15[0-9]{4}$'),       # ETF/基金 (15xxxx)
        'etf_16': re.compile(r'^16[0-9]{4}$'),       # ETF/基金 (16xxxx)
        'bj': re.compile(r'^8[0-9]{4}$'),             # 北交所
        'hk': re.compile(r'^HK?[0-9]{4,5}$'),         # 港股
    }

    # 市场前缀映射
    MARKET_PREFIXES = {
        'sh': ['600', '601', '603', '605', '688'],
        'sz': ['000', '001', '002', '003', '300'],
        'bj': ['8'],
        'hk': []
    }

    def __init__(self):
        """初始化验证器"""
        self._stock_list_cache: Optional[pd.DataFrame] = None
        self._cache_loaded = False

    def validate_format(self, code: str) -> Dict[str, any]:
        """
        验证股票代码格式

        Args:
            code: 股票代码

        Returns:
            验证结果字典
            {
                "valid": bool,
                "market": str,  # sh/sz/bj/hk/unknown
                "board": str,   # main/kcb/cyb/unknown
                "message": str
            }
        """
        code = code.upper().replace('SH', '').replace('SZ', '')

        # 检查纯数字
        if not code.isdigit():
            return {
                "valid": False,
                "market": "unknown",
                "board": "unknown",
                "message": f"股票代码格式错误: {code}，应为6位数字"
            }

        # 检查长度
        if len(code) != 6:
            return {
                "valid": False,
                "market": "unknown",
                "board": "unknown",
                "message": f"股票代码长度错误: {code}，应为6位数字"
            }

        # 检查各个板块
        for board_name, pattern in self.CODE_PATTERNS.items():
            if pattern.match(code):
                market = self._get_market_from_board(board_name)
                board = self._get_board_name(board_name)
                return {
                    "valid": True,
                    "market": market,
                    "board": board,
                    "message": f"格式正确: {market}市场 {board}"
                }

        return {
            "valid": False,
            "market": "unknown",
            "board": "unknown",
            "message": f"未知的股票代码格式: {code}"
        }

    def _get_market_from_board(self, board: str) -> str:
        """从板块名称获取市场"""
        mapping = {
            'sh_main': 'sh',
            'sh_kcb': 'sh',
            'sz_main': 'sz',
            'sz_cyb': 'sz',
            'etf': 'etf',
            'etf_15': 'etf',
            'etf_16': 'etf',
            'bj': 'bj',
            'hk': 'hk'
        }
        return mapping.get(board, 'unknown')

    def _get_board_name(self, board: str) -> str:
        """获取板块中文名称"""
        mapping = {
            'sh_main': '沪市主板',
            'sh_kcb': '科创板',
            'sz_main': '深市主板',
            'sz_cyb': '创业板',
            'etf': 'ETF/基金',
            'etf_15': 'ETF/基金',
            'etf_16': 'ETF/基金',
            'bj': '北交所',
            'hk': '港股'
        }
        return mapping.get(board, '未知')

    def stock_exists(self, code: str) -> Dict[str, any]:
        """
        检查股票代码是否存在

        Args:
            code: 股票代码

        Returns:
            检查结果
            {
                "exists": bool,
                "name": str,   # 股票名称
                "market": str,
                "message": str
            }
        """
        # 先验证格式
        format_result = self.validate_format(code)
        if not format_result["valid"]:
            return {
                "exists": False,
                "name": None,
                "market": None,
                "message": format_result["message"]
            }

        code = code.upper().replace('SH', '').replace('SZ', '')
        market = format_result["market"]
        board = format_result.get("board", "")

        # 对于科创板和创业板，直接返回True，不查询akshare（避免超时）
        # 让数据源在获取数据时验证是否真的存在
        if board in ["科创板", "创业板", "沪市主板", "深市主板"]:
            return {
                "exists": True,
                "name": None,  # 让数据源获取名称
                "market": market,
                "message": f"代码格式正确: {code} ({board})"
            }

        try:
            # 根据市场选择查询方法
            if market == "sh":
                # 上海市场
                symbol = f"sh{code}"
            elif market == "sz":
                # 深圳市场
                symbol = f"sz{code}"
            else:
                # 其他市场尝试直接查询
                symbol = code

            # 尝试获取单只股票信息
            try:
                stock_info = ak.stock_individual_info_em(symbol=symbol)
                if not stock_info.empty:
                    name = stock_info.iloc[0, 0]  # 获取股票名称
                    # 处理名称（去掉多余字符）
                    if isinstance(name, str):
                        name = name.strip()
                    return {
                        "exists": True,
                        "name": name,
                        "market": market,
                        "message": f"股票存在: {code} {name}"
                    }
            except Exception:
                pass

            # 如果单只股票查询失败，尝试从股票列表中查找
            stock_list = self._get_stock_list()
            if stock_list is not None:
                match = stock_list[stock_list['code'] == code]
                if not match.empty:
                    name = match.iloc[0]['name']
                    return {
                        "exists": True,
                        "name": name,
                        "market": market,
                        "message": f"股票存在: {code} {name}"
                    }

            # ETF特殊处理：如果可能是ETF代码，尝试从ETF列表中查找
            if market == "etf" or code.startswith(('5', '15', '16')):
                try:
                    etf_list = ak.fund_etf_spot_em()
                    match = etf_list[etf_list['代码'] == code]
                    if not match.empty:
                        name = match.iloc[0]['名称']
                        return {
                            "exists": True,
                            "name": name,
                            "market": "etf",
                            "message": f"ETF/基金存在: {code} {name}"
                        }
                except Exception as e:
                    logger.debug(f"ETF列表查询失败: {e}")

            # 未找到，但如果是有效格式的代码，仍然返回可能存在
            # 让数据源去验证是否真的有数据
            return {
                "exists": True,  # 假设存在，让实际数据获取时验证
                "name": None,
                "market": market,
                "message": f"代码格式正确: {code} ({format_result['board']})"
            }

        except Exception as e:
            logger.warning(f"股票存在性检查失败: {code}, 错误: {e}")
            # 即使验证失败，对于有效格式的代码也允许继续
            return {
                "exists": True,  # 允许继续，让数据源验证
                "name": None,
                "market": format_result.get("market", "unknown"),
                "message": f"代码格式正确: {code}"
            }

    def _get_stock_list(self) -> Optional[pd.DataFrame]:
        """获取A股股票列表（使用缓存）"""
        if self._cache_loaded and self._stock_list_cache is not None:
            return self._stock_list_cache

        try:
            self._stock_list_cache = ak.stock_info_a_code_name()
            self._cache_loaded = True
            logger.info(f"股票列表已加载，共 {len(self._stock_list_cache)} 只股票")
            return self._stock_list_cache
        except Exception as e:
            logger.error(f"加载股票列表失败: {e}")
            return None

    def search_stocks(self, keyword: str, limit: int = 20) -> List[Dict]:
        """
        搜索股票（按代码或名称）

        Args:
            keyword: 搜索关键词（代码或名称）
            limit: 返回数量限制

        Returns:
            匹配的股票列表
        """
        try:
            stock_list = self._get_stock_list()
            if stock_list is None:
                return []

            # 按代码搜索
            code_matches = stock_list[stock_list['code'].str.contains(keyword, na=False)]

            # 按名称搜索
            name_matches = stock_list[stock_list['name'].str.contains(keyword, na=False)]

            # 合并结果（去重）
            all_matches = pd.concat([code_matches, name_matches]).drop_duplicates()

            if len(all_matches) > limit:
                all_matches = all_matches.head(limit)

            return [
                {
                    "code": row['code'],
                    "name": row['name'],
                    "market": self._detect_market_from_code(row['code'])
                }
                for _, row in all_matches.iterrows()
            ]

        except Exception as e:
            logger.error(f"股票搜索失败: {e}")
            return []

    def _detect_market_from_code(self, code: str) -> str:
        """从代码检测市场"""
        if code.startswith('6'):
            return 'sh'
        elif code.startswith(('0', '3')):
            return 'sz'
        elif code.startswith('8'):
            return 'bj'
        else:
            return 'unknown'

    def get_similar_codes(self, code: str) -> List[str]:
        """
        获取相似的股票代码（用于纠错建议）

        Args:
            code: 输入的代码

        Returns:
            相似代码列表
        """
        try:
            stock_list = self._get_stock_list()
            if stock_list is None:
                return []

            # 清理输入
            clean_code = code.upper().replace('SH', '').replace('SZ', '')

            # 精确匹配（去除前缀后）
            if len(clean_code) == 6 and clean_code.isdigit():
                exact_match = stock_list[stock_list['code'] == clean_code]
                if not exact_match.empty:
                    return [clean_code]

            # 前缀匹配（如输入 "600" 可能是想找 "600000"）
            if len(clean_code) < 6 and clean_code.isdigit():
                prefix_matches = stock_list[
                    stock_list['code'].str.startswith(clean_code)
                ]
                if not prefix_matches.empty:
                    return prefix_matches.head(5)['code'].tolist()

            # 如果代码完全不匹配，返回一些热门代码作为建议
            return [
                "600000",  # 浦发银行
                "000001",  # 平安银行
                "688234",  # 示例科创板股票
                "300750",  # 宁德时代
                "600036",  # 招商银行
            ]

        except Exception as e:
            logger.error(f"获取相似代码失败: {e}")
            return []


# 全局单例
_validator: Optional[StockValidator] = None


def get_validator() -> StockValidator:
    """获取验证器单例"""
    global _validator
    if _validator is None:
        _validator = StockValidator()
    return _validator
