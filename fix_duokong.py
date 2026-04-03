#!/usr/bin/env python3
"""修复多空线计算"""
import sqlite3
import pandas as pd

DB_PATH = "/Users/dirllx/Claude Code/wyckoff-stock-analyzer/backend/wyckoff.db"

def fix_duokong(stock_code: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 获取stock_id
    cursor.execute("SELECT id FROM stocks WHERE code = ?", (stock_code,))
    result = cursor.fetchone()
    if not result:
        print(f"❌ 股票 {stock_code} 不存在")
        return

    stock_id = result[0]
    print(f"📊 修复 {stock_code} (ID: {stock_id}) 的多空线...")

    # 获取日线数据
    query = """
        SELECT id, date, close, ma10
        FROM stock_quotes
        WHERE stock_id = ? AND timeframe = 'daily'
        ORDER BY date ASC
    """
    df = pd.read_sql_query(query, conn, params=(stock_id,))

    if len(df) < 10:
        print(f"⚠️  数据不足")
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
    latest = df.iloc[-1]
    print(f"\n📈 最新数据 ({latest['date']}):")
    print(f"  收盘价: {latest['close']}")
    print(f"  MA10: {latest['ma10']}")
    print(f"  多空线: {latest['duokong_line']:.4f}")
    position = "上方" if latest['close'] > latest['duokong_line'] else "下方"
    print(f"  位置: 价格在多空线{position}")

    conn.close()

if __name__ == "__main__":
    fix_duokong("688234")
