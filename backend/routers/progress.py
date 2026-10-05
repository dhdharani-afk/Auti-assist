from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User
from services.progress_service import get_progress_charts, get_user_activity, summarize_activity

router = APIRouter()


@router.get('/progress')
async def get_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = get_user_activity(db, current_user.id)
    summary = summarize_activity(records)
    return {
        **get_progress_charts(records),
        'learning_count': summary['learning_attempts'],
        'game_count': summary['game_count'],
        'routine_count': len(records['routine']),
        'communication_count': summary['communication_attempts'],
        'communication_correct': summary['communication_correct'],
        'emotion_count': summary['emotion_activities'],
        'stars': summary['stars'],
        'streak': summary['streak'],
    }
