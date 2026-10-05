from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import ChatHistory, User
from schemas import AIChatRequest, AIChatResponse
from services.chatbot_service import ChatbotService, OllamaUnavailable

router = APIRouter()


def generate_reply(message: str, context):
    try:
        return ChatbotService.generate_response(message, conversation_context=context)
    except OllamaUnavailable as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


def persist_chat(message: str, context, current_user: User, db: Session):
    cleaned_message = message.strip()
    if not cleaned_message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Message cannot be empty')

    reply = generate_reply(cleaned_message, context or [])
    record = ChatHistory(user_id=current_user.id, prompt=cleaned_message, response=reply)
    db.add(record)
    db.commit()
    return {'success': True, 'response': reply}


@router.get('/ai/health')
async def ai_health():
    return ChatbotService.health_check()


@router.post('/ai/warm-up')
async def ai_warm_up(current_user: User = Depends(get_current_user)):
    return ChatbotService.warm_up()


@router.post('/ai/chat', response_model=AIChatResponse)
def ai_chat(payload: AIChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return persist_chat(payload.message, payload.conversation_context, current_user, db)


@router.post('/chat', response_model=AIChatResponse)
def chat(payload: AIChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return persist_chat(payload.message, payload.conversation_context, current_user, db)


@router.get('/ai/chat/history')
@router.get('/chat/history')
async def chat_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.id.desc())
        .limit(20)
        .all()
    )
    return {
        'success': True,
        'history': [
            {'message': item.prompt, 'response': item.response, 'created_at': item.created_at.isoformat() if item.created_at else None}
            for item in history
        ],
    }


@router.delete('/ai/chat/history')
@router.delete('/chat/history')
async def clear_chat_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deleted = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).delete()
    db.commit()
    return {'success': True, 'deleted': deleted}
