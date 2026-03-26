#!/usr/bin/env python3
"""
重新计算所有股票的所有 MA 值
"""
import pandas as pd
from sqlalchemy import create_engine, text

# 创建数据库连接
DATABASE_URL = "sqlite:////Users/dirllx/Claude Code/wyckoff-stock-analyzer/wyckoff.db"
engine = create_engine(DATABASE_URL, echo=False)


def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    计算技术指标

    Args:
        df: K线数据

    Returns:
        带技术指标的DataFrame
    """
    # 确保日期是datetime类型
    if not pd.api.types.is_datetime64_any_dtype(df["date"]):
        df["date"] = pd.to_datetime(df["date"])

    # 按日期排序
    df = df.sort_values("date")

    # 计算移动平均线
    df["ma5"] = df["close"].rolling(window=5, min_periods=1).mean()
    df["ma10"] = df["close"].rolling(window=10, min_periods=1).mean()
    df["ma15"] = df["close"].rolling(window=15, min_periods=1).mean()
    df["ma20"] = df["close"].rolling(window=20, min_periods=1).mean()
    df["ma30"] = df["close"].rolling(window=30, min_periods=1).mean()
    df["ma60"] = df["close"].rolling(window=60, min_periods=1).mean()
    df["ma90"] = df["close"].rolling(window=90, min_periods=1).mean()
    df["ma120"] = df["close"].rolling(window=120, min_periods=1).mean()
    df["ma250"] = df["close"].rolling(window=250, min_periods=1).mean()

    # 计算成交量均线
    df["volume_ma5"] = df["volume"].rolling(window=5, min_periods=1).mean()

    # 计算OBV (能量潮)
    obv = [0]
    for i in range(1, len(df)):
        if df.iloc[i]["close"] > df.iloc[i-1]["close"]:
            obv.append(obv[-1] + df.iloc[i]["volume"])
        elif df.iloc[i]["close"] < df.iloc[i-1]["close"]:
            obv.append(obv[-1] - df.iloc[i]["volume"])
        else:
            obv.append(obv[-1])
    df["obv"] = obv

    return df


def main():
    print("=" * 50)
    print("开始重新计算所有 MA 值")
    print("=" * 50)

    with engine.connect() as conn:
        # 获取所有股票
        result = conn.execute(text("SELECT id, code, name FROM stocks"))
        stocks = result.fetchall()
        print(f"\n找到 {len(stocks)} 只股票")

        total_updated = 0

        for stock_id, stock_code, stock_name in stocks:
            print(f"\n处理股票: {stock_code} - {stock_name}")

            # 获取日线数据
            query = text("""
                SELECT id, date, open, high, low, close, volume, amount
                FROM stock_quotes
                WHERE stock_id = :stock_id AND timeframe = 'daily'
                ORDER BY date ASC
            """)
            result = conn.execute(query, {"stock_id": stock_id})
            rows = result.fetchall()

            if not rows:
                print(f"  跳过: 没有K线数据")
                continue

            print(f"  找到 {len(rows)} 条K线数据")

            # 转换为DataFrame
            data = []
            quote_ids = []
            for row in rows:
                quote_ids.append(row[0])
                data.append({
                    "date": row[1],
                    "open": row[2],
                    "high": row[3],
                    "low": row[4],
                    "close": row[5],
                    "volume": row[6] if row[6] else 0,
                    "amount": row[7]
                })
            df = pd.DataFrame(data)

            # 计算所有技术指标
            df = calculate_indicators(df)

            # 更新每条记录
            for i, quote_id in enumerate(quote_ids):
                update_query = text("""
                    UPDATE stock_quotes
                    SET ma5 = :ma5,
                        ma10 = :ma10,
                        ma15 = :ma15,
                        ma20 = :ma20,
                        ma30 = :ma30,
                        ma60 = :ma60,
                        ma90 = :ma90,
                        ma120 = :ma120,
                        ma250 = :ma250,
                        volume_ma5 = :volume_ma5,
                        obv = :obv
                    WHERE id = :quote_id
                """)

                conn.execute(update_query, {
                    "quote_id": quote_id,
                    "ma5": df.iloc[i]["ma5"],
                    "ma10": df.iloc[i]["ma10"],
                    "ma15": df.iloc[i]["ma15"],
                    "ma20": df.iloc[i]["ma20"],
                    "ma30": df.iloc[i]["ma30"],
                    "ma60": df.iloc[i]["ma60"],
                    "ma90": df.iloc[i]["ma90"],
                    "ma120": df.iloc[i]["ma120"],
                    "ma250": df.iloc[i]["ma250"],
                    "volume_ma5": df.iloc[i]["volume_ma5"],
                    "obv": df.iloc[i]["obv"]
                })

            conn.commit()

            total_updated += len(quote_ids)

            # 显示最新一条数据
            last_idx = len(quote_ids) - 1
            last_date = df.iloc[last_idx]["date"].strftime("%Y-%m-%d")
            print(f"  ✓ 已更新 {len(quote_ids)} 条记录")
            print(f"  最新日期: {last_date}")
            print(f"  MA5={df.iloc[last_idx]['ma5']:.2f}, MA10={df.iloc[last_idx]['ma10']:.2f}, MA15={df.iloc[last_idx]['ma15']:.2f}, MA20={df.iloc[last_idx]['ma20']:.2f}")

        print(f"\n{'=' * 50}")
        print(f"✓ 完成！共更新 {total_updated} 条K线数据的MA值")
        print(f"{'=' * 50}")

        # 验证 2026-01-15 的数据
        print(f"\n验证 2026-01-15 的数据:")
        verify_query = text("""
            SELECT date, close, ma5, ma10, ma15, ma20, ma30, ma60, ma90, ma120, ma250
            FROM stock_quotes
            WHERE date LIKE '2026-01-15%'
            LIMIT 1
        """)
        result = conn.execute(verify_query)
        row = result.fetchone()

        if row:
            date_str = row[0] if isinstance(row[0], str) else row[0].strftime('%Y-%m-%d')
            print(f"  日期: {date_str}")
            mas = ['ma5', 'ma10', 'ma15', 'ma20', 'ma30', 'ma60', 'ma90', 'ma120', 'ma250']
            ma_values = [row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10]]
            for ma_name, ma_value in zip(mas, ma_values):
                status = '✓' if ma_value and not pd.isna(ma_value) else '✗'
                value_str = f"{ma_value:.2f}" if ma_value and not pd.isna(ma_value) else "NULL"
                print(f"  {status} {ma_name}: {value_str}")


if __name__ == "__main__":
    main()
