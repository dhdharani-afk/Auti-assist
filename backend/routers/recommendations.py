from datetime import datetime, time

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Recommendation, User
from services.progress_service import get_user_activity, summarize_activity

router = APIRouter()


@router.get('/recommendations')
async def get_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    current = (
        db.query(Recommendation)
        .filter(
            Recommendation.user_id == current_user.id,
            Recommendation.created_at >= today_start,
        )
        .order_by(Recommendation.created_at.desc())
        .first()
    )
    summary = summarize_activity(get_user_activity(db, current_user.id))
    if current is None:
        current = Recommendation(
            user_id=current_user.id,
            title='A next step for today',
            detail=summary['recommendation'],
        )
        db.add(current)
    else:
        current.detail = summary['recommendation']
    db.commit()
    db.refresh(current)

    return {
        'recommendations': [{
            'title': current.title,
            'detail': current.detail,
            'created_at': current.created_at.isoformat() if current.created_at else None,
        }],
    }
