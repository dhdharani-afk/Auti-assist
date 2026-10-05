import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from auth import get_current_user
from database import SessionLocal
from main import app
from models import SocialSituationResult, User

client = TestClient(app)


def _make_user(email: str, role: str = 'child') -> User:
    db = SessionLocal()
    user = User(full_name=email.split('@')[0], email=email, password_hash='hashed-password', role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def _cleanup(*users: User) -> None:
    db = SessionLocal()
    user_ids = [user.id for user in users]
    db.query(SocialSituationResult).filter(SocialSituationResult.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
    db.commit()
    db.close()
    app.dependency_overrides.clear()


def test_new_child_starts_with_zero_social_progress():
    user = _make_user('social-fresh@example.com')
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = client.get('/api/social-simulator/progress')
        assert response.status_code == 200
        assert response.json() == {
            'scenarios_attempted': 0,
            'scenarios_completed': 0,
            'categories_practiced': 0,
            'stars_earned': 0,
            'progress': 0,
        }
    finally:
        _cleanup(user)


def test_child_can_complete_multistep_scenario_and_earns_two_stars():
    user = _make_user('social-complete@example.com')
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        scenarios = client.get('/api/social-simulator/scenarios')
        assert scenarios.status_code == 200
        meeting = next(item for item in scenarios.json()['scenarios'] if item['id'] == 'meeting-new-friend')
        assert len(meeting['steps']) == 2

        result = client.post('/api/social-simulator/result', json={
            'scenario_id': meeting['id'],
            'category': meeting['category'],
            'attempts': 2,
            'completed': True,
            'response_ids': ['a', 'a'],
        })
        assert result.status_code == 200
        assert result.json()['stars_earned'] == 2

        progress = client.get('/api/social-simulator/progress').json()
        assert progress['scenarios_attempted'] == 1
        assert progress['scenarios_completed'] == 1
        assert progress['categories_practiced'] == 1
        assert progress['stars_earned'] == 2
        assert progress['progress'] == 10
        rewards = client.get('/api/rewards')
        assert rewards.status_code == 200
        assert rewards.json()['stars'] == 2
    finally:
        _cleanup(user)


def test_social_results_are_isolated_and_non_child_is_forbidden():
    first = _make_user('social-first@example.com')
    second = _make_user('social-second@example.com')
    caregiver = _make_user('social-caregiver@example.com', role='caregiver')
    app.dependency_overrides[get_current_user] = lambda: first
    try:
        client.post('/api/social-simulator/result', json={
            'scenario_id': 'greeting-teacher',
            'category': 'School',
            'attempts': 1,
            'completed': True,
            'response_ids': ['a'],
        })

        app.dependency_overrides[get_current_user] = lambda: second
        other_progress = client.get('/api/social-simulator/progress')
        assert other_progress.status_code == 200
        assert other_progress.json()['stars_earned'] == 0
        assert other_progress.json()['scenarios_completed'] == 0

        app.dependency_overrides[get_current_user] = lambda: caregiver
        assert client.get('/api/social-simulator/scenarios').status_code == 403
        assert client.get('/api/social-simulator/progress').status_code == 403
    finally:
        _cleanup(first, second, caregiver)
