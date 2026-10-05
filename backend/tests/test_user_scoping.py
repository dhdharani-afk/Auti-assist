import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from auth import get_current_user
from database import SessionLocal
from main import app
from models import GameResult, LearningResult, RoutineCompletion, User

client = TestClient(app)


def _make_user(email: str, full_name: str) -> User:
    db = SessionLocal()
    user = User(full_name=full_name, email=email, password_hash='hashed-password')
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def _seed_activity(user_id: int) -> None:
    db = SessionLocal()
    db.add_all(
        [
            LearningResult(
                user_id=user_id,
                question='What color is the sky?',
                answer='Blue',
                is_correct=True,
                score=10.0,
                category='Colours',
            ),
            GameResult(
                user_id=user_id,
                game_name='Memory Game',
                score=80,
                completed=True,
                stars=25,
            ),
            RoutineCompletion(
                user_id=user_id,
                task_name='Brush Teeth',
                completed=True,
            ),
        ]
    )
    db.commit()
    db.close()


def test_new_user_dashboard_starts_at_zero():
    user = _make_user('fresh-child@example.com', 'Fresh Child')
    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get('/api/dashboard')
        assert response.status_code == 200
        data = response.json()
        assert data['todayProgress'] == 0
        assert data['learning'] == 0
        assert data['communication'] == 0
        assert data['routine'] == 0
        assert data['streak'] == 0
        assert data['stars'] == 0
        assert data['activities'] == []
    finally:
        db = SessionLocal()
        db.query(User).filter(User.email == 'fresh-child@example.com').delete()
        db.commit()
        db.close()
        app.dependency_overrides.clear()


def test_other_users_data_is_not_visible():
    user_a = _make_user('user-a@example.com', 'User A')
    user_b = _make_user('user-b@example.com', 'User B')
    _seed_activity(user_a.id)

    app.dependency_overrides[get_current_user] = lambda: user_b

    try:
        dashboard = client.get('/api/dashboard')
        progress = client.get('/api/progress')
        rewards = client.get('/api/rewards')

        assert dashboard.status_code == 200
        assert dashboard.json()['stars'] == 0
        assert dashboard.json()['learning'] == 0
        assert progress.status_code == 200
        assert progress.json()['stars'] == 0
        assert rewards.status_code == 200
        assert rewards.json()['stars'] == 0
    finally:
        db = SessionLocal()
        db.query(RoutineCompletion).filter(RoutineCompletion.user_id.in_([user_a.id, user_b.id])).delete()
        db.query(GameResult).filter(GameResult.user_id.in_([user_a.id, user_b.id])).delete()
        db.query(LearningResult).filter(LearningResult.user_id.in_([user_a.id, user_b.id])).delete()
        db.query(User).filter(User.email.in_(['user-a@example.com', 'user-b@example.com'])).delete()
        db.commit()
        db.close()
        app.dependency_overrides.clear()
