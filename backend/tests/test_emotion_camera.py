import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from auth import get_current_user
from database import SessionLocal
from main import app
from models import User

client = TestClient(app)


def test_emotion_analyze_returns_safe_response_for_invalid_image():
    user = User(full_name='Camera User', email='camera-user@example.com', password_hash='hashed-password')
    db = SessionLocal()
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.post(
            '/api/emotion/analyze',
            files={'file': ('frame.jpg', b'not-a-valid-image', 'image/jpeg')},
        )

        assert response.status_code == 200
        data = response.json()
        assert 'face_detected' in data
        assert 'message' in data
        assert data['expression'] is None or data['expression'] in {'happy', 'sad', 'angry', 'neutral'}
    finally:
        db = SessionLocal()
        db.query(User).filter(User.email == 'camera-user@example.com').delete()
        db.commit()
        db.close()
        app.dependency_overrides.clear()
