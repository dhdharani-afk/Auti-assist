from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from auth import get_current_user
from database import get_db
from models import User
from schemas import SettingsUpdate

router = APIRouter()

@router.get('/settings')
async def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        'name': current_user.full_name,
        'email': current_user.email,
        'theme': current_user.theme,
        'sound': current_user.sound,
        'animations': current_user.animations,
        'notifications': current_user.notifications,
    }

@router.put('/settings')
async def update_settings(payload: SettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip()
    if payload.theme is not None:
        current_user.theme = payload.theme
    if payload.sound is not None:
        current_user.sound = payload.sound
    if payload.animations is not None:
        current_user.animations = payload.animations
    if payload.notifications is not None:
        current_user.notifications = payload.notifications
    db.commit()
    db.refresh(current_user)
    return {'status': 'updated', 'name': current_user.full_name}
