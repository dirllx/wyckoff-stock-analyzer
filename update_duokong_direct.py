#!/usr/bin/env python3
"""使用原始SQL直接计算多空线"""
import sqlite3
import pandas as pd
from pathlib import Path

DB_PATH = Path("/Users/dirllx/Claude Code/wyckoff-stock-analyzer/wyckoff.db")

def calculate_duokong_for_stock(code: str):
    """为指定股票计算多空线"""
    conn = sqlite3.connect(DB_PATH)

    try:
        # 获取股票ID
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM stocks WHERE code = ?", (code,))
        result = cursor.fetchone()

        if not result:
            print(f"❌ 股票 {code} 不存在")
            return

        stock_id = result[0]
        print(f"📊 计算 {code} (ID: {stock_id}) 的多空线...")

        # 获取所有日线数据
        query = """
            SELECT id, date, close, ma10
            FROM stock_quotes
            WHERE stock_id = ? AND timeframe = 'daily'
            ORDER BY date ASC
        """
        df = pd.read_sql_query(query, conn, params=(stock_id,))

        if len(df) < 10:
            print(f"⚠️  数据不足（只有{len(df)}条），无法计算多空线")
            return

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
        print(f"✅ 成功更新 {updated} 条记录")

        # 显示最新数据
        if len(df) > 0:
            latest = df.iloc[-1]
            print(f"\n📈 最新数据 ({latest['date']}):")
            print(f"  收盘价: {latest['close']}")
            print(f"  MA10: {latest['ma10']}")
            print(f"  多空线: {latest['duokong_line']}")
            position = "上方" if latest['close'] > latest['duokong_line'] else "下方"
            print(f"  位置: 价格在多空线{position}")

    except Exception as e:
        print(f"❌ 错误: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    stock_code = sys.argv[1] if len(sys.argv) > 1 else "688234"
    calculate_duokong_for_stock(stock_code)
