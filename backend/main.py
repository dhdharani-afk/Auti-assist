import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

from sqlalchemy import text
from sqlalchemy.orm import Session
from database import Base, engine, get_db
from models import User
from auth import get_current_user
from routers import auth as auth_router, users, learning, games, communication, routine, progress, rewards, chatbot, emotion, settings, social_simulator, mission, recommendations

logger = logging.getLogger('autiassist')
environment = os.getenv('AUTIASSIST_ENV', 'development').lower()


def ensure_game_result_columns():
    if engine.dialect.name != 'sqlite':
        return

    db_path = engine.url.database
    if not db_path or db_path == ':memory:':
        return
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()
    cursor.execute('PRAGMA table_info(game_results)')
    columns = [row[1] for row in cursor.fetchall()]

    for column_name, column_sql in {
        'game_type': 'ALTER TABLE game_results ADD COLUMN game_type VARCHAR(150) DEFAULT "memory"',
        'difficulty': 'ALTER TABLE game_results ADD COLUMN difficulty VARCHAR(50) DEFAULT "easy"',
        'correct_answers': 'ALTER TABLE game_results ADD COLUMN correct_answers INTEGER DEFAULT 0',
        'total_questions': 'ALTER TABLE game_results ADD COLUMN total_questions INTEGER DEFAULT 0',
        'time_taken': 'ALTER TABLE game_results ADD COLUMN time_taken INTEGER DEFAULT 0',
        'stars_earned': 'ALTER TABLE game_results ADD COLUMN stars_earned INTEGER DEFAULT 0',
        'session_id': 'ALTER TABLE game_results ADD COLUMN session_id VARCHAR(64)',
    }.items():
        if column_name not in columns:
            cursor.execute(column_sql)

    cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS ix_game_results_user_session ON game_results (user_id, session_id)')

    connection.commit()
    connection.close()


def ensure_user_role_column():
    if engine.dialect.name != 'sqlite':
        return

    db_path = engine.url.database
    if not db_path or db_path == ':memory:':
        return
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()
    cursor.execute('PRAGMA table_info(users)')
    columns = [row[1] for row in cursor.fetchall()]
    if 'role' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'child'")
        connection.commit()
    connection.close()


if environment != 'production':
    Base.metadata.create_all(bind=engine)
elif engine.dialect.name != 'postgresql':
    raise RuntimeError('Production must use PostgreSQL; configure DATABASE_URL before startup.')

ensure_game_result_columns()
ensure_user_role_column()


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info('Starting AutiAssist API in %s mode', environment)
    yield
    logger.info('Stopping AutiAssist API')


app = FastAPI(
    title='AutiAssist',
    version='1.0.0',
    lifespan=lifespan,
    docs_url=None if environment == 'production' else '/docs',
    redoc_url=None if environment == 'production' else '/redoc',
    openapi_url=None if environment == 'production' else '/openapi.json',
)

configured_origins = os.getenv('FRONTEND_ORIGINS', os.getenv('FRONTEND_ORIGIN', '')).strip()
if environment == 'production':
    if not configured_origins:
        raise RuntimeError('Set FRONTEND_ORIGINS to the deployed frontend origin before production startup.')
    allowed_origins = [origin.strip().rstrip('/') for origin in configured_origins.split(',') if origin.strip()]
    if not allowed_origins or any(not origin.startswith('https://') for origin in allowed_origins):
        raise RuntimeError('Production FRONTEND_ORIGINS values must use HTTPS.')
else:
    allowed_origins = list({
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        *[origin.strip().rstrip('/') for origin in configured_origins.split(',') if origin.strip()],
    })

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)

app.include_router(auth_router.router, prefix='/api/auth', tags=['auth'])
app.include_router(users.router, prefix='/api', tags=['users'])
app.include_router(learning.router, prefix='/api', tags=['learning'])
app.include_router(games.router, prefix='/api', tags=['games'])
app.include_router(communication.router, prefix='/api', tags=['communication'])
app.include_router(routine.router, prefix='/api', tags=['routine'])
app.include_router(progress.router, prefix='/api', tags=['progress'])
app.include_router(rewards.router, prefix='/api', tags=['rewards'])
app.include_router(chatbot.router, prefix='/api', tags=['chatbot'])
app.include_router(emotion.router, prefix='/api', tags=['emotion'])
app.include_router(settings.router, prefix='/api', tags=['settings'])
app.include_router(social_simulator.router, prefix='/api', tags=['social-simulator'])
app.include_router(mission.router, prefix='/api', tags=['mission'])
app.include_router(recommendations.router, prefix='/api', tags=['recommendations'])


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error('Unhandled API error for %s %s', request.method, request.url.path, exc_info=(type(exc), exc, exc.__traceback__))
    return JSONResponse(status_code=500, content={'detail': 'Something went wrong. Please try again.'})


@app.get('/health')
async def health(db: Session = Depends(get_db)):
    try:
        db.execute(text('SELECT 1'))
        return {'status': 'ok', 'database': 'ok'}
    except Exception as exc:
        logger.error('Health check database query failed', exc_info=(type(exc), exc, exc.__traceback__))
        raise HTTPException(status_code=503, detail='Service is temporarily unavailable.') from exc


@app.get('/')
async def root():
    return {'message': 'AutiAssist API is running'}

@app.get('/api/dashboard')
async def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from services.progress_service import get_user_activity, summarize_activity

    return summarize_activity(get_user_activity(db, current_user.id))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('main:app', host='0.0.0.0', port=int(os.getenv('PORT', '8000')), reload=environment != 'production')
