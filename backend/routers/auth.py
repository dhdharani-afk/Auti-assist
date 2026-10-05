from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import ValidationError
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, TokenResponse, UserResponse
from auth import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter()

@router.post('/signup', response_model=TokenResponse)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail='Email is already registered.')

    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({'sub': user.email})
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': {
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'theme': user.theme,
            'sound': user.sound,
            'animations': user.animations,
            'notifications': user.notifications,
            'role': user.role,
        },
    }

@router.post('/login', response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid email or password.')

    token = create_access_token({'sub': user.email})
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': {
            'id': user.id,
            'full_name': user.full_name,
            'email': user.email,
            'theme': user.theme,
            'sound': user.sound,
            'animations': user.animations,
            'notifications': user.notifications,
            'role': user.role,
        },
    }

@router.get('/me', response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return {
        'id': current_user.id,
        'full_name': current_user.full_name,
        'email': current_user.email,
        'theme': current_user.theme,
        'sound': current_user.sound,
        'animations': current_user.animations,
        'notifications': current_user.notifications,
        'role': current_user.role,
    }
