from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from services.progress_service import get_progress_charts, get_user_activity, summarize_activity
from models import User

router = APIRouter()


@router.get('/progress')
async def get_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = get_user_activity(db, current_user.id)
    summary = summarize_activity(records)
    charts = get_progress_charts(records)
    return {
        **charts,
        'learning_count': summary['learning_attempts'],
        'game_count': summary['game_count'],
        'routine_count': len(records['routine']),
        'communication_count': summary['communication_attempts'],
        'communication_correct': summary['communication_correct'],
        'stars': summary['stars'],
        'streak': summary['streak'],
        'completed_activities': summary['game_count'] + summary['social_completed'] + summary['mission_completed_today'],
    }
