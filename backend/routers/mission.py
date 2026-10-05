from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import CommunicationLog, EmotionActivity, GameResult, MissionCompletion, User
from schemas import MissionCompletionCreate

router = APIRouter()

MISSION_KEYS = ('colour-match', 'emotion-match', 'say-hello')
MISSION_REWARD = 3


def today_status(current_user: User, db: Session):
    today = datetime.utcnow().date()
    rows = (
        db.query(MissionCompletion)
        .filter(
            MissionCompletion.user_id == current_user.id,
            MissionCompletion.mission_date == today,
        )
        .all()
    )
    completed = {row.mission_key for row in rows}
    return {
        'date': today.isoformat(),
        'missions': [
            {'key': key, 'completed': key in completed}
            for key in MISSION_KEYS
        ],
        'completed_count': len(completed.intersection(MISSION_KEYS)),
        'total': len(MISSION_KEYS),
        'stars_earned': sum(int(row.stars_earned or 0) for row in rows),
    }


@router.get('/mission/today')
async def get_today_mission(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return today_status(current_user, db)


@router.post('/mission/complete')
async def complete_mission(payload: MissionCompletionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.mission_key not in MISSION_KEYS:
        raise HTTPException(status_code=400, detail='That mission is not available.')

    today = datetime.utcnow().date()
    existing = (
        db.query(MissionCompletion)
        .filter(
            MissionCompletion.user_id == current_user.id,
            MissionCompletion.mission_date == today,
            MissionCompletion.mission_key == payload.mission_key,
        )
        .first()
    )
    if existing:
        return {'status': 'already_completed', 'new_stars_earned': 0, **today_status(current_user, db)}

    day_start = datetime.combine(today, datetime.min.time())
    if payload.mission_key == 'colour-match':
        evidence = db.query(GameResult).filter(
            GameResult.user_id == current_user.id,
            GameResult.game_type == 'mission_colour_match',
            GameResult.completed.is_(True),
            GameResult.timestamp >= day_start,
        ).first()
    elif payload.mission_key == 'emotion-match':
        evidence = db.query(EmotionActivity).filter(
            EmotionActivity.user_id == current_user.id,
            EmotionActivity.emotion == 'mission-complete',
            EmotionActivity.created_at >= day_start,
        ).first()
    else:
        evidence = db.query(CommunicationLog).filter(
            CommunicationLog.user_id == current_user.id,
            CommunicationLog.category == 'mission-say-hello',
            CommunicationLog.created_at >= day_start,
        ).first()

    if evidence is None:
        raise HTTPException(status_code=409, detail='Complete and save the activity before claiming its mission reward.')

    completion = MissionCompletion(
        user_id=current_user.id,
        mission_date=today,
        mission_key=payload.mission_key,
        stars_earned=MISSION_REWARD,
    )
    db.add(completion)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {'status': 'already_completed', 'new_stars_earned': 0, **today_status(current_user, db)}

    return {'status': 'saved', 'new_stars_earned': MISSION_REWARD, **today_status(current_user, db)}