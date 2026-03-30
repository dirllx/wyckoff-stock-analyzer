#!/usr/bin/env python3
"""
检查MA计算是否正确 - 直接从数据库读取
"""
import sys
import pandas as pd
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def test_ma_calculation(code="000001", date="2025-03-27"):
    """测试指定日期的MA计算"""
    print(f"\n{'='*60}")
    print(f"检查股票 {code} 在 {date} 的MA计算")
    print(f"{'='*60}\n")

    # 连接数据库
    DATABASE_URL = "sqlite:////Users/dirllx/Claude Code/wyckoff-stock-analyzer/wyckoff.db"
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 查询数据
    query = f"""
    SELECT q.date, q.close, q.ma5, q.ma10, q.ma20, q.ma60, q.ma120, q.ma250
    FROM stock_quotes q
    JOIN stocks s ON q.stock_id = s.id
    WHERE s.code = '{code}' AND q.timeframe = 'daily'
    ORDER BY q.date DESC
    LIMIT 500
    """

    df = pd.read_sql(query, engine)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)

    if df.empty:
        print(f"❌ 未找到股票 {code} 的数据")
        session.close()
        return

    # 找到指定日期的数据
    target_df = df[df['date'] == pd.to_datetime(date)]

    if target_df.empty:
        print(f"❌ 未找到 {date} 的数据")
        print(f"可用日期范围: {df['date'].min()} 到 {df['date'].max()}")
        session.close()
        return

    target_idx = target_df.index[0]

    print(f"📊 {date} 的收盘价: {df.loc[target_idx, 'close']:.2f}\n")

    # 手动计算MA5（前5个收盘价的平均值）
    start_idx = max(0, target_idx - 4)
    ma5_prices = df.loc[start_idx:target_idx, 'close']
    manual_ma5 = ma5_prices.mean()

    print(f"MA5 计算:")
    print(f"  数据库中的值: {df.loc[target_idx, 'ma5']:.4f}")
    print(f"  手动计算值:   {manual_ma5:.4f}")
    print(f"  差异:         {abs(df.loc[target_idx, 'ma5'] - manual_ma5):.4f}")

    if abs(df.loc[target_idx, 'ma5'] - manual_ma5) < 0.01:
        print(f"  ✅ MA5 计算正确\n")
    else:
        print(f"  ❌ MA5 计算错误！\n")
        print(f"  使用的收盘价:")
        for i in ma5_prices.index:
            print(f"    {df.loc[i, 'date'].strftime('%Y-%m-%d')}: {df.loc[i, 'close']:.2f}")
        print()

    # 手动计算MA10
    start_idx = max(0, target_idx - 9)
    ma10_prices = df.loc[start_idx:target_idx, 'close']
    manual_ma10 = ma10_prices.mean()

    print(f"MA10 计算:")
    print(f"  数据库中的值: {df.loc[target_idx, 'ma10']:.4f}")
    print(f"  手动计算值:   {manual_ma10:.4f}")
    print(f"  差异:         {abs(df.loc[target_idx, 'ma10'] - manual_ma10):.4f}")

    if abs(df.loc[target_idx, 'ma10'] - manual_ma10) < 0.01:
        print(f"  ✅ MA10 计算正确\n")
    else:
        print(f"  ❌ MA10 计算错误！\n")

    # 手动计算MA20
    start_idx = max(0, target_idx - 19)
    ma20_prices = df.loc[start_idx:target_idx, 'close']
    manual_ma20 = ma20_prices.mean()

    print(f"MA20 计算:")
    print(f"  数据库中的值: {df.loc[target_idx, 'ma20']:.4f}")
    print(f"  手动计算值:   {manual_ma20:.4f}")
    print(f"  差异:         {abs(df.loc[target_idx, 'ma20'] - manual_ma20):.4f}")

    if abs(df.loc[target_idx, 'ma20'] - manual_ma20) < 0.01:
        print(f"  ✅ MA20 计算正确\n")
    else:
        print(f"  ❌ MA20 计算错误！\n")

    # 手动计算MA60
    start_idx = max(0, target_idx - 59)
    ma60_prices = df.loc[start_idx:target_idx, 'close']
    manual_ma60 = ma60_prices.mean()

    print(f"MA60 计算:")
    print(f"  数据库中的值: {df.loc[target_idx, 'ma60']:.4f}")
    print(f"  手动计算值:   {manual_ma60:.4f}")
    print(f"  差异:         {abs(df.loc[target_idx, 'ma60'] - manual_ma60):.4f}")

    if abs(df.loc[target_idx, 'ma60'] - manual_ma60) < 0.01:
        print(f"  ✅ MA60 计算正确\n")
    else:
        print(f"  ❌ MA60 计算错误！\n")

    # 检查前几条数据（可能出现问题的地方）
    print(f"\n{'='*60}")
    print(f"检查前10条数据的MA计算（可能因min_periods=1而不准确）")
    print(f"{'='*60}\n")

    for i in range(min(10, len(df))):
        print(f"日期: {df.loc[i, 'date'].strftime('%Y-%m-%d')}")
        print(f"  收盘价: {df.loc[i, 'close']:.2f}")
        print(f"  MA5:    {df.loc[i, 'ma5']:.4f}", end='')

        # 前几条数据检查
        if i < 4:
            actual_count = i + 1
            expected_ma = df.loc[0:i, 'close'].mean() if i > 0 else df.loc[0, 'close']
            print(f"  (⚠️ 只用{actual_count}个数据点，应该用5个)")
        else:
            print(f"  (✅ 用了5个数据点)")

        print(f"  MA10:   {df.loc[i, 'ma10']:.4f}", end='')
        if i < 9:
            actual_count = i + 1
            print(f"  (⚠️ 只用{actual_count}个数据点，应该用10个)")
        else:
            print(f"  (✅ 用了10个数据点)")
        print()

    session.close()

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='检查MA计算')
    parser.add_argument('--code', default='000001', help='股票代码')
    parser.add_argument('--date', default='2025-03-27', help='日期 (YYYY-MM-DD)')

    args = parser.parse_args()

    test_ma_calculation(args.code, args.date)
