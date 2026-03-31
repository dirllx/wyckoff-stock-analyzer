"""
测试WatchlistService关注列表服务
"""
import pytest
from app.services.watchlist_service import WatchlistService
from app.models.watchlist import UserStockWatch


@pytest.mark.unit
def test_watchlist_service_initialization(db_session):
    """测试WatchlistService初始化"""
    service = WatchlistService(db_session)
    assert service is not None
    assert service.db == db_session


@pytest.mark.unit
def test_add_to_watchlist_new(db_session):
    """测试添加新股票到关注列表"""
    service = WatchlistService(db_session)

    # 添加新股票
    item = service.add_to_watchlist("TEST001", priority=0, watch_type="browse")

    assert item is not None
    assert item.stock_code == "TEST001"
    assert item.watch_type == "browse"
    assert item.priority == 0


@pytest.mark.unit
def test_add_to_watchlist_duplicate(db_session):
    """测试添加重复股票"""
    service = WatchlistService(db_session)

    # 第一次添加
    item1 = service.add_to_watchlist("TEST001", priority=0, watch_type="browse")
    # 第二次添加（应该更新而不是重复）
    item2 = service.add_to_watchlist("TEST001", priority=1, watch_type="browse")

    assert item1.id == item2.id  # 应该是同一条记录


@pytest.mark.unit
def test_remove_from_watchlist(db_session):
    """测试从关注列表移除股票"""
    service = WatchlistService(db_session)

    # 先添加
    service.add_to_watchlist("TEST001", watch_type="browse")

    # 再移除
    result = service.remove_from_watchlist("TEST001")

    assert result is True


@pytest.mark.unit
def test_remove_from_watchlist_not_found(db_session):
    """测试移除不存在的股票"""
    service = WatchlistService(db_session)

    result = service.remove_from_watchlist("NOTEXIST")

    assert result is False


@pytest.mark.unit
def test_get_watchlist_empty(db_session):
    """测试获取空的关注列表"""
    service = WatchlistService(db_session)

    watchlist = service.get_watchlist()

    assert isinstance(watchlist, list)
    assert len(watchlist) == 0


@pytest.mark.unit
def test_get_watchlist_with_items(db_session):
    """测试获取有数据的关注列表"""
    service = WatchlistService(db_session)

    # 添加几只股票
    service.add_to_watchlist("TEST001", watch_type="browse")
    service.add_to_watchlist("TEST002", watch_type="browse")

    watchlist = service.get_watchlist()

    assert len(watchlist) >= 2


@pytest.mark.unit
def test_get_watchlist_by_type(db_session):
    """测试按类型获取关注列表"""
    service = WatchlistService(db_session)

    # 添加不同类型的股票
    service.add_to_watchlist("TEST001", watch_type="favorite")
    service.add_to_watchlist("TEST002", watch_type="browse")

    # 只获取favorite类型
    favorites = service.get_watchlist(watch_type="favorite")

    assert all(item.watch_type == "favorite" for item in favorites)


@pytest.mark.unit
def test_is_in_watchlist_true(db_session):
    """测试检查股票是否在关注列表（在列表中）"""
    service = WatchlistService(db_session)

    # 添加股票
    service.add_to_watchlist("TEST001", watch_type="browse")

    # 检查是否存在
    result = service.is_in_watchlist("TEST001")

    assert result is True


@pytest.mark.unit
def test_is_in_watchlist_false(db_session):
    """测试检查股票是否在关注列表（不在列表中）"""
    service = WatchlistService(db_session)

    result = service.is_in_watchlist("NOTEXIST")

    assert result is False


@pytest.mark.unit
def test_favorite_stock(db_session):
    """测试收藏股票（从浏览股转为自选股）"""
    service = WatchlistService(db_session)

    # 先添加为浏览股
    service.add_to_watchlist("TEST001", watch_type="browse")

    # 收藏为自选股
    result = service.favorite_stock("TEST001")

    assert result is True

    # 验证已转换为自选股
    watchlist = service.get_watchlist(watch_type="favorite")
    assert any(item.stock_code == "TEST001" for item in watchlist)


@pytest.mark.unit
def test_unfavorite_stock(db_session):
    """测试取消收藏股票"""
    service = WatchlistService(db_session)

    # 先添加为自选股
    service.add_to_watchlist("TEST001", watch_type="favorite")

    # 取消收藏
    result = service.unfavorite_stock("TEST001")

    assert result is True

    # 验证已删除
    in_list = service.is_in_watchlist("TEST001")
    assert in_list is False
