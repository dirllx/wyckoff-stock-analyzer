#!/usr/bin/env python3
"""
Ashare 数据源稳定性测试

测试 ashare 数据源的稳定性、成功率和响应时间
"""
import time
import sys
from datetime import datetime, timedelta
from loguru import logger

# 添加后端路径
sys.path.insert(0, '/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend')

from app.services.data.ashare_fetcher import AshareFetcher


def test_ashare_stability():
    """测试 ashare 数据源稳定性"""

    print("=" * 60)
    print("Ashare 数据源稳定性测试")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    fetcher = AshareFetcher()

    # 测试股票列表（不同类型）
    test_stocks = [
        # A股主板
        ("000001", "平安银行", "主板"),
        ("600000", "浦发银行", "主板"),
        ("600036", "招商银行", "主板"),
        ("600519", "贵州茅台", "主板"),

        # 科创板
        ("688234", "天岳先进", "科创板"),
        ("688052", "纳芯微", "科创板"),
        ("688050", "爱博医疗", "科创板"),

        # 创业板
        ("300347", "泰格医药", "创业板"),
        ("300760", "迈瑞医疗", "创业板"),

        # B股
        ("02157", "鲁泰", "B股"),
    ]

    # 测试时间周期
    test_timeframes = ['daily', 'weekly', '30', '60']

    results = {
        'total': 0,
        'success': 0,
        'failed': 0,
        'errors': [],
        'response_times': []
    }

    print(f"测试配置:")
    print(f"  股票数量: {len(test_stocks)} 只")
    print(f"  时间周期: {', '.join(test_timeframes)}")
    print(f"  总测试次数: {len(test_stocks) * len(test_timeframes)}")
    print()

    print("-" * 60)
    print("开始测试...")
    print("-" * 60)

    for i, (code, name, market) in enumerate(test_stocks, 1):
        for timeframe in test_timeframes:
            results['total'] += 1

            # 计算测试日期范围
            end_date = datetime.now().strftime('%Y-%m-%d')
            if timeframe == 'daily':
                start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            elif timeframe == 'weekly':
                start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
            else:
                # 分钟线只获取最近几天
                start_date = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')

            test_name = f"[{i}/{len(test_stocks)}] {code} ({name}) - {timeframe}"

            try:
                start_time = time.time()

                # 调用 ashare 获取数据
                data = fetcher.get_stock_quotes(
                    code=code,
                    timeframe=timeframe,
                    start_date=start_date,
                    end_date=end_date
                )

                elapsed = time.time() - start_time
                results['response_times'].append(elapsed)

                if data and len(data) > 0:
                    results['success'] += 1
                    status = "✅"
                    count = len(data)
                    logger.info(f"{test_name} 成功 - {count}条数据, {elapsed*1000:.0f}ms")
                else:
                    results['failed'] += 1
                    status = "⚠️ 空数据"
                    logger.warning(f"{test_name} 失败 - 返回空数据")
                    results['errors'].append(f"{code} {timeframe}: 空数据")

            except Exception as e:
                results['failed'] += 1
                status = f"❌ {str(e)[:30]}"
                logger.error(f"{test_name} 失败 - {e}")
                results['errors'].append(f"{code} {timeframe}: {str(e)}")

            # 短暂延迟，避免请求过快
            time.sleep(0.1)

    # 输出测试结果
    print()
    print("-" * 60)
    print("测试结果汇总")
    print("-" * 60)

    success_rate = (results['success'] / results['total'] * 100) if results['total'] > 0 else 0

    print(f"总测试次数: {results['total']}")
    print(f"成功次数: {results['success']}")
    print(f"失败次数: {results['failed']}")
    print(f"成功率: {success_rate:.1f}%")

    if results['response_times']:
        avg_time = sum(results['response_times']) / len(results['response_times'])
        max_time = max(results['response_times'])
        min_time = min(results['response_times'])
        print(f"\n响应时间:")
        print(f"  平均: {avg_time*1000:.0f}ms")
        print(f"  最快: {min_time*1000:.0f}ms")
        print(f"  最慢: {max_time*1000:.0f}ms")

    if results['errors']:
        print(f"\n失败详情 ({len(results['errors'])}条):")
        for error in results['errors'][:10]:  # 只显示前10条
            print(f"  - {error}")
        if len(results['errors']) > 10:
            print(f"  ... 还有 {len(results['errors']) - 10} 条")

    print()
    print("=" * 60)

    # 判断测试结果
    if success_rate >= 95:
        print("🎉 测试通过！Ashare 数据源稳定性良好")
        return True
    elif success_rate >= 80:
        print("⚠️ 测试一般，成功率低于95%")
        return False
    else:
        print("❌ 测试失败！Ashare 数据源不稳定")
        return False


def test_continuous_requests():
    """测试连续请求的稳定性"""

    print("\n" + "=" * 60)
    print("连续请求稳定性测试")
    print("=" * 60)
    print()

    fetcher = AshareFetcher()
    test_code = "000001"
    test_count = 20
    interval = 0.5  # 每次请求间隔0.5秒

    print(f"测试股票: {test_code}")
    print(f"请求次数: {test_count}")
    print(f"请求间隔: {interval}秒")
    print()

    results = {
        'success': 0,
        'failed': 0,
        'response_times': []
    }

    for i in range(test_count):
        try:
            start_time = time.time()

            data = fetcher.get_stock_quotes(
                code=test_code,
                timeframe='daily',
                start_date=(datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
                end_date=datetime.now().strftime('%Y-%m-%d')
            )

            elapsed = time.time() - start_time

            if data and len(data) > 0:
                results['success'] += 1
                results['response_times'].append(elapsed)
                print(f"  [{i+1:2d}/{test_count}] ✅ 成功 - {len(data)}条, {elapsed*1000:.0f}ms")
            else:
                results['failed'] += 1
                print(f"  [{i+1:2d}/{test_count}] ⚠️  空数据")

        except Exception as e:
            results['failed'] += 1
            print(f"  [{i+1:2d}/{test_count}] ❌ 失败 - {str(e)[:40]}")

        time.sleep(interval)

    print()
    print(f"连续测试结果:")
    print(f"  成功: {results['success']}/{test_count}")
    print(f"  失败: {results['failed']}/{test_count}")

    if results['response_times']:
        avg_time = sum(results['response_times']) / len(results['response_times'])
        print(f"  平均响应时间: {avg_time*1000:.0f}ms")

    success_rate = (results['success'] / test_count * 100)
    if success_rate >= 95:
        print(f"  成功率: {success_rate:.1f}% ✅")
    else:
        print(f"  成功率: {success_rate:.1f}% ⚠️")

    return success_rate >= 95


if __name__ == '__main__':
    # 运行测试
    test1_pass = test_ashare_stability()
    test2_pass = test_continuous_requests()

    print("\n" + "=" * 60)
    print("总体测试结论")
    print("=" * 60)

    if test1_pass and test2_pass:
        print("✅ Ashare 数据源稳定，可以正常使用")
        sys.exit(0)
    else:
        print("⚠️ Ashare 数据源存在问题，建议检查")
        sys.exit(1)
