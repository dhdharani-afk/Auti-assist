import sys
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from auth import get_current_user
from database import SessionLocal
from main import app
from models import (
    ChatHistory,
    CommunicationLog,
    EmotionActivity,
    GameResult,
    LearningResult,
    MissionCompletion,
    Recommendation,
    Reward,
    RoutineCompletion,
    SocialSituationResult,
    User,
)
from routers.learning import QUESTION_BANK
from services.chatbot_service import ChatbotService, OllamaUnavailable

client = TestClient(app)


def _make_user() -> User:
    db = SessionLocal()
    user = User(
        full_name='Integration Child',
        email=f'integration-{uuid4().hex}@example.com',
        password_hash='test-hash',
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def _cleanup(user: User) -> None:
    db = SessionLocal()
    for model in (
        LearningResult,
        GameResult,
        CommunicationLog,
        RoutineCompletion,
        Reward,
        ChatHistory,
        EmotionActivity,
        Recommendation,
        SocialSituationResult,
        MissionCompletion,
    ):
        db.query(model).filter(model.user_id == user.id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user.id).delete(synchronize_session=False)
    db.commit()
    db.close()
    app.dependency_overrides.clear()


def test_fresh_user_starts_empty_and_routine_persists_per_day():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        dashboard = client.get('/api/dashboard').json()
        routine = client.get('/api/routine').json()
        assert dashboard['stars'] == 0
        assert dashboard['streak'] == 0
        assert dashboard['routine'] == 0
        assert routine['completion'] == 0
        assert len(routine['tasks']) == 8
        assert not any(task['completed'] for task in routine['tasks'])

        saved = client.post('/api/routine/complete', json={'task_name': 'Brush Teeth', 'completed': True})
        assert saved.status_code == 200
        refreshed = client.get('/api/routine').json()
        assert refreshed['completion'] == 12
        assert next(task for task in refreshed['tasks'] if task['name'] == 'Brush Teeth')['completed']
        assert client.post('/api/routine/complete', json={'task_name': 'Unknown', 'completed': True}).status_code == 400
    finally:
        _cleanup(user)


def test_signup_login_and_authenticated_session():
    email = f'auth-{uuid4().hex}@example.com'
    payload = {'full_name': 'Auth Child', 'email': email, 'password': 'SafeTestPass123!'}
    signup = client.post('/api/auth/signup', json=payload)
    assert signup.status_code == 200
    token = signup.json()['access_token']
    assert signup.json()['user']['full_name'] == 'Auth Child'

    login = client.post('/api/auth/login', json={'email': email, 'password': payload['password']})
    assert login.status_code == 200
    authenticated = client.get('/api/auth/me', headers={'Authorization': f"Bearer {login.json()['access_token']}"})
    assert authenticated.status_code == 200
    assert authenticated.json()['email'] == email

    user_id = signup.json()['user']['id']
    _cleanup(User(id=user_id, full_name=payload['full_name'], email=email, password_hash='test-hash'))


def test_learning_questions_are_server_scored_and_awarded_once():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        payload = client.get('/api/learning').json()
        assert payload['level'] == 1
        assert len(payload['categories']) == 6
        assert {item['name']: item['question_count'] for item in payload['categories']} == {
            'Alphabet': 10, 'Numbers': 10, 'Colours': 10, 'Shapes': 10, 'Animals': 10, 'Fruits': 10,
        }
        question = next(item for item in payload['activities'] if item['category'] == 'Colours')
        assert 'answer' not in question

        wrong = client.post('/api/learning/result', json={
            'question': question['prompt'], 'answer': 'Definitely wrong', 'is_correct': True,
            'score': 1, 'category': 'Colours', 'difficulty': 'beginner',
        }).json()
        assert wrong['is_correct'] is False
        assert wrong['stars_earned'] == 0

        correct_choice = next(item['answer'] for item in QUESTION_BANK['Colours'] if item['prompt'] == question['prompt'])
        correct_payload = {
            'question': question['prompt'], 'answer': correct_choice, 'is_correct': False,
            'score': 0, 'category': 'Colours', 'difficulty': 'beginner',
        }
        first = client.post('/api/learning/result', json=correct_payload).json()
        again = client.post('/api/learning/result', json=correct_payload).json()
        assert first['is_correct'] is True and first['stars_earned'] == 1
        assert again['is_correct'] is True and again['stars_earned'] == 0
        assert client.get('/api/rewards').json()['stars'] == 1
    finally:
        _cleanup(user)


def test_game_rewards_are_server_calculated_and_session_idempotent():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        payload = {
            'session_id': 'session-unique-1', 'game_name': 'Colour Match', 'game_type': 'colour',
            'score': 100, 'correct_answers': 1, 'total_questions': 4, 'completed': True,
            'stars_earned': 99,
        }
        first = client.post('/api/games/result', json=payload).json()
        duplicate = client.post('/api/games/result', json=payload).json()
        assert first['score'] == 25
        assert first['stars_earned'] == 1
        assert duplicate['status'] == 'already_saved'
        assert duplicate['stars_earned'] == 0
        assert client.get('/api/rewards').json()['stars'] == 1
    finally:
        _cleanup(user)


def test_games_catalogue_has_twenty_valid_rounds_for_each_existing_game():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = client.get('/api/games')
        assert response.status_code == 200
        games = response.json()['games']
        assert {game['id'] for game in games} == {'memory', 'colour', 'shape', 'number', 'attention', 'puzzle'}
        game_by_id = {game['id']: game for game in games}
        assert game_by_id['memory']['content']['pairs'][:8] == ['🐶', '🍎', '🐱', '⭐', '🍉', '🌼', '🦋', '🍇']
        assert [item['prompt'] for item in game_by_id['colour']['content']['rounds'][:5]] == [
            'Find the RED', 'Find the BLUE', 'Find the YELLOW', 'Find the GREEN', 'Find the PURPLE',
        ]
        assert [item['prompt'] for item in game_by_id['number']['content']['rounds'][:7]] == [
            'Which number is 3?', 'Which number is 8?', 'Which number is 6?',
            'How many apples? 🍎🍎🍎🍎', 'How many stars? ⭐⭐⭐', '2, 4, 6, ?', '5, 10, 15, ?',
        ]
        assert game_by_id['attention']['content']['rounds'][0]['prompt'] == 'Find the different one'
        assert [item['prompt'] for item in game_by_id['puzzle']['content']['rounds'][:2]] == [
            'What comes next? 🔴 🔵 🔴 🔵 ?', 'Put these in order: 1, 3, 2',
        ]
        for game in games:
            content = game['content']
            items = content['pairs'] if game['id'] == 'memory' else content['rounds']
            assert len(items) == 20
            if game['id'] == 'memory':
                assert len(set(items)) == 20
                continue
            assert len({item['id'] for item in items}) == 20
            assert len({item['prompt'] for item in items}) == 20
            for item in items:
                values = {choice['value'] for choice in item['choices']}
                assert item['answer'] in values
                assert item['difficulty'] in {'easy', 'medium', 'challenge'}
    finally:
        _cleanup(user)


def test_game_catalogue_fetch_does_not_reset_existing_game_history():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        saved = client.post('/api/games/result', json={
            'session_id': 'preserve-history-001',
            'game_name': 'Memory Match',
            'game_type': 'memory',
            'correct_answers': 18,
            'total_questions': 20,
            'completed': True,
        })
        assert saved.status_code == 200
        assert client.get('/api/games').status_code == 200
        results = client.get('/api/games/results').json()
        assert results['games_played'] == 1
        assert results['total_questions'] == 20
    finally:
        _cleanup(user)


def test_communication_success_is_validated_and_not_rewarded_twice():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        catalogue = client.get('/api/communication').json()
        assert len(catalogue['categories']) == 10
        assert len(catalogue['sentence_exercises']) >= 15
        assert {'Food', 'Home', 'People'} <= {item['category'] for item in catalogue['sentence_exercises']}
        assert catalogue['progress'] == {'attempts': 0, 'correct': 0, 'completed_activities': 0}

        invalid = client.post('/api/communication', json={
            'phrase': 'I want a spaceship', 'category': 'sentence-correct:Needs', 'spoken': False,
        })
        assert invalid.status_code == 200
        assert client.get('/api/rewards').json()['stars'] == 0

        valid_payload = {'phrase': 'I want water', 'category': 'sentence-correct:Needs', 'spoken': False}
        client.post('/api/communication', json=valid_payload)
        client.post('/api/communication', json=valid_payload)
        assert client.get('/api/rewards').json()['stars'] == 1
        saved_progress = client.get('/api/communication').json()['progress']
        assert saved_progress == {'attempts': 3, 'correct': 1, 'completed_activities': 1}
        progress = client.get('/api/progress').json()
        assert progress['communication_count'] == 3
        assert progress['communication_correct'] == 1
    finally:
        _cleanup(user)


def test_chat_history_persists_and_provider_outage_does_not_store_fake_reply(monkeypatch):
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    monkeypatch.setattr(ChatbotService, 'generate_response', staticmethod(lambda message, conversation_context=None: 'Hello from the helper.'))
    try:
        response = client.post('/api/chat', json={'message': 'Say hello', 'conversation_context': []})
        assert response.status_code == 200
        assert response.json()['response'] == 'Hello from the helper.'
        assert client.get('/api/chat/history').json()['history'][0]['message'] == 'Say hello'

        def unavailable(message, conversation_context=None):
            raise OllamaUnavailable('AI offline')

        monkeypatch.setattr(ChatbotService, 'generate_response', staticmethod(unavailable))
        failed = client.post('/api/chat', json={'message': 'Another question', 'conversation_context': []})
        assert failed.status_code == 503
        history = client.get('/api/chat/history').json()['history']
        assert len(history) == 1
    finally:
        _cleanup(user)


def test_mission_reward_requires_activity_evidence_and_is_one_time():
    user = _make_user()
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        assert client.get('/api/mission/today').json()['completed_count'] == 0
        assert client.post('/api/mission/complete', json={'mission_key': 'colour-match'}).status_code == 409
        result = client.post('/api/games/result', json={
            'session_id': 'mission-colour-1', 'game_name': 'Colour Mission',
            'game_type': 'mission_colour_match', 'correct_answers': 5,
            'total_questions': 5, 'completed': True,
        })
        assert result.status_code == 200
        first = client.post('/api/mission/complete', json={'mission_key': 'colour-match'}).json()
        again = client.post('/api/mission/complete', json={'mission_key': 'colour-match'}).json()
        assert first['new_stars_earned'] == 3
        assert again['new_stars_earned'] == 0
        assert again['completed_count'] == 1
    finally:
        _cleanup(user)
