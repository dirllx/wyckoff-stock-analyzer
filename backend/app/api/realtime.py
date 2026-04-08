"""
实时行情API
"""
from fastapi import APIRouter, Depends, HTTPException
from loguru import logger

from app.services.realtime_quote import get_realtime_service

router = APIRouter(prefix="/realtime", tags=["实时行情"])


@router.get("/quote/{code}")
def get_realtime_quote(code: str):
    """
    获取单只股票的实时行情

    Args:
        code: 股票代码（如：000001, sh000001）

    Returns:
        实时行情数据
    """
    try:
        service = get_realtime_service()
        quote = service.get_realtime_quote(code)

        if not quote:
            raise HTTPException(status_code=404, detail=f"股票{code}实时行情未找到")

        return {
            "code": code,
            "quote": service.format_quote(quote)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取实时行情失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@router.post("/quotes")
def get_realtime_quotes(codes: list[str]):
    """
    获取多只股票的实时行情

    Args:
        codes: 股票代码列表

    Returns:
        多只股票的实时行情
    """
    try:
        if len(codes) > 50:
            raise HTTPException(status_code=400, detail="最多支持查询50只股票")

        service = get_realtime_service()
        data = service.get_realtime_quotes(codes)

        return {
            "total": len(codes),
            "quotes": {
                code: service.format_quote(data.get(code, {}))
                for code in codes
                if code in data and data[code]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取实时行情失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@router.get("/market")
def get_market_snapshot(prefix: bool = False):
    """
    获取全市场行情快照

    Args:
        prefix: 是否包含市场前缀（sz/sh）

    Returns:
        全市场行情数据
    """
    try:
        service = get_realtime_service()
        snapshot = service.get_market_snapshot(prefix=prefix)

        return {
            "total": len(snapshot),
            "snapshot": snapshot
        }
    except Exception as e:
        logger.error(f"获取全市场行情快照失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取失败: {str(e)}")


@router.post("/switch-source")
def switch_source(source: str):
    """
    切换行情源

    Args:
        source: 行情源 (sina/tencent)

    Returns:
        切换结果
    """
    try:
        if source not in ['sina', 'tencent', 'qq']:
            raise HTTPException(status_code=400, detail="不支持的行情源")

        service = get_realtime_service()
        service.switch_source(source)

        return {
            "message": f"已切换到{source}行情源",
            "source": source
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"切换行情源失败: {e}")
        raise HTTPException(status_code=500, detail=f"切换失败: {str(e)}")
