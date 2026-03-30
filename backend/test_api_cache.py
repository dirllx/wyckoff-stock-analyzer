#!/usr/bin/env python3
"""
测试Stocks API的Redis缓存功能
验证分析API是否正确使用了Redis缓存
"""
import requests
import time
from datetime import datetime

API_BASE = "http://localhost:8000/api/v1"
STOCK_CODE = "688234"
TIMEFRAME = "daily"


def print_section(title: str):
    """打印测试区块"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)


def test_analysis_cache():
    """测试分析API的缓存功能"""
    print_section("测试分析API缓存")

    # 第一次请求（缓存未命中）
    print(f"\n🔄 第1次请求（预期：缓存未命中，执行分析）...")
    start = time.time()
    response1 = requests.post(
        f"{API_BASE}/stocks/analyze",
        json={"code": STOCK_CODE, "timeframe": TIMEFRAME}
    )
    elapsed1 = time.time() - start

    if response1.status_code == 200:
        data1 = response1.json()
        from_cache1 = data1.get("from_cache", False)
        print(f"   ✅ 请求成功")
        print(f"   ⏱️ 耗时: {elapsed1:.2f}秒")
        print(f"   📦 来源: {'缓存' if from_cache1 else '数据库'}")
    else:
        print(f"   ❌ 请求失败: {response1.status_code}")
        print(f"   错误: {response1.text}")
        return False

    # 第二次请求（应该命中缓存）
    print(f"\n🔄 第2次请求（预期：缓存命中，快速返回）...")
    start = time.time()
    response2 = requests.post(
        f"{API_BASE}/stocks/analyze",
        json={"code": STOCK_CODE, "timeframe": TIMEFRAME}
    )
    elapsed2 = time.time() - start

    if response2.status_code == 200:
        data2 = response2.json()
        from_cache2 = data2.get("from_cache", False)
        print(f"   ✅ 请求成功")
        print(f"   ⏱️ 耗时: {elapsed2:.2f}秒")
        print(f"   📦 来源: {'缓存 ✅' if from_cache2 else '数据库 ❌'}")

        # 比较两次请求
        speedup = elapsed1 / elapsed2 if elapsed2 > 0 else 1
        print(f"\n   📊 性能提升: {speedup:.1f}x")
        if from_cache2:
            print(f"   ✅ 缓存功能正常工作！")
        else:
            print(f"   ⚠️ 警告：第2次请求未使用缓存")
    else:
        print(f"   ❌ 请求失败: {response2.status_code}")
        return False

    return True


def test_quotes_cache():
    """测试K线数据API的缓存功能"""
    print_section("测试K线数据缓存")

    # 第一次请求
    print(f"\n🔄 第1次请求K线数据...")
    start = time.time()
    response1 = requests.get(
        f"{API_BASE}/stocks/{STOCK_CODE}/quotes",
        params={"timeframe": TIMEFRAME}
    )
    elapsed1 = time.time() - start

    if response1.status_code == 200:
        data1 = response1.json()
        from_cache1 = data1.get("from_cache", False)
        print(f"   ✅ 请求成功")
        print(f"   📊 数据量: {data1.get('total', 0)}条")
        print(f"   ⏱️ 耗时: {elapsed1:.2f}秒")
        print(f"   📦 来源: {'缓存' if from_cache1 else '数据库'}")
    else:
        print(f"   ❌ 请求失败: {response1.status_code}")
        return False

    # 第二次请求
    print(f"\n🔄 第2次请求K线数据...")
    start = time.time()
    response2 = requests.get(
        f"{API_BASE}/stocks/{STOCK_CODE}/quotes",
        params={"timeframe": TIMEFRAME}
    )
    elapsed2 = time.time() - start

    if response2.status_code == 200:
        data2 = response2.json()
        from_cache2 = data2.get("from_cache", False)
        print(f"   ✅ 请求成功")
        print(f"   ⏱️ 耗时: {elapsed2:.2f}秒")
        print(f"   📦 来源: {'缓存 ✅' if from_cache2 else '数据库 ❌'}")

        if from_cache2:
            speedup = elapsed1 / elapsed2 if elapsed2 > 0 else 1
            print(f"   📊 性能提升: {speedup:.1f}x")
            print(f"   ✅ 缓存功能正常工作！")
    else:
        print(f"   ❌ 请求失败: {response2.status_code}")
        return False

    return True


def test_update_clears_cache():
    """测试更新数据后清除缓存"""
    print_section("测试更新数据清除缓存")

    # 先触发一次分析，建立缓存
    print(f"\n🔄 第1步：建立缓存...")
    requests.post(
        f"{API_BASE}/stocks/analyze",
        json={"code": STOCK_CODE, "timeframe": TIMEFRAME}
    )

    # 立即再次请求，应该命中缓存
    print(f"\n🔄 第2步：验证缓存命中...")
    response = requests.post(
        f"{API_BASE}/stocks/analyze",
        json={"code": STOCK_CODE, "timeframe": TIMEFRAME}
    )
    if response.status_code == 200:
        from_cache = response.json().get("from_cache", False)
        print(f"   缓存状态: {'命中 ✅' if from_cache else '未命中 ❌'}")

    # 更新数据（应该清除缓存）
    print(f"\n🔄 第3步：更新数据（应清除缓存）...")
    response = requests.post(
        f"{API_BASE}/stocks/{STOCK_CODE}/update",
        params={"timeframe": TIMEFRAME}
    )
    if response.status_code == 200:
        print(f"   ✅ {response.json().get('message')}")

    # 再次请求，应该未命中缓存
    print(f"\n🔄 第4步：验证缓存已清除...")
    response = requests.post(
        f"{API_BASE}/stocks/analyze",
        json={"code": STOCK_CODE, "timeframe": TIMEFRAME}
    )
    if response.status_code == 200:
        from_cache = response.json().get("from_cache", False)
        print(f"   缓存状态: {'命中 ❌' if from_cache else '未命中 ✅（缓存已清除）'}")

    return True


def test_health_check():
    """测试健康检查中的Redis状态"""
    print_section("测试健康检查Redis状态")

    response = requests.get(f"{API_BASE}/health")
    if response.status_code == 200:
        data = response.json()
        print(f"   整体状态: {data.get('status')}")
        print(f"   数据库: {data.get('database')}")
        print(f"   Redis: {data.get('redis')}")

        # 显示Redis详情
        services = data.get('services', {})
        redis_info = services.get('redis', {})
        print(f"\n   Redis详情:")
        print(f"   - 状态: {redis_info.get('status')}")
        print(f"   - 缓存启用: {redis_info.get('cache_enabled')}")
        print(f"   - URL: {redis_info.get('url')}")
    else:
        print(f"   ❌ 健康检查失败: {response.status_code}")
        return False

    return True


def main():
    """主测试函数"""
    print("\n" + "="*60)
    print("  🔧 Stocks API Redis缓存功能测试")
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
                print("✅ API连接正常")
            else:
                print(f"❌ API返回异常状态: {response.status_code}")
                return
        except Exception as e:
            print(f"❌ 无法连接到API: {e}")
            print("   请确认后端服务已启动: cd backend && python -m uvicorn app.main:app")
            return

        # 运行各项测试
        test_health_check()
        test_analysis_cache()
        test_quotes_cache()
        test_update_clears_cache()

        # 总结
        print_section("测试总结")
        print("✅ 所有测试完成！")
        print("\n💡 验证要点:")
        print("   1. 第2次请求应该比第1次快（使用了缓存）")
        print("   2. from_cache字段应该为True")
        print("   3. 更新数据后缓存应该被清除")
        print("   4. 健康检查应显示Redis状态")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
