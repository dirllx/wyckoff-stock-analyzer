"""
测试威科夫分析器
"""
import pytest
import pandas as pd
from app.services.analysis.wyckoff_analyzer import WyckoffAnalyzer


@pytest.mark.unit
def test_analyzer_initialization():
    """测试分析器初始化"""
    analyzer = WyckoffAnalyzer()
    assert analyzer is not None


@pytest.mark.unit
def test_analyze_with_insufficient_data():
    """测试数据不足时的处理"""
    analyzer = WyckoffAnalyzer()

    # 只有10条数据，不足20条
    data = pd.DataFrame({
        "date": pd.date_range("2024-01-01", periods=10),
        "open": [100] * 10,
        "high": [105] * 10,
        "low": [98] * 10,
        "close": [103] * 10,
        "volume": [1000000] * 10
    })

    result = analyzer.analyze(data)

    # 应该返回错误结果
    assert result["status"] == "error"
    assert "数据不足" in result["message"]


@pytest.mark.unit
def test_analyze_with_sufficient_data():
    """测试数据充足时的分析"""
    analyzer = WyckoffAnalyzer()

    # 创建500条模拟数据
    dates = pd.date_range("2022-01-01", periods=500)
    data = pd.DataFrame({
        "date": dates,
        "open": [100 + i * 0.1 for i in range(500)],
        "high": [105 + i * 0.1 for i in range(500)],
        "low": [98 + i * 0.1 for i in range(500)],
        "close": [103 + i * 0.1 for i in range(500)],
        "volume": [1000000 + i * 1000 for i in range(500)]
    })

    result = analyzer.analyze(data)

    # 应该返回成功结果
    assert result["status"] == "success"
    assert "phase" in result
    assert "signals" in result
    assert result["phase"] in ["U", "D", "A", "DS", "震荡"]


@pytest.mark.unit
def test_detect_phase_uptrend():
    """测试上涨趋势识别"""
    analyzer = WyckoffAnalyzer()

    # 创建明显的上涨趋势数据
    data = pd.DataFrame({
        "date": pd.date_range("2024-01-01", periods=100),
        "open": [100 + i * 0.5 for i in range(100)],
        "high": [105 + i * 0.5 for i in range(100)],
        "low": [98 + i * 0.5 for i in range(100)],
        "close": [103 + i * 0.5 for i in range(100)],
        "volume": [1000000 + i * 5000 for i in range(100)]
    })

    result = analyzer.analyze(data)

    # 应该识别为上涨或累积阶段
    assert result["status"] == "success"
    assert result["phase"] in ["U", "A"]


@pytest.mark.unit
def test_detect_phase_downtrend():
    """测试下跌趋势识别"""
    analyzer = WyckoffAnalyzer()

    # 创建明显的下跌趋势数据
    data = pd.DataFrame({
        "date": pd.date_range("2024-01-01", periods=100),
        "open": [200 - i * 0.5 for i in range(100)],
        "high": [205 - i * 0.5 for i in range(100)],
        "low": [198 - i * 0.5 for i in range(100)],
        "close": [203 - i * 0.5 for i in range(100)],
        "volume": [1000000 + i * 5000 for i in range(100)]
    })

    result = analyzer.analyze(data)

    # 应该识别为下跌或分发阶段
    assert result["status"] == "success"
    assert result["phase"] in ["D", "DS"]


@pytest.mark.unit
def test_calculate_ma():
    """测试MA计算"""
    analyzer = WyckoffAnalyzer()

    data = pd.DataFrame({
        "date": pd.date_range("2024-01-01", periods=100),
        "close": [100 + i for i in range(100)]
    })

    result = analyzer.analyze(data)

    # 检查MA是否计算
    assert result["status"] == "success"
    # MA5应该是最近5天的平均值
