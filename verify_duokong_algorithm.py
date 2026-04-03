#!/usr/bin/env python3
"""
验证多空线算法的正确性

通达信公式：
XYZ:=SUM(MA(CLOSE,10),10)/10.110;
多空线:XYZ*1.011

公式解析：
1. MA(CLOSE,10) - 计算10日均线
2. SUM(MA(CLOSE,10),10) - 对最近10天的MA10值求和
3. /10.110 - 除以10.110
4. *1.011 - 乘以1.011
"""

import sys
from pathlib import Path
import pandas as pd
import numpy as np

# 添加backend目录到Python路径
backend_root = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_root))

from app.database import SessionLocal
from app.models.database import Stock, StockQuote

def calculate_duokong_tdx(df: pd.DataFrame) -> pd.Series:
    """
    按照通达信公式计算多空线

    XYZ:=SUM(MA(CLOSE,10),10)/10.110;
    多空线:XYZ*1.011
    """
    # 1. 计算10日均线
    df['ma10'] = df['close'].rolling(window=10, min_periods=10).mean()

    # 2. 对最近10天的MA10值求和
    # 注意：通达信的SUM函数要求至少有10个数据
    df['xyz'] = df['ma10'].rolling(window=10, min_periods=10).sum()

    # 3. 除以10.110
    df['xyz_div'] = df['xyz'] / 10.110

    # 4. 乘以1.011
    df['duokong_tdx'] = df['xyz_div'] * 1.011

    return df['duokong_tdx']

def calculate_duokong_current(df: pd.DataFrame) -> pd.Series:
    """
    当前实现（可能有问题）
    """
    df['ma10'] = df['close'].rolling(window=10, min_periods=1).mean()
    df['duokong_current'] = (df['ma10'].rolling(window=10, min_periods=1).sum() / 10.110) * 1.011
    return df['duokong_current']

def verify_duokong(code: str = '688234', timeframe: str = 'daily'):
    """验证多空线算法"""
    db = SessionLocal()

    try:
        # 获取股票
        stock = db.query(Stock).filter(Stock.code == code).first()
        if not stock:
            print(f"❌ 股票 {code} 不存在")
            return

        # 获取K线数据
        quotes = db.query(StockQuote).filter(
            StockQuote.stock_id == stock.id,
            StockQuote.timeframe == timeframe
        ).order_by(StockQuote.date.asc()).limit(30).all()

        if len(quotes) < 10:
            print(f"❌ 数据不足，至少需要10条数据，当前只有{len(quotes)}条")
            return

        # 转换为DataFrame
        data = []
        for q in quotes:
            data.append({
                'date': q.date,
                'open': q.open,
                'high': q.high,
                'low': q.low,
                'close': q.close,
                'volume': q.volume,
                'duokong_db': q.duokong_line,  # 数据库中的值
                'ma10_db': q.ma10  # 数据库中的MA10
            })

        df = pd.DataFrame(data)

        # 计算通达信公式多空线
        df['duokong_tdx'] = calculate_duokong_tdx(df)

        # 计算当前实现多空线
        df['duokong_calc'] = calculate_duokong_current(df)

        # 打印对比结果
        print(f"\n{'='*100}")
        print(f"股票代码: {code} - {stock.name}")
        print(f"时间周期: {timeframe}")
        print(f"{'='*100}\n")

        print(f"{'日期':<12} {'收盘':>8} {'MA10(DB)':>10} {'多空(DB)':>10} {'多空(TDX)':>10} {'多空(calc)':>10} {'差异':>10}")
        print(f"{'-'*100}")

        for i, row in df.iterrows():
            if i < 9:  # 前9条数据不足10个周期，通达信公式不计算
                print(f"{str(row['date'])[:10]:<12} {row['close']:>8.2f} {row['ma10_db']:>10.2f} {row['duokong_db']:>10.2f} {'N/A':>10} {row['duokong_calc']:>10.2f} {'-':>10}")
            else:
                diff_db_tdx = abs(row['duokong_db'] - row['duokong_tdx']) if row['duokong_db'] and row['duokong_tdx'] else 0
                diff_db_calc = abs(row['duokong_db'] - row['duokong_calc']) if row['duokong_db'] and row['duokong_calc'] else 0
                print(f"{str(row['date'])[:10]:<12} {row['close']:>8.2f} {row['ma10_db']:>10.2f} {row['duokong_db']:>10.2f} {row['duokong_tdx']:>10.2f} {row['duokong_calc']:>10.2f} {diff_db_calc:>10.4f}")

        # 分析差异
        print(f"\n{'='*100}")
        print("差异分析:")
        valid_data = df[df['duokong_tdx'].notna()]
        if len(valid_data) > 0:
            max_diff = (valid_data['duokong_db'] - valid_data['duokong_tdx']).abs().max()
            avg_diff = (valid_data['duokong_db'] - valid_data['duokong_tdx']).abs().mean()
            print(f"数据库值 vs 通达信公式值: 最大差异={max_diff:.4f}, 平均差异={avg_diff:.4f}")

            if max_diff > 0.01:
                print("⚠️  发现显著差异！当前算法可能不正确")
            else:
                print("✅ 差异很小，算法基本正确")
        else:
            print("⚠️  没有足够的数据进行对比")

    finally:
        db.close()

if __name__ == "__main__":
    print("\n🔍 验证多空线算法正确性\n")
    verify_duokong('688234', 'daily')
    print()
