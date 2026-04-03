#!/usr/bin/env python3
"""
简单的API测试框架

用于快速测试后端API的功能和性能
"""
import requests
import json
import time
from typing import Dict, Any, List
from datetime import datetime

class APITester:
    """简单的API测试器"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []

    def test_endpoint(self, method: str, endpoint: str, data: Dict = None,
                     params: Dict = None, expected_status: int = 200) -> Dict[str, Any]:
        """
        测试API端点

        Args:
            method: HTTP方法 (GET/POST)
            endpoint: API端点路径
            data: POST请求体
            params: URL参数
            expected_status: 期望的HTTP状态码

        Returns:
            测试结果字典
        """
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()

        try:
            if method.upper() == "GET":
                response = self.session.get(url, params=params, timeout=10)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, params=params, timeout=10)
            else:
                raise ValueError(f"不支持的HTTP方法: {method}")

            elapsed_time = time.time() - start_time

            success = response.status_code == expected_status

            result = {
                "endpoint": endpoint,
                "method": method,
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "elapsed_time": round(elapsed_time * 1000, 2),  # 毫秒
                "response_size": len(response.content),
                "timestamp": datetime.now().isoformat()
            }

            if success:
                try:
                    result["data"] = response.json()
                except:
                    result["data"] = response.text[:100]  # 前100字符
            else:
                result["error"] = response.text[:200]

            self.results.append(result)
            return result

        except Exception as e:
            return {
                "endpoint": endpoint,
                "method": method,
                "success": False,
                "error": str(e),
                "elapsed_time": round((time.time() - start_time) * 1000, 2)
            }

    def print_results(self):
        """打印测试结果"""
        print("\n" + "=" * 80)
        print("API测试结果汇总")
        print("=" * 80)

        total = len(self.results)
        success = sum(1 for r in self.results if r.get("success", False))
        failed = total - success

        print(f"\n总测试数: {total}")
        print(f"✅ 成功: {success}")
        print(f"❌ 失败: {failed}")

        if total > 0:
            avg_time = sum(r.get("elapsed_time", 0) for r in self.results) / total
            print(f"⏱️  平均响应时间: {avg_time:.2f}ms")

        print("\n详细结果:")
        print("-" * 80)

        for i, result in enumerate(self.results, 1):
            status_icon = "✅" if result.get("success") else "❌"
            print(f"\n{i}. {status_icon} {result['method']} {result['endpoint']}")
            print(f"   状态码: {result.get('status_code', 'N/A')} (期望: {result.get('expected_status', 'N/A')})")
            print(f"   响应时间: {result.get('elapsed_time', 'N/A')}ms")

            if result.get("success"):
                data = result.get("data", {})
                if isinstance(data, dict):
                    if "total" in data:
                        print(f"   数据: {data.get('total', 0)} 条记录")
                    elif "status" in data:
                        print(f"   状态: {data.get('status', 'N/A')}")
            else:
                print(f"   错误: {result.get('error', 'Unknown error')}")

        print("\n" + "=" * 80)

    def save_results(self, filename: str = "test_results.json"):
        """保存测试结果到文件"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        print(f"\n✅ 测试结果已保存到: {filename}")


def run_tests():
    """运行测试套件"""
    tester = APITester()

    print("开始API测试...")
    print("=" * 80)

    # 测试1: 健康检查
    print("\n[1/5] 测试健康检查API...")
    tester.test_endpoint("GET", "/api/v1/health")

    # 测试2: 获取关注列表
    print("\n[2/5] 测试获取关注列表...")
    tester.test_endpoint("GET", "/api/v1/watchlist?watch_type=favorite")

    # 测试3: 批量获取行情
    print("\n[3/5] 测试批量获取行情...")
    tester.test_endpoint("POST", "/api/v1/bulk-quotes", data={
        "codes": ["688234"],
        "timeframe": "30",
        "limit": 5
    })

    # 测试4: 股票分析
    print("\n[4/5] 测试股票分析...")
    tester.test_endpoint("POST", "/api/v1/stocks/analyze", data={
        "code": "688234",
        "timeframe": "daily"
    })

    # 测试5: 获取K线数据
    print("\n[5/5] 测试获取K线数据...")
    tester.test_endpoint("GET", "/api/v1/stocks/688234/quotes?timeframe=daily&limit=10")

    # 打印结果
    tester.print_results()

    # 保存结果
    tester.save_results("test_results_api.json")

    return tester


if __name__ == "__main__":
    try:
        tester = run_tests()

        # 如果有失败的测试，返回错误码
        failed = sum(1 for r in tester.results if not r.get("success", False))
        if failed > 0:
            exit(1)
        else:
            print("\n🎉 所有测试通过！")
            exit(0)

    except KeyboardInterrupt:
        print("\n\n测试被中断")
        exit(130)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
