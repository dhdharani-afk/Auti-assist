from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from database import get_db
from models import GameResult, User
from schemas import GameResultCreate
from auth import get_current_user
from services.progress_service import get_user_activity, summarize_activity
from services.game_content import GAME_ROUNDS

router = APIRouter()

GAME_LIBRARY = [
    {
        'id': 'memory',
        'name': 'Memory Match',
        'description': 'Find the matching pairs and keep the cards open.',
        'emoji': '🧠',
        'difficulty': 'Easy',
        'duration': '2–3 min',
        'badge': 'Card matching',
    },
    {
        'id': 'colour',
        'name': 'Colour Match',
        'description': 'Spot the correct colour and win a bright star.',
        'emoji': '🎨',
        'difficulty': 'Easy',
        'duration': '2 min',
        'badge': 'Colour play',
    },
    {
        'id': 'shape',
        'name': 'Shape Match',
        'description': 'Find the matching shape in a fun visual challenge.',
        'emoji': '🔺',
        'difficulty': 'Easy',
        'duration': '2 min',
        'badge': 'Shape fun',
    },
    {
        'id': 'number',
        'name': 'Number Game',
        'description': 'Recognise numbers, count objects, and follow patterns.',
        'emoji': '🔢',
        'difficulty': 'Easy',
        'duration': '3 min',
        'badge': 'Counting',
    },
    {
        'id': 'attention',
        'name': 'Attention Game',
        'description': 'Look carefully and spot the different object.',
        'emoji': '👀',
        'difficulty': 'Medium',
        'duration': '2–3 min',
        'badge': 'Focus play',
    },
    {
        'id': 'puzzle',
        'name': 'Simple Puzzle',
        'description': 'Complete the pattern, order the steps, and solve it.',
        'emoji': '🧩',
        'difficulty': 'Easy',
        'duration': '3 min',
        'badge': 'Pattern play',
    },
]


@router.get('/games')
async def get_games(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        'games': [
            {**game, 'content': GAME_ROUNDS[game['id']]}
            for game in GAME_LIBRARY
        ]
    }


@router.get('/games/results')
async def get_game_results(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    results = (
        db.query(GameResult)
        .filter(GameResult.user_id == current_user.id)
        .order_by(GameResult.timestamp.desc())
        .all()
    )

    if not results:
        return {
            'games_played': 0,
            'stars_earned': 0,
            'best_score': 0,
            'total_correct': 0,
            'total_questions': 0,
            'streak': 0,
            'recent_results': [],
        }

    recent_results = [
        {
            'id': result.id,
            'game_name': result.game_name,
            'game_type': result.game_type,
            'difficulty': result.difficulty,
            'score': result.score,
            'correct_answers': result.correct_answers,
            'total_questions': result.total_questions,
            'stars_earned': result.stars_earned,
            'completed': result.completed,
            'timestamp': result.timestamp.isoformat() if result.timestamp else None,
        }
        for result in results[:6]
    ]

    return {
        'games_played': len(results),
        'stars_earned': sum(int(result.stars_earned or result.stars or 0) for result in results),
        'best_score': max(float(result.score or 0) for result in results),
        'total_correct': sum(int(result.correct_answers or 0) for result in results),
        'total_questions': sum(int(result.total_questions or 0) for result in results),
        'streak': summarize_activity(get_user_activity(db, current_user.id))['streak'],
        'recent_results': recent_results,
    }


@router.post('/games/result')
async def save_game_result(payload: GameResultCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    game_type = (payload.game_type or payload.game_name or 'memory').strip().lower().replace(' ', '_')
    supported_games = {game['id'] for game in GAME_LIBRARY} | {'mission_colour_match'}
    if game_type not in supported_games:
        raise HTTPException(status_code=400, detail='Game type not found.')

    existing = (
        db.query(GameResult)
        .filter(GameResult.user_id == current_user.id, GameResult.session_id == payload.session_id)
        .first()
    )
    if existing:
        return {
            'status': 'already_saved',
            'id': existing.id,
            'game_type': existing.game_type,
            'score': existing.score,
            'stars_earned': 0,
        }

    game_name = (payload.game_name or game_type.replace('_', ' ')).strip()
    difficulty = (payload.difficulty or 'easy').lower()
    total_questions = int(payload.total_questions or 0)
    correct_answers = int(payload.correct_answers or 0)
    if correct_answers > total_questions:
        raise HTTPException(status_code=400, detail='Correct answers cannot exceed total questions.')
    score = round((correct_answers / total_questions) * 100) if total_questions else 0
    completed = bool(payload.completed)
    stars_earned = 0
    if completed and score > 0 and game_type != 'mission_colour_match':
        stars_earned = 4 if score >= 90 else 3 if score >= 70 else 2 if score >= 50 else 1

    if not game_name or game_name.lower() == 'game':
        game_name = 'Memory Match' if game_type == 'memory' else game_type.replace('_', ' ').title()

    result = GameResult(
        user_id=current_user.id,
        session_id=payload.session_id,
        game_name=game_name,
        game_type=game_type,
        difficulty=difficulty,
        score=score,
        correct_answers=correct_answers,
        total_questions=total_questions,
        time_taken=int(payload.time_taken or 0),
        completed=completed,
        stars=stars_earned,
        stars_earned=stars_earned,
    )
    db.add(result)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(GameResult).filter(
            GameResult.user_id == current_user.id,
            GameResult.session_id == payload.session_id,
        ).first()
        if existing:
            return {'status': 'already_saved', 'id': existing.id, 'game_type': existing.game_type, 'score': existing.score, 'stars_earned': 0}
        raise
    db.refresh(result)
    return {
        'status': 'saved',
        'id': result.id,
        'game_type': result.game_type,
        'score': result.score,
        'stars_earned': result.stars_earned,
    }
