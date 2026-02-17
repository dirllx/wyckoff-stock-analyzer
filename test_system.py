"""
测试脚本 - 验证威科夫分析系统
"""
import sys
sys.path.insert(0, "/root/.openclaw/workspace/wyckoff-stock-analyzer/backend")

from app.database import init_db, get_db
from app.services import DataStorage, WyckoffAnalyzer
from app.models.database import Stock, StockQuote
from loguru import logger
import datetime

# 配置日志
logger.add(sys.stdout, level="INFO")

def test_system():
    """测试系统功能"""
    try:
        # 初始化数据库
        logger.info("初始化数据库...")
        init_db()
        logger.info("数据库初始化成功")

        # 获取数据库会话
        db = next(get_db())

        # 测试股票代码 - 天岳先进（希戈的重仓股）
        test_code = "688234"

        logger.info(f"开始测试股票: {test_code}")

        # 更新股票数据
        storage = DataStorage(db)
        logger.info("开始获取股票数据...")
        success = storage.update_stock_quotes(test_code, "daily")

        if not success:
            logger.error("获取股票数据失败")
            return False

        logger.info("股票数据获取成功")

        # 获取K线数据
        quotes = storage.get_quotes(test_code, "daily", limit=100)
        logger.info(f"获取到 {len(quotes)} 条K线数据")

        # 获取股票信息
        stock = db.query(Stock).filter(Stock.code == test_code).first()
        if not stock:
            logger.error("股票信息不存在")
            return False

        # 执行威科夫分析
        analyzer = WyckoffAnalyzer()
        logger.info("开始威科夫分析...")
        result = analyzer.analyze(stock, quotes)

        # 输出分析结果
        logger.info("=" * 60)
        logger.info(f"股票: {stock.name} ({stock.code})")
        logger.info("=" * 60)
        logger.info(f"信号类型: {result['signal_type']}")
        logger.info(f"方向: {result['direction']}")
        logger.info(f"评分: {result['score']}/10")
        logger.info(f"强度: {result['strength']}")
        logger.info(f"建议: {result['suggestion']}")
        logger.info(f"置信度: {result['confidence']:.2%}")
        logger.info(f"原因: {result['reason']}")
        logger.info("=" * 60)

        logger.info("测试完成！")
        return True

    except Exception as e:
        logger.error(f"测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_system()
    sys.exit(0 if success else 1)
