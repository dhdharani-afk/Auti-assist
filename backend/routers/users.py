from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from auth import get_current_user
from database import get_db
from models import User

router = APIRouter()

@router.get('/user')
async def get_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {'id': current_user.id, 'full_name': current_user.full_name, 'email': current_user.email}
