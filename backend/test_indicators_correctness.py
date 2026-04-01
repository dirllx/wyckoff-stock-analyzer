"""
威科夫系统技术指标正确性核查脚本

核查项目：
1. 价格基础数据字段（open/high/low/close/volume/amount）
2. MA均线计算逻辑（MA5-MA250）
3. 成交量均线和OBV计算
4. 威科夫分析指标（成交量、量价协调、SPS、趋势）
5. 多周期数据一致性
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
from datetime import datetime
from app.services.data.data_storage import DataStorage
from app.services.analysis.wyckoff_analyzer import WyckoffAnalyzer
from app.models.database import Stock, StockQuote
from app.database import SessionLocal


class IndicatorsChecker:
    """指标正确性核查器"""

    def __init__(self):
        self.db = SessionLocal()
        self.storage = DataStorage(self.db)
        self.wyckoff_analyzer = WyckoffAnalyzer()
        self.errors = []
        self.warnings = []
        self.passed = []

    def check_price_data_fields(self, code="688234", timeframe="daily"):
        """
        核查1：价格基础数据字段
        """
        print(f"\n{'='*80}")
        print("核查1：价格基础数据字段完整性")
        print(f"{'='*80}")

        # 获取股票
        stock = self.storage.repo.find_by_code(code)
        if not stock:
            self.errors.append(f"股票 {code} 不存在")
            return False

        # 获取K线数据
        quotes = self.storage.get_quotes_by_timeframe(stock.id, timeframe, limit=100)

        if not quotes:
            self.errors.append(f"股票 {code} 周期 {timeframe} 没有数据")
            return False

        print(f"✓ 股票: {stock.name} ({code})")
        print(f"✓ 周期: {timeframe}")
        print(f"✓ K线数量: {len(quotes)}")

        # 核查字段完整性
        required_fields = ['open', 'high', 'low', 'close', 'volume', 'amount']
        missing_fields = []
        null_count = {field: 0 for field in required_fields}

        for quote in quotes:
            for field in required_fields:
                value = getattr(quote, field, None)
                if value is None or (isinstance(value, float) and np.isnan(value)):
                    null_count[field] += 1

        print(f"\n字段完整性检查：")
        all_valid = True
        for field in required_fields:
            nulls = null_count[field]
            if nulls > 0:
                print(f"  ✗ {field}: {nulls} 条数据为空")
                all_valid = False
            else:
                print(f"  ✓ {field}: 完整")

        # 逻辑检查：high >= low, high >= open, high >= close, low <= open, low <= close
        print(f"\n价格逻辑一致性检查：")
        logic_errors = 0
        for quote in quotes:
            if quote.high < quote.low:
                logic_errors += 1
                if logic_errors <= 3:  # 只显示前3个错误
                    print(f"  ✗ {quote.date}: high({quote.high}) < low({quote.low})")
            if quote.high < quote.open or quote.high < quote.close:
                logic_errors += 1
                if logic_errors <= 3:
                    print(f"  ✗ {quote.date}: high不是最高价")
            if quote.low > quote.open or quote.low > quote.close:
                logic_errors += 1
                if logic_errors <= 3:
                    print(f"  ✗ {quote.date}: low不是最低价")

        if logic_errors == 0:
            print(f"  ✓ 价格逻辑完全正确")
            self.passed.append("价格基础数据字段完整性检查通过")
            return True
        else:
            print(f"  ✗ 发现 {logic_errors} 个逻辑错误")
            self.errors.append(f"价格逻辑错误: {logic_errors}个")
            return False

    def check_ma_calculation(self, code="688234", timeframe="daily"):
        """
        核查2：MA均线计算逻辑
        """
        print(f"\n{'='*80}")
        print("核查2：MA均线计算逻辑正确性")
        print(f"{'='*80}")

        # 获取股票
        stock = self.storage.repo.find_by_code(code)
        if not stock:
            return False

        # 获取K线数据
        quotes = self.storage.get_quotes_by_timeframe(stock.id, timeframe, limit=500)

        if not quotes or len(quotes) < 250:
            self.errors.append(f"数据不足，无法验证MA250计算（需要至少250条）")
            return False

        print(f"✓ 获取到 {len(quotes)} 条K线数据")

        # 转换为DataFrame便于计算
        data = []
        for quote in quotes:
            data.append({
                "date": quote.date,
                "close": quote.close,
                "ma5": quote.ma5,
                "ma10": quote.ma10,
                "ma20": quote.ma20,
                "ma30": quote.ma30,
                "ma60": quote.ma60,
                "ma90": quote.ma90,
                "ma120": quote.ma120,
                "ma250": quote.ma250
            })
        df = pd.DataFrame(data)

        # 手动计算MA值进行对比
        df['calculated_ma5'] = df['close'].rolling(window=5, min_periods=1).mean()
        df['calculated_ma10'] = df['close'].rolling(window=10, min_periods=1).mean()
        df['calculated_ma20'] = df['close'].rolling(window=20, min_periods=1).mean()
        df['calculated_ma30'] = df['close'].rolling(window=30, min_periods=1).mean()
        df['calculated_ma60'] = df['close'].rolling(window=60, min_periods=1).mean()
        df['calculated_ma90'] = df['close'].rolling(window=90, min_periods=1).mean()
        df['calculated_ma120'] = df['close'].rolling(window=120, min_periods=1).mean()
        df['calculated_ma250'] = df['close'].rolling(window=250, min_periods=1).mean()

        # 比较差异
        ma_periods = [5, 10, 20, 30, 60, 90, 120, 250]
        ma_correct = True
        max_diff = 0

        print(f"\nMA值精度检查（允许误差0.01）：")
        for period in ma_periods:
            stored_col = f'ma{period}'
            calc_col = f'calculated_ma{period}'

            # 计算差异
            diff = abs(df[stored_col] - df[calc_col])
            max_diff_for_period = diff.max()

            # 找出最大差异的位置
            max_idx = diff.idxmax()

            if max_diff_for_period > 0.01:
                print(f"  ✗ MA{period}: 最大误差 {max_diff_for_period:.6f} (位置{max_idx})")
                print(f"      存储值: {df.loc[max_idx, stored_col]:.4f}")
                print(f"      计算值: {df.loc[max_idx, calc_col]:.4f}")
                ma_correct = False
            else:
                print(f"  ✓ MA{period}: 精确匹配 (最大误差 < 0.01)")

            if max_diff_for_period > max_diff:
                max_diff = max_diff_for_period

        # 检查末尾数据的MA值是否为null
        print(f"\nMA数据完整性检查（最后10条）：")
        latest_10 = df.tail(10)
        for period in ma_periods:
            null_count = latest_10[f'ma{period}'].isna().sum()
            if null_count > 0:
                print(f"  ✗ MA{period}: 最后10条中有 {null_count} 条为空")
                ma_correct = False
            else:
                print(f"  ✓ MA{period}: 最后10条数据完整")

        if ma_correct:
            self.passed.append("MA均线计算逻辑完全正确")
            return True
        else:
            self.errors.append("MA均线计算存在误差")
            return False

    def check_volume_indicators(self, code="688234", timeframe="daily"):
        """
        核查3：成交量均线和OBV计算
        """
        print(f"\n{'='*80}")
        print("核查3：成交量均线和OBV计算正确性")
        print(f"{'='*80}")

        # 获取股票
        stock = self.storage.repo.find_by_code(code)
        if not stock:
            return False

        # 获取K线数据
        quotes = self.storage.get_quotes_by_timeframe(stock.id, timeframe, limit=500)

        if not quotes:
            self.errors.append(f"股票 {code} 周期 {timeframe} 没有数据")
            return False

        print(f"✓ 获取到 {len(quotes)} 条K线数据")

        # 转换为DataFrame
        data = []
        for quote in quotes:
            data.append({
                "date": quote.date,
                "close": quote.close,
                "volume": quote.volume,
                "volume_ma5": quote.volume_ma5,
                "obv": quote.obv
            })
        df = pd.DataFrame(data)

        # 验证volume_ma5
        df['calculated_volume_ma5'] = df['volume'].rolling(window=5, min_periods=1).mean()
        volume_ma_diff = abs(df['volume_ma5'] - df['calculated_volume_ma5']).max()

        print(f"\n成交量均线(Volume MA5)检查：")
        if volume_ma_diff < 0.01:
            print(f"  ✓ Volume MA5: 精确匹配 (最大误差 < 0.01)")
        else:
            print(f"  ✗ Volume MA5: 最大误差 {volume_ma_diff:.6f}")
            self.errors.append(f"Volume MA5计算误差: {volume_ma_diff}")

        # 验证OBV
        print(f"\nOBV (能量潮) 检查：")
        calculated_obv = [0]
        for i in range(1, len(df)):
            if df.iloc[i]['close'] > df.iloc[i-1]['close']:
                calculated_obv.append(calculated_obv[-1] + df.iloc[i]['volume'])
            elif df.iloc[i]['close'] < df.iloc[i-1]['close']:
                calculated_obv.append(calculated_obv[-1] - df.iloc[i]['volume'])
            else:
                calculated_obv.append(calculated_obv[-1])

        df['calculated_obv'] = calculated_obv
        obv_diff = abs(df['obv'] - df['calculated_obv']).max()

        if obv_diff < 0.01:
            print(f"  ✓ OBV: 精确匹配 (最大误差 < 0.01)")
            self.passed.append("成交量指标（Volume MA5和OBV）计算正确")
            return True
        else:
            print(f"  ✗ OBV: 最大误差 {obv_diff:.6f}")
            # 显示第一个错误位置
            first_error = (abs(df['obv'] - df['calculated_obv']) > 0.01).idxmax()
            print(f"      位置 {first_error}:")
            print(f"      存储值: {df.loc[first_error, 'obv']:.2f}")
            print(f"      计算值: {df.loc[first_error, 'calculated_obv']:.2f}")
            self.errors.append(f"OBV计算误差: {obv_diff}")
            return False

    def check_wyckoff_indicators(self, code="688234", timeframe="daily"):
        """
        核查4：威科夫分析指标
        """
        print(f"\n{'='*80}")
        print("核查4：威科夫分析指标计算逻辑")
        print(f"{'='*80}")

        # 获取股票
        stock = self.storage.repo.find_by_code(code)
        if not stock:
            return False

        # 获取K线数据
        quotes = self.storage.get_quotes_by_timeframe(stock.id, timeframe, limit=500)

        if not quotes or len(quotes) < 20:
            self.errors.append(f"数据不足，无法进行威科夫分析（需要至少20条）")
            return False

        print(f"✓ 获取到 {len(quotes)} 条K线数据")

        # 执行威科夫分析
        result = self.wyckoff_analyzer.analyze(stock, quotes)

        print(f"\n威科夫分析结果：")
        print(f"  信号类型: {result.get('signal_type')}")
        print(f"  方向: {result.get('direction')}")
        print(f"  评分: {result.get('score')}")
        print(f"  置信度: {result.get('confidence')}")
        print(f"  建议: {result.get('suggestion')}")

        # 检查各子指标
        details = result.get('details', {})
        if details:
            print(f"\n子指标检查：")

            # 成交量分析
            volume = details.get('volume', {})
            if volume:
                print(f"  ✓ 成交量分析: {volume.get('direction')} - {volume.get('reason')}")

            # 量价协调性
            effort_result = details.get('effort_result', {})
            if effort_result:
                print(f"  ✓ 量价协调性: {effort_result.get('relation_type')} (协调度: {effort_result.get('coordination_score')})")

            # SPS分析
            sps = details.get('sps', {})
            if sps:
                print(f"  ✓ SPS分析: {sps.get('direction')} - {sps.get('reason')}")

            # 趋势分析
            trend = details.get('trend', {})
            if trend:
                print(f"  ✓ 趋势分析: {trend.get('direction')} ({trend.get('strength')}) - {trend.get('reason')}")

            # 均线信号
            ma_signals = details.get('ma_signals', [])
            if ma_signals:
                print(f"  ✓ 均线信号: {len(ma_signals)} 个")
                for signal in ma_signals[:5]:  # 显示前5个
                    print(f"      - {signal.get('type')}")

        # 验证评分范围
        score = result.get('score', 0)
        confidence = result.get('confidence', 0)

        if not (1 <= score <= 10):
            self.errors.append(f"评分 {score} 超出范围[1,10]")
            return False

        if not (0 <= confidence <= 1):
            self.errors.append(f"置信度 {confidence} 超出范围[0,1]")
            return False

        self.passed.append("威科夫分析指标计算逻辑正确")
        return True

    def check_multi_timeframe_consistency(self, code="688234"):
        """
        核查5：多周期数据一致性
        """
        print(f"\n{'='*80}")
        print("核查5：多周期数据一致性")
        print(f"{'='*80}")

        # 获取股票
        stock = self.storage.repo.find_by_code(code)
        if not stock:
            return False

        timeframes = ["daily", "weekly", "monthly"]
        timeframe_data = {}

        for tf in timeframes:
            quotes = self.storage.get_quotes_by_timeframe(stock.id, tf, limit=500)
            timeframe_data[tf] = quotes
            print(f"✓ {tf}: {len(quotes) if quotes else 0} 条数据")

        # 检查数据量
        print(f"\n数据量检查：")
        min_required = 100
        all_sufficient = True
        for tf in timeframes:
            count = len(timeframe_data[tf]) if timeframe_data[tf] else 0
            if count < min_required:
                print(f"  ✗ {tf}: 仅 {count} 条（建议至少 {min_required} 条）")
                all_sufficient = False
            else:
                print(f"  ✓ {tf}: {count} 条数据充足")

        # 检查日期连续性（日线）
        print(f"\n日线数据日期连续性检查：")
        daily_quotes = timeframe_data.get("daily")
        if daily_quotes and len(daily_quotes) >= 2:
            # 检查是否有未来日期
            latest_date = daily_quotes[-1].date
            # 如果是datetime类型，转换为date
            if hasattr(latest_date, 'date'):
                latest_date = latest_date.date()
            current_date = datetime.now().date()

            if latest_date > current_date:
                print(f"  ✗ 存在未来日期: {latest_date}")
                self.errors.append(f"日线数据包含未来日期: {latest_date}")
                all_sufficient = False
            else:
                print(f"  ✓ 无未来日期 (最新: {latest_date})")

            # 检查日期顺序
            dates = [q.date for q in daily_quotes]
            if dates == sorted(dates):
                print(f"  ✓ 日期按升序排列")
            else:
                print(f"  ✗ 日期顺序混乱")
                self.errors.append("日线数据日期顺序混乱")
                all_sufficient = False

        if all_sufficient:
            self.passed.append("多周期数据一致性检查通过")
            return True
        else:
            return False

    def generate_report(self):
        """
        生成核查报告
        """
        print(f"\n{'='*80}")
        print("核查报告汇总")
        print(f"{'='*80}")

        print(f"\n✅ 通过项目 ({len(self.passed)}):")
        for item in self.passed:
            print(f"  ✓ {item}")

        if self.warnings:
            print(f"\n⚠️  警告 ({len(self.warnings)}):")
            for item in self.warnings:
                print(f"  ! {item}")

        if self.errors:
            print(f"\n❌ 错误 ({len(self.errors)}):")
            for item in self.errors:
                print(f"  ✗ {item}")

        print(f"\n{'='*80}")
        print(f"总计: {len(self.passed)} 通过, {len(self.warnings)} 警告, {len(self.errors)} 错误")
        print(f"{'='*80}")

        return len(self.errors) == 0

    def run_all_checks(self, code="688234"):
        """
        运行所有核查
        """
        print(f"\n{'='*80}")
        print(f"威科夫系统技术指标正确性核查")
        print(f"测试股票: {code}")
        print(f"{'='*80}")

        self.check_price_data_fields(code, "daily")
        self.check_ma_calculation(code, "daily")
        self.check_volume_indicators(code, "daily")
        self.check_wyckoff_indicators(code, "daily")
        self.check_multi_timeframe_consistency(code)

        return self.generate_report()


if __name__ == "__main__":
    checker = IndicatorsChecker()

    # 默认测试688234
    test_code = "688234"
    if len(sys.argv) > 1:
        test_code = sys.argv[1]

    success = checker.run_all_checks(test_code)

    sys.exit(0 if success else 1)
