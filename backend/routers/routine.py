from datetime import datetime, time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import RoutineCompletion, RoutineTask, User
from schemas import RoutineCompleteCreate
from auth import get_current_user

router = APIRouter()

TASKS = [
    {'name': 'Wake Up', 'icon': '🌅', 'time': '7:00 AM'},
    {'name': 'Brush Teeth', 'icon': '🪥', 'time': '7:15 AM'},
    {'name': 'Breakfast', 'icon': '🍳', 'time': '7:30 AM'},
    {'name': 'School', 'icon': '🎒', 'time': '8:00 AM'},
    {'name': 'Study', 'icon': '📚', 'time': '4:00 PM'},
    {'name': 'Play', 'icon': '🎮', 'time': '5:30 PM'},
    {'name': 'Dinner', 'icon': '🍽️', 'time': '7:00 PM'},
    {'name': 'Sleep', 'icon': '🌙', 'time': '9:00 PM'},
]


def utc_day_start():
    today = datetime.utcnow().date()
    return datetime.combine(today, time.min)

@router.get('/routine')
async def get_routine(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    completions = (
        db.query(RoutineCompletion)
        .filter(
            RoutineCompletion.user_id == current_user.id,
            RoutineCompletion.completed_at >= utc_day_start(),
        )
        .all()
    )
    completed_by_task = {item.task_name: item.completed for item in completions}
    tasks = [
        {**task, 'completed': bool(completed_by_task.get(task['name'], False))}
        for task in TASKS
    ]
    completed_count = sum(1 for task in tasks if task['completed'])
    return {'tasks': tasks, 'completion': round(completed_count / len(TASKS) * 100), 'completed_count': completed_count, 'total': len(TASKS)}

@router.post('/routine/complete')
async def complete_task(payload: RoutineCompleteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task_name = payload.task_name.strip()
    if task_name not in {task['name'] for task in TASKS}:
        raise HTTPException(status_code=400, detail='Routine task not found.')

    completion = (
        db.query(RoutineCompletion)
        .filter(
            RoutineCompletion.user_id == current_user.id,
            RoutineCompletion.task_name == task_name,
            RoutineCompletion.completed_at >= utc_day_start(),
        )
        .order_by(RoutineCompletion.completed_at.desc())
        .first()
    )
    if completion is None:
        completion = RoutineCompletion(user_id=current_user.id, task_name=task_name)
        db.add(completion)
    completion.completed = payload.completed
    completion.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(completion)
    return {'status': 'saved', 'id': completion.id, 'task_name': task_name, 'completed': completion.completed}
