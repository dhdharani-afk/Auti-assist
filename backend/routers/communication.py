import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CommunicationLog, User
from schemas import CommunicationLogCreate
from auth import get_current_user

router = APIRouter()

SENTENCE_EXERCISES = [
    {'id': 'want-water', 'prompt': "I want ___", 'answer': ['I', 'want', 'water'], 'choices': ['water', 'food', 'toy', 'book'], 'category': 'Needs', 'icon': '💧'},
    {'id': 'want-play', 'prompt': 'I want to ___', 'answer': ['I', 'want', 'to', 'play'], 'choices': ['play', 'sleep', 'eat', 'study'], 'category': 'Play', 'icon': '🎮'},
    {'id': 'can-have', 'prompt': 'Can I have ___?', 'answer': ['Can', 'I', 'have', 'water'], 'choices': ['water', 'apple', 'toy'], 'category': 'Polite Words', 'icon': '🙏'},
    {'id': 'i-am', 'prompt': 'I am ___', 'answer': ['I', 'am', 'happy'], 'choices': ['happy', 'sad', 'tired', 'hungry'], 'category': 'Feelings', 'icon': '😊'},
    {'id': 'i-feel', 'prompt': 'I feel ___', 'answer': ['I', 'feel', 'calm'], 'choices': ['happy', 'angry', 'scared', 'calm'], 'category': 'Feelings', 'icon': '😊'},
    {'id': 'please-give', 'prompt': 'Please give me ___', 'answer': ['Please', 'give', 'me', 'water'], 'choices': ['water', 'food', 'ball'], 'category': 'Polite Words', 'icon': '🙏'},
    {'id': 'i-need', 'prompt': 'I need ___', 'answer': ['I', 'need', 'help'], 'choices': ['help', 'toilet', 'water', 'rest'], 'category': 'Needs', 'icon': '💧'},
    {'id': 'i-like', 'prompt': 'I like ___', 'answer': ['I', 'like', 'drawing'], 'choices': ['drawing', 'music', 'games'], 'category': 'Play', 'icon': '🎨'},
    {'id': 'dont-like', 'prompt': "I don't like ___", 'answer': ["I", "don't", 'like', 'loud sounds'], 'choices': ['loud sounds', 'food', 'rain'], 'category': 'Feelings', 'icon': '😊'},
    {'id': 'lets', 'prompt': "Let's ___", 'answer': ["Let's", 'play'], 'choices': ['play', 'read', 'draw'], 'category': 'Play', 'icon': '🎮'},
    {'id': 'hello', 'prompt': 'Hello, ___', 'answer': ['Hello,', 'friend'], 'choices': ['teacher', 'friend', 'parent'], 'category': 'Greetings', 'icon': '👋'},
    {'id': 'thank-you', 'prompt': 'Thank you for ___', 'answer': ['Thank', 'you', 'for', 'helping me'], 'choices': ['helping me', 'the toy', 'food'], 'category': 'Polite Words', 'icon': '🙏'},
    {'id': 'can-i', 'prompt': 'Can I ___?', 'answer': ['Can', 'I', 'play'], 'choices': ['play', 'sit', 'go outside'], 'category': 'Polite Words', 'icon': '🙏'},
    {'id': 'where-is', 'prompt': 'Where is my ___?', 'answer': ['Where', 'is', 'my', 'book'], 'choices': ['bag', 'book', 'toy'], 'category': 'Objects', 'icon': '🧸'},
    {'id': 'ready-for', 'prompt': 'I am ready for ___', 'answer': ['I', 'am', 'ready', 'for', 'school'], 'choices': ['school', 'play', 'lunch'], 'category': 'School', 'icon': '🏫'},
    {'id': 'i-like-fruit', 'prompt': 'I like ___', 'answer': ['I', 'like', 'apple'], 'choices': ['apple', 'banana', 'orange'], 'category': 'Food', 'icon': '🍎'},
    {'id': 'at-home', 'prompt': 'I am at ___', 'answer': ['I', 'am', 'at', 'home'], 'choices': ['home', 'school', 'the park'], 'category': 'Home', 'icon': '🏠'},
    {'id': 'with-people', 'prompt': 'I am with my ___', 'answer': ['I', 'am', 'with', 'my', 'family'], 'choices': ['family', 'friend', 'teacher'], 'category': 'People', 'icon': '👨‍👩‍👧'},
]

COMMUNICATION_CATEGORIES = [
    {'name': 'Greetings', 'icon': '👋'},
    {'name': 'Food', 'icon': '🍎'},
    {'name': 'Needs', 'icon': '💧'},
    {'name': 'Home', 'icon': '🏠'},
    {'name': 'Play', 'icon': '🎮'},
    {'name': 'School', 'icon': '🏫'},
    {'name': 'Feelings', 'icon': '😊'},
    {'name': 'People', 'icon': '👨‍👩‍👧'},
    {'name': 'Objects', 'icon': '🧸'},
    {'name': 'Polite Words', 'icon': '🙏'},
]

SCENARIOS = [
    {'id': 'thirsty', 'prompt': "I'm thirsty. What can I say?", 'answer': 'I want water.', 'choices': ['I want water.', 'I want sleep.', 'I am happy.'], 'icon': '💧'},
    {'id': 'help', 'prompt': 'I need help. What can I say?', 'answer': 'Please help me.', 'choices': ['Please help me.', 'Can I play?', 'I want food.'], 'icon': '🙏'},
    {'id': 'play', 'prompt': 'I want to play. What can I say?', 'answer': 'Can I play?', 'choices': ['I feel sad.', 'Can I play?', 'I want water.'], 'icon': '🎮'},
    {'id': 'happy', 'prompt': 'I am happy. What can I say?', 'answer': 'I am happy.', 'choices': ['I am happy.', 'Please help me.', 'I want food.'], 'icon': '😊'},
    {'id': 'food', 'prompt': 'I want food. What can I say?', 'answer': 'I want food.', 'choices': ['I want food.', 'Can I play?', 'I need rest.'], 'icon': '🍎'},
]


def normalize_phrase(value):
    return re.sub(r'[^a-z0-9 ]', '', (value or '').lower()).strip()

@router.get('/communication')
async def get_communication(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved_logs = db.query(CommunicationLog).filter(CommunicationLog.user_id == current_user.id).all()
    practice_logs = [
        item for item in saved_logs
        if (item.category or '').startswith(('sentence-correct:', 'sentence-attempt:', 'scenario-correct:', 'scenario-attempt:'))
    ]
    successful_logs = [
        item for item in practice_logs
        if (item.category or '').startswith(('sentence-correct:', 'scenario-correct:'))
    ]
    return {
        'cards': [
            {'label': 'Food', 'emoji': '🍎', 'key': 'food'},
            {'label': 'Water', 'emoji': '💧', 'key': 'water'},
            {'label': 'Toilet', 'emoji': '🚽', 'key': 'toilet'},
            {'label': 'Sleep', 'emoji': '😴', 'key': 'sleep'},
            {'label': 'Play', 'emoji': '⚽', 'key': 'play'},
            {'label': 'Happy', 'emoji': '😊', 'key': 'happy'},
            {'label': 'Sad', 'emoji': '😢', 'key': 'sad'},
            {'label': 'Drink', 'emoji': '🥤', 'key': 'drink'},
            {'label': 'Home', 'emoji': '🏠', 'key': 'home'},
            {'label': 'Study', 'emoji': '📚', 'key': 'study'},
        ],
        'categories': COMMUNICATION_CATEGORIES,
        'sentence_exercises': SENTENCE_EXERCISES,
        'scenarios': SCENARIOS,
        'progress': {
            'attempts': len(practice_logs),
            'correct': len(successful_logs),
            'completed_activities': len(successful_logs),
        },
    }

@router.post('/communication')
async def save_communication(payload: CommunicationLogCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    category = payload.category or ''
    if category.startswith('sentence-correct:'):
        exercise_category = category.removeprefix('sentence-correct:')
        matched = any(
            item['category'] == exercise_category
            and normalize_phrase(' '.join(item['answer'])) == normalize_phrase(payload.phrase)
            for item in SENTENCE_EXERCISES
        )
        previous_success = db.query(CommunicationLog).filter(
            CommunicationLog.user_id == current_user.id,
            CommunicationLog.category == category,
        ).first()
        if not matched or previous_success:
            category = f'sentence-attempt:{exercise_category}'
    elif category.startswith('scenario-correct:'):
        scenario_id = category.removeprefix('scenario-correct:')
        matched = any(
            item['id'] == scenario_id
            and normalize_phrase(item['answer']) == normalize_phrase(payload.phrase)
            for item in SCENARIOS
        )
        previous_success = db.query(CommunicationLog).filter(
            CommunicationLog.user_id == current_user.id,
            CommunicationLog.category == category,
        ).first()
        if not matched or previous_success:
            category = f'scenario-attempt:{scenario_id}'

    if category == 'mission-say-hello' and normalize_phrase(payload.phrase) != 'hello':
        raise HTTPException(status_code=400, detail='The greeting activity must be completed before it is saved.')

    log = CommunicationLog(
        user_id=current_user.id,
        phrase=payload.phrase,
        category=category,
        spoken=payload.spoken,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {'status': 'saved', 'id': log.id}
