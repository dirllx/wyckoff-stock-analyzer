"""
增强型评分器 - 优化后的综合评分算法

评分维度：
1. 趋势强度 (30%) - 均线排列、MACD、价格趋势
2. 威科夫阶段 (25%) - 当前所处阶段及特征
3. 量价协调 (20%) - 量价配合度、OBV
4. 动量指标 (15%) - RSI、KDJ、价格动量
5. 短期信号 (10%) - 短线买卖信号
"""
from typing import Dict, List, Optional
import pandas as pd
import numpy as np
from loguru import logger


class EnhancedScorer:
    """增强型评分器"""

    def __init__(self):
        self.weights = {
            'trend': 0.30,        # 趋势强度
            'wyckoff': 0.25,      # 威科夫阶段
            'volume_price': 0.20, # 量价协调
            'momentum': 0.15,     # 动量指标
            'short_term': 0.10    # 短期信号
        }

    def calculate_enhanced_score(
        self,
        df: pd.DataFrame,
        ma_signals: List[Dict],
        wyckoff_phase: str,
        volume_analysis: Dict,
        trend_analysis: Dict
    ) -> Dict:
        """
        计算增强型综合评分

        Args:
            df: K线数据
            ma_signals: 均线信号列表
            wyckoff_phase: 威科夫阶段
            volume_analysis: 成交量分析
            trend_analysis: 趋势分析

        Returns:
            包含score, direction, reason的评分结果
        """
        latest = df.iloc[-1]

        # 1. 趋势强度评分 (0-100)
        trend_score = self._calculate_trend_score(df, ma_signals, trend_analysis)

        # 2. 威科夫阶段评分 (0-100)
        wyckoff_score = self._calculate_wyckoff_score(wyckoff_phase, df)

        # 3. 量价协调评分 (0-100)
        volume_price_score = self._calculate_volume_price_score(df, volume_analysis)

        # 4. 动量指标评分 (0-100)
        momentum_score = self._calculate_momentum_score(df)

        # 5. 短期信号评分 (0-100)
        short_term_score = self._calculate_short_term_score(df)

        # 计算加权总分
        total_score = (
            trend_score * self.weights['trend'] +
            wyckoff_score * self.weights['wyckoff'] +
            volume_price_score * self.weights['volume_price'] +
            momentum_score * self.weights['momentum'] +
            short_term_score * self.weights['short_term']
        )

        # 转换为-5到+5的评分系统
        final_score = self._convert_to_score_scale(total_score)

        # 确定方向
        direction = self._determine_direction(final_score, trend_analysis)

        # 生成建议
        suggestion = self._generate_suggestion(final_score, direction, wyckoff_phase)

        # 生成原因
        reason = self._generate_reason(
            trend_score, wyckoff_score, volume_price_score,
            momentum_score, short_term_score, wyckoff_phase
        )

        logger.info(f"增强评分 - 总分:{total_score:.1f}, 最终:{final_score}, 方向:{direction}")

        return {
            'score': final_score,
            'direction': direction,
            'suggestion': suggestion,
            'reason': reason,
            'detailed_scores': {
                'trend': round(trend_score, 1),
                'wyckoff': round(wyckoff_score, 1),
                'volume_price': round(volume_price_score, 1),
                'momentum': round(momentum_score, 1),
                'short_term': round(short_term_score, 1),
                'total': round(total_score, 1)
            }
        }

    def _calculate_trend_score(
        self,
        df: pd.DataFrame,
        ma_signals: List[Dict],
        trend_analysis: Dict
    ) -> float:
        """
        计算趋势强度评分 (0-100)

        考虑因素：
        - 均线排列状态 (多头/空头/纠缠)
        - 均线金叉死叉数量
        - 价格相对均线位置
        - MACD状态
        """
        score = 50.0  # 基础分
        latest = df.iloc[-1]

        # 1. 均线排列评分 (0-30分)
        ma5, ma10, ma20, ma30, ma60 = latest['ma5'], latest['ma10'], latest['ma20'], latest.get('ma30', 0), latest.get('ma60', 0)
        close = latest['close']

        if close > ma5 > ma10 > ma20:
            # 多头排列
            score += 30
            if ma30 > 0 and ma20 > ma30:
                score += 10  # 更多均线多头排列
        elif close < ma5 < ma10 < ma20:
            # 空头排列
            score -= 30
            if ma30 > 0 and ma20 < ma30:
                score -= 10
        else:
            # 均线纠缠
            score += 0

        # 2. 均线金叉死叉评分 (0-20分)
        golden_cross = 0
        death_cross = 0

        for signal in ma_signals:
            if '金叉' in signal.get('type', ''):
                golden_cross += 1
            elif '死叉' in signal.get('type', ''):
                death_cross += 1

        score += golden_cross * 10  # 每个金叉+10分
        score -= death_cross * 10   # 每个死叉-10分

        # 3. 价格相对均线位置 (0-10分)
        if close > ma5:
            score += 5
        if close > ma20:
            score += 5

        # 4. 趋势确认 (0-10分)
        if trend_analysis.get('direction') == 'LONG':
            score += 10
        elif trend_analysis.get('direction') == 'SHORT':
            score -= 10

        return max(0, min(100, score))

    def _calculate_wyckoff_score(self, wyckoff_phase: str, df: pd.DataFrame) -> float:
        """
        计算威科夫阶段评分 (0-100)

        阶段评分：
        - 上涨趋势(U): 90分
        - Accumulation(A): 70分
        - 震荡: 50分
        - Distribution(DS): 30分
        - 下跌趋势(D): 10分
        """
        phase_scores = {
            'U': 90,      # 上涨趋势
            '上涨': 90,
            'A': 70,      # Accumulation - 吸筹
            'Accumulation': 70,
            '吸筹': 70,
            'DS': 30,     # Distribution - 派发
            'Distribution': 30,
            '派发': 30,
            'D': 10,      # 下跌趋势
            '下跌': 10,
            '震荡': 50
        }

        # 匹配阶段
        base_score = 50  # 默认震荡
        for key, value in phase_scores.items():
            if key in wyckoff_phase:
                base_score = value
                break

        # 根据量能调整评分
        latest = df.iloc[-1]
        volume_ratio = latest['volume'] / latest['volume_ma5'] if latest['volume_ma5'] > 0 else 1

        # 吸筹阶段放量 = 机构吸筹，加分
        if base_score == 70 and volume_ratio > 1.5:
            base_score += 10

        # 派发阶段放量 = 机构出货，减分
        if base_score == 30 and volume_ratio > 1.5:
            base_score -= 10

        return max(0, min(100, base_score))

    def _calculate_volume_price_score(
        self,
        df: pd.DataFrame,
        volume_analysis: Dict
    ) -> float:
        """
        计算量价协调评分 (0-100)

        考虑因素：
        - 量价配合度
        - OBV趋势
        - 异常放量/缩量
        """
        score = 50.0  # 基础分
        latest = df.iloc[-1]

        # 1. OBV趋势 (0-20分)
        if len(df) >= 5:
            obv_change = (latest['obv'] - df.iloc[-5]['obv']) / abs(df.iloc[-5]['obv']) if df.iloc[-5]['obv'] != 0 else 0
            if obv_change > 0.05:  # OBV上升5%以上
                score += 20
            elif obv_change > 0:
                score += 10
            elif obv_change < -0.05:
                score -= 20
            elif obv_change < 0:
                score -= 10

        # 2. 量价配合 (0-20分)
        price_change = (latest['close'] - latest['open']) / latest['open'] if latest['open'] > 0 else 0
        volume_ratio = latest['volume'] / latest['volume_ma5'] if latest['volume_ma5'] > 0 else 1

        # 上涨放量 = 量价齐升，好
        if price_change > 0.02 and volume_ratio > 1.3:
            score += 20
        # 下跌放量 = 量价齐跌，差
        elif price_change < -0.02 and volume_ratio > 1.3:
            score -= 20
        # 上涨缩量 = 量价背离，差
        elif price_change > 0.02 and volume_ratio < 0.7:
            score -= 10
        # 下跌缩量 = 惜售，好
        elif price_change < -0.02 and volume_ratio < 0.7:
            score += 10

        # 3. 成交量信号 (0-10分)
        if volume_analysis.get('direction') == 'LONG':
            score += 10
        elif volume_analysis.get('direction') == 'SHORT':
            score -= 10

        return max(0, min(100, score))

    def _calculate_momentum_score(self, df: pd.DataFrame) -> float:
        """
        计算动量指标评分 (0-100)

        考虑因素：
        - RSI (相对强弱指标)
        - KDJ
        - 价格动量
        """
        score = 50.0  # 基础分

        if len(df) < 14:
            return score  # 数据不足

        # 1. 计算RSI
        rsi = self._calculate_rsi(df['close'], 14)
        latest_rsi = rsi.iloc[-1]

        # RSI评分 (0-30分)
        if 40 < latest_rsi < 70:  # 正常区域
            score += 15
        elif latest_rsi > 70:  # 超买
            score += 5
        elif latest_rsi < 30:  # 超卖
            score += 10
        elif 30 <= latest_rsi <= 40:  # 低位，可能反弹
            score += 20

        # 2. 价格动量 (0-20分)
        # 计算5日涨跌幅
        if len(df) >= 5:
            momentum_5 = (df.iloc[-1]['close'] - df.iloc[-5]['close']) / df.iloc[-5]['close']
            if momentum_5 > 0.05:  # 5日涨幅超5%
                score += 20
            elif momentum_5 > 0.02:  # 5日涨幅超2%
                score += 15
            elif momentum_5 > 0:
                score += 10
            elif momentum_5 < -0.05:  # 5日跌幅超5%
                score -= 20
            elif momentum_5 < -0.02:
                score -= 15
            elif momentum_5 < 0:
                score -= 10

        # 3. 连续涨跌 (0-20分)
        # 检查最近3天的涨跌
        if len(df) >= 3:
            consecutive_up = 0
            consecutive_down = 0

            for i in range(-3, 0):
                if df.iloc[i]['close'] > df.iloc[i]['open']:
                    consecutive_up += 1
                    consecutive_down = 0
                elif df.iloc[i]['close'] < df.iloc[i]['open']:
                    consecutive_down += 1
                    consecutive_up = 0

            if consecutive_up >= 3:
                score += 20
            elif consecutive_up == 2:
                score += 15
            elif consecutive_down >= 3:
                score -= 20
            elif consecutive_down == 2:
                score -= 15

        return max(0, min(100, score))

    def _calculate_short_term_score(self, df: pd.DataFrame) -> float:
        """
        计算短期信号评分 (0-100)

        专门用于捕捉短线机会：
        - 短线反弹信号
        - 突破信号
        - 背离信号
        """
        score = 50.0
        latest = df.iloc[-1]

        if len(df) < 5:
            return score

        # 1. 短线反弹检测 (0-30分)
        # 最近跌幅较大，今日收阳线 = 可能反弹
        if len(df) >= 3:
            drop_3d = (df.iloc[-3]['close'] - df.iloc[-1]['close']) / df.iloc[-3]['close']
            is_bullish_today = latest['close'] > latest['open']

            if drop_3d < -0.05 and is_bullish_today:  # 跌5%后收阳
                score += 25
                # 如果放量，加分更多
                if latest['volume'] > df.iloc[-2]['volume'] * 1.2:
                    score += 15

        # 2. 突破检测 (0-30分)
        # 突破MA20
        if latest['close'] > latest['ma20'] and df.iloc[-2]['close'] <= df.iloc[-2]['ma20']:
            score += 20
            # 放量突破，加分
            if latest['volume'] > latest['volume_ma5'] * 1.3:
                score += 10

        # 3. 底背离检测 (0-20分)
        # 价格创新低，但指标未创新低
        if len(df) >= 10:
            recent_low = df.tail(10)['low'].min()
            if latest['low'] == recent_low:
                # 检查成交量是否萎缩
                if latest['volume'] < df['volume'].tail(10).mean():
                    score += 20  # 可能是底背离

        # 4. 下影线检测 (0-20分)
        # 长下影线 = 支撑强
        lower_shadow = latest['close'] - latest['low']
        body_size = abs(latest['close'] - latest['open'])
        if lower_shadow > body_size * 2 and latest['close'] > latest['open']:
            score += 20  # 长下影线阳线 = 强支撑

        return max(0, min(100, score))

    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """计算RSI指标"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi

    def _convert_to_score_scale(self, total_score: float) -> int:
        """
        将0-100的评分转换为-5到+5的评分系统

        转换规则：
        - 80-100: +5分
        - 70-79: +4分
        - 60-69: +3分
        - 55-59: +2分
        - 50-54: +1分
        - 45-49: 0分
        - 40-44: -1分
        - 30-39: -2分
        - 20-29: -3分
        - 10-19: -4分
        - 0-9: -5分
        """
        if total_score >= 80:
            return 5
        elif total_score >= 70:
            return 4
        elif total_score >= 60:
            return 3
        elif total_score >= 55:
            return 2
        elif total_score >= 50:
            return 1
        elif total_score >= 45:
            return 0
        elif total_score >= 40:
            return -1
        elif total_score >= 30:
            return -2
        elif total_score >= 20:
            return -3
        elif total_score >= 10:
            return -4
        else:
            return -5

    def _determine_direction(self, score: int, trend_analysis: Dict) -> str:
        """根据评分确定方向"""
        if score >= 2:
            return 'LONG'
        elif score <= -2:
            return 'SHORT'
        else:
            return 'NEUTRAL'

    def _generate_suggestion(self, score: int, direction: str, wyckoff_phase: str) -> str:
        """生成操作建议"""
        if score >= 4:
            return '强烈买入'
        elif score >= 2:
            return '买入'
        elif score >= 1:
            return '偏多持有'
        elif score <= -4:
            return '强烈卖出'
        elif score <= -2:
            return '卖出'
        elif score <= -1:
            return '偏空持有'
        else:
            return '观望'

    def _generate_reason(
        self,
        trend_score: float,
        wyckoff_score: float,
        volume_price_score: float,
        momentum_score: float,
        short_term_score: float,
        wyckoff_phase: str
    ) -> str:
        """生成评分原因"""
        reasons = []

        if trend_score >= 70:
            reasons.append(f"趋势强劲({trend_score:.0f}分)")
        elif trend_score >= 55:
            reasons.append(f"趋势向好({trend_score:.0f}分)")
        elif trend_score <= 30:
            reasons.append(f"趋势疲弱({trend_score:.0f}分)")

        if wyckoff_score >= 70:
            reasons.append(f"威科夫{wyckoff_phase}阶段有利({wyckoff_score:.0f}分)")
        elif wyckoff_score <= 30:
            reasons.append(f"威科夫{wyckoff_phase}阶段不利({wyckoff_score:.0f}分)")

        if volume_price_score >= 70:
            reasons.append(f"量价配合良好({volume_price_score:.0f}分)")
        elif volume_price_score <= 30:
            reasons.append(f"量价背离({volume_price_score:.0f}分)")

        if momentum_score >= 70:
            reasons.append(f"动量强劲({momentum_score:.0f}分)")
        elif momentum_score <= 30:
            reasons.append(f"动量疲弱({momentum_score:.0f}分)")

        if short_term_score >= 70:
            reasons.append(f"短线机会显著({short_term_score:.0f}分)")

        return '; '.join(reasons) if reasons else '综合评分中等'
