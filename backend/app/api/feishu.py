"""
飞书通知API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import asyncio

from app.database import get_db
from app.services.feishu_service import FeishuNotificationService
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/feishu", tags=["飞书通知"])


class TestMessageRequest(BaseModel):
    """测试消息请求"""
    message: str


@router.post("/test")
async def send_test_notification(
    request: TestMessageRequest,
    db: Session = Depends(get_db)
):
    """
    发送测试通知
    """
    try:
        feishu_service = FeishuNotificationService(db)
        success = await feishu_service.send_test_message(request.message)

        if success:
            return {"message": "测试通知发送成功"}
        else:
            raise HTTPException(status_code=400, detail="测试通知发送失败，请检查webhook配置")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发送失败: {str(e)}")
