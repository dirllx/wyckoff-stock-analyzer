#!/usr/bin/env python3
"""
测试多周期分析API的Redis缓存功能
验证多周期分析是否正确使用了Redis缓存
"""
import requests
import time
from datetime import datetime

API_BASE = "http://localhost:8000/api/v1"
STOCK_CODE = "688234"


def print_section(title: str):
    """打印测试区块"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)


def test_multi_timeframe_cache():
    """测试多周期分析API的缓存功能"""
    print_section("测试多周期分析缓存")

    # 第1次请求（缓存未命中）
    print(f"\n🔄 第1次请求（预期：缓存未命中，执行完整分析）...")
    start = time.time()
    response1 = requests.post(
        f"{API_BASE}/stocks/{STOCK_CODE}/analyze-multi"
    )
    elapsed1 = time.time() - start

    if response1.status_code == 200:
        data1 = response1.json()
        from_cache1 = data1.get("from_cache", False)
        cache_stats1 = data1.get("cache_stats", {})

        print(f"   ✅ 请求成功")
        print(f"   ⏱️ 耗时: {elapsed1:.2f}秒")
        print(f"   📦 来源: {'缓存' if from_cache1 else '数据库'}")

        # 显示缓存统计
        if cache_stats1:
            print(f"   📊 缓存统计:")
            print(f"      - 命中数量: {cache_stats1.get('cache_hit_count', 0)}/{cache_stats1.get('total_timeframes', 0)}")
            print(f"      - 命中率: {cache_stats1.get('cache_hit_rate', 0)}%")
    else:
        print(f"   ❌ 请求失败: {response1.status_code}")
        print(f"   错误: {response1.text}")
        return False

    # 第2次请求（应该命中缓存）
    print(f"\n🔄 第2次请求（预期：缓存命中，快速返回）...")
    start = time.time()
    response2 = requests.post(
        f"{API_BASE}/stocks/{STOCK_CODE}/analyze-multi"
    )
    elapsed2 = time.time() - start

    if response2.status_code == 200:
        data2 = response2.json()
        from_cache2 = data2.get("from_cache", False)
        cache_stats2 = data2.get("cache_stats", {})

        print(f"   ✅ 请求成功")
        print(f"   ⏱️ 耗时: {elapsed2:.2f}秒")
        print(f"   📦 来源: {'缓存 ✅' if from_cache2 else '数据库 ❌'}")

        # 显示缓存统计
        if cache_stats2:
            print(f"   📊 缓存统计:")
            print(f"      - 命中数量: {cache_stats2.get('cache_hit_count', 0)}/{cache_stats2.get('total_timeframes', 0)}")
            print(f"      - 命中率: {cache_stats2.get('cache_hit_rate', 0)}%")

        # 比较两次请求
        if elapsed2 > 0:
            speedup = elapsed1 / elapsed2
            print(f"\n   📊 性能提升: {speedup:.1f}x")

        if from_cache2:
            print(f"   ✅ 缓存功能正常工作！")
        else:
            print(f"   ⚠️ 警告：第2次请求未使用缓存")
    else:
        print(f"   ❌ 请求失败: {response2.status_code}")
        return False

    return True


def test_detailed_timeframe_comparison():
    """测试详细的多周期对比"""
    print_section("详细多周期数据对比")

    response = requests.post(
        f"{API_BASE}/stocks/{STOCK_CODE}/analyze-multi"
    )

    if response.status_code == 200:
        data = response.json()

        print(f"\n📊 股票代码: {data.get('stock_code')}")
        print(f"   分析周期数: {len(data.get('timeframes', {}))}")

        # 显示每个周期的分析结果
        timeframes = data.get("timeframes", {})
        for tf, result in timeframes.items():
            print(f"\n   {tf}:")
            if "status" in result:
                print(f"      状态: {result.get('status')}")
                print(f"      消息: {result.get('message')}")
            else:
                print(f"      阶段: {result.get('wyckoff_phase', 'N/A')}")
                print(f"      方向: {result.get('direction', 'N/A')}")
                print(f"      评分: {result.get('score', 'N/A')}")
                print(f"      置信度: {result.get('confidence', 'N/A')}")

        # 显示综合摘要
        summary = data.get("summary", {})
        print(f"\n   📈 综合摘要:")
        print(f"      方向: {summary.get('direction')}")
        print(f"      建议: {summary.get('suggestion')}")
        print(f"      一致性: {summary.get('consistency')}")
        print(f"      消息: {summary.get('message')}")

        # 显示缓存统计
        cache_stats = data.get("cache_stats", {})
        if cache_stats:
            print(f"\n   💾 缓存统计:")
            print(f"      缓存命中: {cache_stats.get('cache_hit_count')}/{cache_stats.get('total_timeframes')}")
            print(f"      命中率: {cache_stats.get('cache_hit_rate')}%")
    else:
        print(f"   ❌ 请求失败: {response.status_code}")
        return False

    return True


def test_concurrent_requests():
    """测试连续多次请求的缓存效果"""
    print_section("连续请求缓存测试")

    print(f"\n🔄 连续发起3次请求...")
    results = []

    for i in range(3):
        start = time.time()
        response = requests.post(
            f"{API_BASE}/stocks/{STOCK_CODE}/analyze-multi"
        )
        elapsed = time.time() - start

        if response.status_code == 200:
            data = response.json()
            from_cache = data.get("from_cache", False)
            cache_hit_rate = data.get("cache_stats", {}).get("cache_hit_rate", 0)

            results.append({
                "request": i + 1,
                "elapsed": elapsed,
                "from_cache": from_cache,
                "cache_hit_rate": cache_hit_rate
            })

            print(f"\n   第{i+1}次请求:")
            print(f"      耗时: {elapsed:.2f}秒")
            print(f"      来源: {'缓存 ✅' if from_cache else '数据库'}")
            print(f"      命中率: {cache_hit_rate}%")

        time.sleep(0.5)  # 间隔0.5秒

    # 分析结果
    cache_requests = sum(1 for r in results if r["from_cache"])
    print(f"\n   📊 统计结果:")
    print(f"      总请求数: {len(results)}")
    print(f"      缓存命中: {cache_requests}次")
    print(f"      数据库查询: {len(results) - cache_requests}次")

    if results:
        avg_time_db = sum(r["elapsed"] for r in results if not r["from_cache"]) / (len(results) - cache_requests) if (len(results) - cache_requests) > 0 else 0
        avg_time_cache = sum(r["elapsed"] for r in results if r["from_cache"]) / cache_requests if cache_requests > 0 else 0

        print(f"\n   ⏱️ 平均耗时:")
        print(f"      数据库查询: {avg_time_db:.2f}秒")
        print(f"      缓存查询: {avg_time_cache:.2f}秒")

        if avg_time_cache > 0 and avg_time_db > 0:
            speedup = avg_time_db / avg_time_cache
            print(f"      加速比: {speedup:.1f}x")

    return True


def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("  🔧 多周期分析API Redis缓存功能测试")
    print("="*60)
    print(f"  测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  API地址: {API_BASE}")
    print(f"  测试股票: {STOCK_CODE}")

    try:
        # 检查API连接
        print_section("API连接检查")
        try:
            response = requests.get(f"{API_BASE}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print("✅ API连接正常")
                print(f"   Redis状态: {data.get('redis')}")
            else:
                print(f"❌ API返回异常状态: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ 无法连接到API: {e}")
            print("   请确认后端服务已启动: cd backend && python -m uvicorn app.main:app")
            return

        # 运行各项测试
        test_multi_timeframe_cache()
        test_detailed_timeframe_comparison()
        test_concurrent_requests()

        # 总结
        print_section("测试总结")
        print("✅ 所有测试完成！")
        print("\n💡 验证要点:")
        print("   1. 第2次请求应该比第1次快（使用了缓存）")
        print("   2. from_cache字段应该为True")
        print("   3. cache_stats应显示缓存命中率")
        print("   4. 连续请求的缓存命中率应很高")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
