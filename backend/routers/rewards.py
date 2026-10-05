from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User
from services.progress_service import get_user_activity, summarize_activity
from auth import get_current_user

router = APIRouter()

@router.get('/rewards')
async def get_rewards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = get_user_activity(db, current_user.id)
    summary = summarize_activity(records)
    unique_correct = {(item.category, item.question) for item in records['learning'] if item.is_correct}
    completed_games = [item for item in records['games'] if item.completed]
    completed_routine_tasks = {item.task_name for item in records['routine'] if item.completed}
    completed_social_scenarios = {item.scenario_id for item in records['social'] if item.completed}
    communication_successes = sum(1 for item in records['communication'] if (item.category or '').startswith(('sentence-correct:', 'scenario-correct:')))
    total_completed = len(unique_correct) + len(completed_games) + len(completed_social_scenarios) + communication_successes + len(completed_routine_tasks) + summary['emotion_activities']

    badges = [
        {'name': 'First Steps', 'icon': '👣', 'earned': total_completed >= 1},
        {'name': 'Learning Explorer', 'icon': '📚', 'earned': len(unique_correct) >= 5},
        {'name': 'Game Explorer', 'icon': '🎮', 'earned': len(completed_games) >= 3},
        {'name': 'Clear Communicator', 'icon': '💬', 'earned': communication_successes >= 3},
        {'name': 'Routine Star', 'icon': '🌟', 'earned': len(completed_routine_tasks) >= 8},
        {'name': 'Kind Practice', 'icon': '🤝', 'earned': len(completed_social_scenarios) >= 3},
    ]
    milestones = [
        {'name': f'{threshold} Star Milestone', 'stars': threshold, 'earned': summary['stars'] >= threshold}
        for threshold in (10, 25, 50, 100)
    ]
    return {
        'stars': summary['stars'],
        'streak': summary['streak'],
        'completed_activities': total_completed,
        'badges_earned': sum(1 for badge in badges if badge['earned']),
        'achievements': sum(1 for badge in badges if badge['earned']) + sum(1 for milestone in milestones if milestone['earned']),
        'badges': badges,
        'rewards': milestones,
    }
