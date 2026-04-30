"""
威科夫分析器 - 实现核心威科夫指标分析
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from loguru import logger

from app.models.database import StockQuote, Stock
from app.services.analysis.enhanced_scorer import EnhancedScorer


class WyckoffAnalyzer:
    """威科夫分析器"""

    def __init__(self):
        pass

    def analyze(self, stock: Stock, quotes: List[StockQuote]) -> Dict:
        """
        执行完整的威科夫分析

        Args:
            stock: 股票对象
            quotes: K线数据列表

        Returns:
            分析结果字典
        """
        if len(quotes) < 20:
            return {
                "signal_type": None,
                "direction": "NEUTRAL",
                "score": 0,
                "reason": "数据不足，需要至少20条K线数据"
            }

        # 转换为DataFrame便于分析
        df = self._quotes_to_dataframe(quotes)

        # 执行各项分析
        volume_analysis = self._analyze_volume(df)
        effort_result_analysis = self._analyze_effort_result(df)
        sps_analysis = self._analyze_sps(df)
        trend_analysis = self._analyze_trend(df)

        # 生成均线信号
        ma_signals = self._generate_ma_signals(df)

        # 推断威科夫阶段
        wyckoff_phase = self._infer_wyckoff_phase(df, trend_analysis, volume_analysis)

        # 使用增强型评分器计算评分
        try:
            enhanced_scorer = EnhancedScorer()
            enhanced_result = enhanced_scorer.calculate_enhanced_score(
                df=df,
                ma_signals=ma_signals,
                wyckoff_phase=wyckoff_phase,
                volume_analysis=volume_analysis,
                trend_analysis=trend_analysis
            )

            # 合并结果
            result = {
                "signal_type": "WYCKOFF",
                "direction": enhanced_result["direction"],
                "score": enhanced_result["score"],
                "confidence": min(0.9, abs(enhanced_result["score"]) / 5),
                "strength": "STRONG" if abs(enhanced_result["score"]) >= 4 else "MODERATE" if abs(enhanced_result["score"]) >= 2 else "WEAK",
                "suggestion": enhanced_result["suggestion"],
                "reason": enhanced_result["reason"],
                "wyckoff_phase": wyckoff_phase,
                "detailed_scores": enhanced_result["detailed_scores"],
                "details": {
                    "volume": volume_analysis,
                    "effort_result": effort_result_analysis,
                    "sps": sps_analysis,
                    "trend": trend_analysis,
                    "ma_signals": ma_signals
                }
            }

            logger.info(f"股票{stock.code}威科夫分析完成(增强评分): {result}")

        except Exception as e:
            logger.error(f"增强评分失败，使用原始评分: {e}")
            # 降级到原始评分方法
            result = self._combine_signals(
                volume_analysis,
                effort_result_analysis,
                sps_analysis,
                trend_analysis
            )
            result["wyckoff_phase"] = wyckoff_phase
            result["ma_signals"] = ma_signals

        return result

    def _quotes_to_dataframe(self, quotes: List[StockQuote]) -> pd.DataFrame:
        """将K线列表转换为DataFrame（支持ORM对象和字典）"""
        data = []
        for quote in quotes:
            # 兼容字典格式和ORM对象格式
            if isinstance(quote, dict):
                # 字典格式（来自数据源调度器）
                data.append({
                    "date": quote.get("date"),
                    "open": quote.get("open"),
                    "high": quote.get("high"),
                    "low": quote.get("low"),
                    "close": quote.get("close"),
                    "volume": quote.get("volume", 0),
                    "ma5": quote.get("ma5"),
                    "ma10": quote.get("ma10"),
                    "ma20": quote.get("ma20"),
                    "volume_ma5": quote.get("volume_ma5"),
                    "obv": quote.get("obv")
                })
            else:
                # ORM对象格式
                data.append({
                    "date": quote.date,
                    "open": quote.open,
                    "high": quote.high,
                    "low": quote.low,
                    "close": quote.close,
                    "volume": quote.volume,
                    "ma5": quote.ma5,
                    "ma10": quote.ma10,
                    "ma20": quote.ma20,
                    "volume_ma5": quote.volume_ma5,
                    "obv": quote.obv
                })

        df = pd.DataFrame(data)
        df = df.sort_values("date").reset_index(drop=True)
        return df

    def _analyze_volume(self, df: pd.DataFrame) -> Dict:
        """
        成交量分析

        分析要点：
        1. 异常放量/缩量
        2. OBV趋势
        3. 成交量与价格配合
        """
        latest = df.iloc[-1]
        latest_volume = latest["volume"]
        latest_volume_ma5 = latest["volume_ma5"]

        # 成交量异常检测
        volume_ratio = latest_volume / latest_volume_ma5 if pd.notna(latest_volume_ma5) and latest_volume_ma5 > 0 else 1

        volume_signal = {
            "type": "VOLUME",
            "anomaly": False,
            "direction": "NEUTRAL",
            "strength": "WEAK"
        }

        if volume_ratio > 2.0:
            # 异常放量
            volume_signal["anomaly"] = True
            volume_signal["strength"] = "STRONG"

            # 判断放量方向
            if latest["close"] > latest["open"]:
                volume_signal["direction"] = "LONG"
                volume_signal["reason"] = "异常放量上涨，可能突破"
            else:
                volume_signal["direction"] = "SHORT"
                volume_signal["reason"] = "异常放量下跌，可能见顶"

        elif volume_ratio < 0.5:
            # 异常缩量
            volume_signal["anomaly"] = True
            volume_signal["strength"] = "MODERATE"
            volume_signal["reason"] = "异常缩量，可能变盘"

        else:
            volume_signal["reason"] = "成交量正常"

        # OBV分析
        latest_obv = latest["obv"]
        prev_obv = df.iloc[-5]["obv"]
        if pd.notna(latest_obv) and pd.notna(prev_obv):
            if latest_obv > prev_obv:
                volume_signal["obv_trend"] = "UP"
                volume_signal["reason"] += "，OBV上升，资金流入"
            elif latest_obv < prev_obv:
                volume_signal["obv_trend"] = "DOWN"
                volume_signal["reason"] += "，OBV下降，资金流出"

        return volume_signal

    def _analyze_effort_result(self, df: pd.DataFrame, volume_weight: float = 0.5, price_weight: float = 0.5) -> Dict:
        """
        威科夫量价协调性分析（Effort vs Result）

        核心概念：大的成交量应该对应大的价格变动
        - 量大价小 = 量价不协调（异常预警）
        - 量大价大 = 量价协调（趋势确认）
        - 量小价小 = 量价协调（横盘/趋势衰竭）

        Args:
            df: K线数据DataFrame
            volume_weight: 成交量权重（0-1）
            price_weight: 价格变动权重（0-1）

        Returns:
            量价协调性分析结果
        """
        latest = df.iloc[-1]
        
        # 标准化成交量（0-100）- 最近20天的相对强度
        vol_min = df["volume"].tail(20).min()
        vol_max = df["volume"].tail(20).max()
        if vol_max > vol_min:
            volume_norm = ((latest["volume"] - vol_min) / (vol_max - vol_min)) * 100
        else:
            volume_norm = 50  # 成交量无变化时给中性分

        # 标准化价格变动（0-100）- 最近20天的相对强度
        price_change = abs(latest["close"] - latest["open"])
        price_changes = (df["close"] - df["open"]).abs().tail(20)
        price_min = price_changes.min()
        price_max = price_changes.max()
        
        if price_max > price_min:
            price_norm = ((price_change - price_min) / (price_max - price_min)) * 100
        else:
            price_norm = 50  # 价格变动无变化时给中性分

        # 计算协调性评分（0-100）
        # 两个数值越接近，说明量价越协调
        coordination = 100 - abs(volume_norm * volume_weight - price_norm * price_weight) * 100
        
        # 判断量价协调性
        is_coordinated = bool(coordination >= 70)
        
        # 判断量价关系
        if volume_norm > 70 and price_norm > 70:
            relation_type = "量价齐升"  # 量大价大
            signal_direction = "STRONG_CONFIRMATION"  # 强确认
        elif volume_norm > 70 and price_norm < 30:
            relation_type = "量增价减"  # 量大价小
            signal_direction = "ANOMALY_WARNING"  # 异常预警
        elif volume_norm < 30 and price_norm > 70:
            relation_type = "量减价增"  # 量小价大
            signal_direction = "WEAK_CONFIRMATION"  # 弱确认
        else:
            relation_type = "量价平稳"  # 量小价小
            signal_direction = "NORMAL"  # 正常

        # 转换numpy类型为Python原生类型（避免序列化错误）
        return {
            "type": "EFFORT_RESULT",
            "volume_norm": round(float(volume_norm), 1),  # 成交量标准化得分
            "price_norm": round(float(price_norm), 1),  # 价格变动标准化得分
            "coordination_score": round(float(coordination), 1),  # 协调性评分
            "is_coordinated": bool(is_coordinated),
            "relation_type": relation_type,
            "signal_direction": signal_direction,
            "reason": self._get_effort_result_reason(relation_type, is_coordinated),
            "warning": self._get_effort_result_warning(signal_direction)
        }

    def _get_effort_result_reason(self, relation_type: str, is_coordinated: bool) -> str:
        """
        获取量价协调性原因说明
        """
        if relation_type == "量价齐升":
            return "大量推动大价，趋势确认"
        elif relation_type == "量增价减":
            return "量大价小，警惕假突破"
        elif relation_type == "量减价增":
            return "量小价大，趋势动力减弱"
        elif relation_type == "量价平稳":
            return "量价平稳，观望或趋势衰竭"
        else:
            return "量价关系正常"

    def _get_effort_result_warning(self, signal_direction: str) -> Optional[str]:
        """
        获取量价协调性预警
        """
        if signal_direction == "ANOMALY_WARNING":
            return "量价不协调，警惕假突破或反转"
        elif signal_direction == "WEAK_CONFIRMATION":
            return "量价协调性弱，需要其他指标确认"
        return None

    def _analyze_sps(self, df: pd.DataFrame) -> Dict:
        """
        SPS (停止与支撑/阻力) 分析

        分析要点：
        1. 价格在关键位置的停止行为
        2. 支撑位/阻力位测试
        3. 成交量配合
        """
        latest = df.iloc[-1]
        latest_low = latest["low"]
        latest_high = latest["high"]
        latest_close = latest["close"]
        latest_volume = latest["volume"]

        # 查找最近的支撑位和阻力位
        recent_lows = df.tail(20)["low"].min()
        recent_highs = df.tail(20)["high"].max()

        sps_signal = {
            "type": "SPS",
            "direction": "NEUTRAL",
            "strength": "WEAK",
            "support_level": recent_lows,
            "resistance_level": recent_highs,
            "reason": "价格在中性区域"
        }

        # 判断是否在支撑位附近
        distance_to_support = abs(latest_low - recent_lows) / recent_lows if recent_lows > 0 else 1

        if distance_to_support < 0.02:  # 距离支撑位2%以内
            # 在支撑位附近
            if latest_close > latest["open"]:
                # 阳线，可能支撑有效
                sps_signal["direction"] = "LONG"
                sps_signal["strength"] = "MODERATE"
                sps_signal["reason"] = f"在支撑位({recent_lows:.2f})附近企稳"
            elif latest_volume > df.tail(5)["volume"].mean() * 1.5:
                # 放量下跌，支撑可能被突破
                sps_signal["direction"] = "SHORT"
                sps_signal["strength"] = "STRONG"
                sps_signal["reason"] = f"放量跌破支撑位({recent_lows:.2f})"

        # 判断是否在阻力位附近
        distance_to_resistance = abs(latest_high - recent_highs) / recent_highs if recent_highs > 0 else 1

        if distance_to_resistance < 0.02:  # 距离阻力位2%以内
            if latest_close > latest["open"]:
                # 阳线，可能突破阻力
                if latest_volume > df.tail(5)["volume"].mean() * 1.5:
                    sps_signal["direction"] = "LONG"
                    sps_signal["strength"] = "STRONG"
                    sps_signal["reason"] = f"放量突破阻力位({recent_highs:.2f})"
                else:
                    sps_signal["reason"] = f"接近阻力位({recent_highs:.2f})，但量能不足"
            else:
                sps_signal["reason"] = f"在阻力位({recent_highs:.2f})受阻"

        return sps_signal

    def _analyze_trend(self, df: pd.DataFrame) -> Dict:
        """
        趋势分析

        使用移动平均线判断趋势方向
        """
        latest = df.iloc[-1]

        trend_signal = {
            "type": "TREND",
            "direction": "NEUTRAL",
            "strength": "WEAK"
        }

        # 判断均线排列
        ma5 = latest["ma5"]
        ma10 = latest["ma10"]
        ma20 = latest["ma20"]
        close = latest["close"]

        # 检查所有均线值是否有效
        if all(pd.notna([ma5, ma10, ma20, close])):
            if close > ma5 > ma10 > ma20:
                # 多头排列
                trend_signal["direction"] = "LONG"
                trend_signal["strength"] = "STRONG"
                trend_signal["reason"] = "均线多头排列，上涨趋势"

            elif close < ma5 < ma10 < ma20:
                # 空头排列
                trend_signal["direction"] = "SHORT"
                trend_signal["strength"] = "STRONG"
                trend_signal["reason"] = "均线空头排列，下跌趋势"

            else:
                # 均线纠结，震荡市
                trend_signal["strength"] = "MODERATE"
                trend_signal["reason"] = "均线纠结，震荡走势"
        else:
            # 均线数据不完整
            trend_signal["strength"] = "WEAK"
            trend_signal["reason"] = "均线数据不完整"

        return trend_signal

    def _generate_ma_signals(self, df: pd.DataFrame) -> List[Dict]:
        """
        生成均线信号

        检测均线金叉和死叉
        """
        signals = []

        if len(df) < 2:
            return signals

        latest = df.iloc[-1]
        prev = df.iloc[-2]

        # MA5/MA10 金叉死叉
        prev_ma5 = prev['ma5']
        prev_ma10 = prev['ma10']
        latest_ma5 = latest['ma5']
        latest_ma10 = latest['ma10']

        if all(pd.notna([prev_ma5, prev_ma10, latest_ma5, latest_ma10])):
            if prev_ma5 <= prev_ma10 and latest_ma5 > latest_ma10:
                signals.append({'type': 'MA5/MA10金叉', 'color': '#10b981'})
            elif prev_ma5 >= prev_ma10 and latest_ma5 < latest_ma10:
                signals.append({'type': 'MA5/MA10死叉', 'color': '#ef4444'})

        # MA10/MA20 金叉死叉
        prev_ma10 = prev['ma10']
        prev_ma20 = prev['ma20']
        latest_ma10 = latest['ma10']
        latest_ma20 = latest['ma20']

        if all(pd.notna([prev_ma10, prev_ma20, latest_ma10, latest_ma20])):
            if prev_ma10 <= prev_ma20 and latest_ma10 > latest_ma20:
                signals.append({'type': 'MA10/MA20金叉', 'color': '#10b981'})
            elif prev_ma10 >= prev_ma20 and latest_ma10 < latest_ma20:
                signals.append({'type': 'MA10/MA20死叉', 'color': '#ef4444'})

        # 检查均线排列
        latest_close = latest['close']
        latest_ma5 = latest['ma5']
        latest_ma10 = latest['ma10']
        latest_ma20 = latest['ma20']

        if all(pd.notna([latest_close, latest_ma5, latest_ma10, latest_ma20])):
            if latest_close > latest_ma5 > latest_ma10 > latest_ma20:
                signals.append({'type': '多头排列', 'color': '#10b981'})
            elif latest_close < latest_ma5 < latest_ma10 < latest_ma20:
                signals.append({'type': '空头排列', 'color': '#ef4444'})

        return signals

    def _infer_wyckoff_phase(
        self,
        df: pd.DataFrame,
        trend_analysis: Dict,
        volume_analysis: Dict
    ) -> str:
        """
        推断威科夫阶段

        根据趋势、成交量、价格形态推断当前所处的威科夫阶段
        """
        latest = df.iloc[-1]

        # 上涨趋势 (U)
        if trend_analysis.get('direction') == 'LONG' and trend_analysis.get('strength') == 'STRONG':
            if volume_analysis.get('direction') == 'LONG':
                return 'U(放量上涨)'
            else:
                return 'U(缩量上涨)'

        # 下跌趋势 (D)
        if trend_analysis.get('direction') == 'SHORT' and trend_analysis.get('strength') == 'STRONG':
            if volume_analysis.get('direction') == 'SHORT':
                return 'D(放量下跌)'
            else:
                return 'D(缩量下跌)'

        # Accumulation (吸筹) - 低位横盘，成交量温和
        if trend_analysis.get('strength') in ['WEAK', 'MODERATE']:
            # 检查是否在低位
            if len(df) >= 20:
                recent_high = df.tail(20)['high'].max()
                recent_low = df.tail(20)['low'].min()
                current_price = latest['close']

                # 价格在下半区
                if current_price < (recent_high + recent_low) / 2:
                    # 检查成交量
                    if volume_analysis.get('anomaly') and volume_analysis.get('direction') == 'LONG':
                        return 'A(吸筹放量)'
                    else:
                        return 'A(吸筹)'

        # Distribution (派发) - 高位横盘，成交量放大
        if trend_analysis.get('strength') in ['WEAK', 'MODERATE']:
            if len(df) >= 20:
                recent_high = df.tail(20)['high'].max()
                recent_low = df.tail(20)['low'].min()
                current_price = latest['close']

                # 价格在上半区
                if current_price > (recent_high + recent_low) / 2:
                    # 检查成交量
                    if volume_analysis.get('anomaly') and volume_analysis.get('direction') == 'SHORT':
                        return 'DS(派发放量)'
                    else:
                        return 'DS(派发)'

        # 默认震荡
        return '震荡'

    def _combine_signals(
        self,
        volume: Dict,
        effort_result: Dict,
        sps: Dict,
        trend: Dict
    ) -> Dict:
        """
        综合多个信号，给出最终评分和建议

        评分规则：
        - 单个信号基础分：WEAK=1, MODERATE=2, STRONG=3
        - 同向信号叠加：+1
        - 反向信号对冲：-1
        - 趋势确认：+1
        - 量价协调性加分/扣分
        """
        score = 0
        long_count = 0
        short_count = 0

        # 统计信号方向
        for signal in [volume, effort_result, sps, trend]:
            # 特殊处理：effort_result 不参与方向统计
            if signal["type"] == "EFFORT_RESULT":
                continue
                
            if signal["direction"] == "LONG":
                long_count += 1
                strength = signal.get("strength", "WEAK")
                if strength == "STRONG":
                    score += 3
                elif strength == "MODERATE":
                    score += 2
                else:
                    score += 1
            elif signal["direction"] == "SHORT":
                short_count += 1
                strength = signal.get("strength", "WEAK")
                if strength == "STRONG":
                    score -= 3
                elif strength == "MODERATE":
                    score -= 2
                else:
                    score -= 1

        # 量价协调性加分/扣分
        if effort_result.get("is_coordinated", False):
            # 量价协调：加分
            score += 1
            effort_reason = "量价协调"
        else:
            # 量价不协调：扣分
            score -= 2
            effort_reason = effort_result.get("reason", "量价不协调")

        # 量价异常预警
        if effort_result.get("signal_direction") == "ANOMALY_WARNING":
            # 量价异常预警：额外扣分
            score -= 1

        # 同向信号叠加加分
        if long_count >= 2:
            score += 1
        if short_count >= 2:
            score -= 1

        # 确定最终方向
        if score > 3:
            direction = "LONG"
            suggestion = "BUY"
        elif score < -3:
            direction = "SHORT"
            suggestion = "SELL"
        else:
            direction = "NEUTRAL"
            suggestion = "HOLD"

        # 限制分数在1-10之间
        final_score = max(1, min(10, abs(score)))

        # 汇总原因
        reasons = []
        if volume["reason"]:
            reasons.append(f"成交量: {volume['reason']}")
        if effort_result["reason"]:
            reasons.append(f"量价协调: {effort_result['reason']}")
        if sps["reason"]:
            reasons.append(f"SPS: {sps['reason']}")
        if trend["reason"]:
            reasons.append(f"趋势: {trend['reason']}")

        # 添加预警
        if effort_result.get("warning"):
            reasons.append(f"预警: {effort_result['warning']}")

        return {
            "signal_type": "WYCKOFF",
            "direction": direction,
            "score": final_score,
            "confidence": min(0.9, final_score / 10),
            "strength": "STRONG" if final_score >= 7 else "MODERATE" if final_score >= 4 else "WEAK",
            "suggestion": suggestion,
            "reason": "; ".join(reasons),
            "details": {
                "volume": volume,
                "effort_result": effort_result,
                "sps": sps,
                "trend": trend
            }
        }
