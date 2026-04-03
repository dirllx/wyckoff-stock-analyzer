#!/usr/bin/env python3
"""为所有周期的数据计算多空线"""
import sqlite3
import pandas as pd
from pathlib import Path

DB_PATH = Path("/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend/wyckoff.db")

def calculate_duokong_for_all_timeframes(stock_code: str):
    """为指定股票的所有周期计算多空线"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 获取stock_id
        cursor.execute("SELECT id FROM stocks WHERE code = ?", (stock_code,))
        result = cursor.fetchone()

        if not result:
            print(f"❌ 股票 {stock_code} 不存在")
            return

        stock_id = result[0]
        print(f"📊 计算 {stock_code} (ID: {stock_id}) 所有周期的多空线...")

        # 所有需要计算的周期
        timeframes = ['30', '60', 'daily', 'weekly', 'monthly']

        for timeframe in timeframes:
            print(f"\n🔄 处理 {timeframe} 周期...")

            # 获取该周期的所有数据
            query = """
                SELECT id, date, close, ma10
                FROM stock_quotes
                WHERE stock_id = ? AND timeframe = ?
                ORDER BY date ASC
            """
            df = pd.read_sql_query(query, conn, params=(stock_id, timeframe))

            if len(df) < 10:
                print(f"  ⚠️  数据不足（只有{len(df)}条），跳过")
                continue

            # 计算多空线：SUM(MA10, 10) / 10.110 * 1.011
            df['duokong_line'] = (df['ma10'].rolling(window=10, min_periods=1).sum() / 10.110) * 1.011

            # 更新数据库
            updated = 0
            for _, row in df.iterrows():
                if pd.notna(row['duokong_line']):
                    cursor.execute("""
                        UPDATE stock_quotes
                        SET duokong_line = ?
                        WHERE id = ?
                    """, (row['duokong_line'], row['id']))
                    updated += 1

            conn.commit()
            print(f"  ✅ 成功更新 {updated} 条记录")

            # 显示最新数据
            if len(df) > 0:
                latest = df.iloc[-1]
                position = "上方" if latest['close'] > latest['duokong_line'] else "下方"
                print(f"  📈 最新数据: 收盘={latest['close']:.2f}, MA10={latest['ma10']:.2f}, 多空线={latest['duokong_line']:.4f}, {position}")

        print(f"\n✅ 所有周期计算完成！")

    except Exception as e:
        print(f"❌ 错误: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    stock_code = sys.argv[1] if len(sys.argv) > 1 else "688234"
    calculate_duokong_for_all_timeframes(stock_code)
