import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from auth import get_current_user
from database import SessionLocal
from main import app
from models import EmotionActivity, User
from services.vision_service import VisionService
import numpy as np
from types import SimpleNamespace

client = TestClient(app)


def test_vision_frames_are_resized_before_inference():
    image = np.zeros((1080, 1920, 3), dtype=np.uint8)
    resized = VisionService.resize_for_inference(image)
    assert resized.shape[:2] == (180, 320)


def test_emotion_analyze_rejects_invalid_image_data():
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

        assert response.status_code == 422
        data = response.json()
        assert data['detail'] == 'Invalid image data.'
    finally:
        db = SessionLocal()
        db.query(User).filter(User.email == 'camera-user@example.com').delete()
        db.commit()
        db.close()
        app.dependency_overrides.clear()


def test_emotion_analyze_returns_expression_estimate_and_matching_activity(monkeypatch):
    from routers import emotion

    user = User(full_name='Caption User', email='caption-user@example.com', password_hash='hashed-password')
    db = SessionLocal()
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    app.dependency_overrides[get_current_user] = lambda: user
    monkeypatch.setattr(
        emotion.vision_service,
        'analyze_image',
        lambda _: {
            'face_detected': True,
            'multiple_faces': False,
            'expression': 'sad',
            'confidence': 0.64,
            'message': 'Demo estimation — estimated facial expression: Sad. A facial expression cannot tell us how you feel.',
        },
    )
    try:
        response = client.post(
            '/api/emotion/analyze',
            files={'file': ('frame.jpg', b'frame-bytes', 'image/jpeg')},
        )

        assert response.status_code == 200
        assert response.json()['face_detected'] is True
        assert response.json()['expression'] == 'sad'
        assert response.json()['confidence'] is None
        assert response.json()['suggested_activity'] == 'Try a colour-matching or easy puzzle activity.'
        assert response.json()['estimation_type'] == 'demo'
        assert 'Demo estimation' in response.json()['message']
    finally:
        db = SessionLocal()
        db.query(User).filter(User.email == 'caption-user@example.com').delete()
        db.commit()
        db.close()
        app.dependency_overrides.clear()


def test_vision_service_passes_mediapipe_landmarks_to_expression_classifier(monkeypatch):
    service = VisionService()
    face_landmarks = [SimpleNamespace(x=0.5, y=0.5) for _ in range(468)]
    service.face_mesh = None
    service.face_landmarker = SimpleNamespace(
        detect=lambda _: SimpleNamespace(
            face_landmarks=[face_landmarks],
            face_blendshapes=[[
                SimpleNamespace(category_name='mouthSmileLeft', score=0.8),
                SimpleNamespace(category_name='mouthSmileRight', score=0.8),
            ]],
        ),
    )
    service.expression_classifier = SimpleNamespace(
        extract_features=lambda landmarks: {'smile_curve': 0.06},
        predict=lambda features: {'expression': 'happy', 'confidence': None},
        predict_blendshapes=lambda categories: {'expression': 'happy', 'confidence': None},
    )
    monkeypatch.setattr('services.vision_service.cv2.imdecode', lambda *_: np.zeros((240, 320, 3), dtype=np.uint8))

    result = service.analyze_image(b'image-data')

    assert result['face_detected'] is True
    assert result['expression'] == 'happy'
    assert result['confidence'] is None
    assert result['detector'] == 'mediapipe-tasks'
    assert 'estimated facial expression: happy' in result['message'].lower()


def test_classifier_maps_mediapipe_blendshapes_to_visible_expressions():
    from services.expression_classifier import ExpressionClassifier

    classifier = ExpressionClassifier()
    tests = [
        ([('mouthSmileLeft', 0.8), ('mouthSmileRight', 0.8)], 'happy'),
        ([('mouthFrownLeft', 0.6), ('mouthFrownRight', 0.6)], 'sad'),
        ([('browDownLeft', 0.7), ('browDownRight', 0.7), ('eyeSquintLeft', 0.5), ('eyeSquintRight', 0.5)], 'angry'),
        ([('mouthSmileLeft', 0.02), ('mouthFrownLeft', 0.03), ('browDownLeft', 0.01)], 'calm'),
    ]

    for blendshape_scores, expected in tests:
        categories = [
            SimpleNamespace(category_name=name, score=score)
            for name, score in blendshape_scores
        ]
        assert classifier.predict_blendshapes(categories)['expression'] == expected


def test_expression_classifier_uses_landmark_geometry_for_visible_smile():
    from services.expression_classifier import ExpressionClassifier

    landmarks = [SimpleNamespace(x=0.5, y=0.5) for _ in range(468)]
    points = {
        234: (0.2, 0.5),
        454: (0.8, 0.5),
        61: (0.4, 0.6),
        291: (0.6, 0.6),
        13: (0.5, 0.65),
        14: (0.5, 0.65),
        159: (0.3, 0.35),
        145: (0.3, 0.37),
        158: (0.3, 0.35),
        153: (0.3, 0.37),
        33: (0.25, 0.36),
        133: (0.35, 0.36),
        386: (0.3, 0.35),
        374: (0.3, 0.37),
        385: (0.3, 0.35),
        380: (0.3, 0.37),
        362: (0.25, 0.36),
        263: (0.35, 0.36),
        105: (0.3, 0.25),
        334: (0.3, 0.25),
    }
    for index, (x, y) in points.items():
        landmarks[index] = SimpleNamespace(x=x, y=y)

    classifier = ExpressionClassifier()
    result = classifier.predict(classifier.extract_features(landmarks))

    assert result['expression'] == 'happy'
    assert result['confidence'] is None


def test_bundled_mediapipe_tasks_model_processes_a_camera_frame():
    import cv2

    service = VisionService()
    assert service.face_landmarker is not None
    success, encoded = cv2.imencode('.jpg', np.zeros((240, 320, 3), dtype=np.uint8))
    assert success

    result = service.analyze_image(encoded.tobytes())

    assert result['face_detected'] is False
    assert result['expression'] is None
    assert result['source'] == 'camera'


def test_emotion_analyze_reports_detector_failure_without_crashing(monkeypatch):
    from routers import emotion

    user = User(full_name='Detector Error User', email='detector-error@example.com', password_hash='hashed-password')
    db = SessionLocal()
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    app.dependency_overrides[get_current_user] = lambda: user
    monkeypatch.setattr(
        emotion.vision_service,
        'analyze_image',
        lambda _: {
            'face_detected': False,
            'multiple_faces': False,
            'expression': None,
            'confidence': None,
            'message': 'The camera check could not be completed. Please try again.',
            'source': 'error',
        },
    )
    try:
        response = client.post(
            '/api/emotion/analyze',
            files={'file': ('frame.jpg', b'frame-bytes', 'image/jpeg')},
        )

        assert response.status_code == 503
        assert response.json()['detail'] == 'The camera check could not be completed. Please try again.'
    finally:
        db = SessionLocal()
        db.query(User).filter(User.email == 'detector-error@example.com').delete()
        db.commit()
        db.close()
        app.dependency_overrides.clear()


def test_child_selected_emotion_saves_only_authenticated_manual_result():
    user = User(full_name='Manual Emotion User', email='manual-emotion@example.com', password_hash='hashed-password')
    db = SessionLocal()
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = client.post('/api/emotion/activity', json={
            'emotion': 'calm',
            'estimated': False,
            'confidence': None,
            'activity': 'Child-selected emotion check-in',
        })
        assert response.status_code == 200
        assert response.json()['status'] == 'saved'
        assert response.json()['confidence'] is None

        db = SessionLocal()
        saved = db.query(EmotionActivity).filter(EmotionActivity.user_id == user_id).one()
        assert saved.emotion == 'calm'
        assert saved.estimated is False
        assert saved.confidence is None
        db.close()
    finally:
        db = SessionLocal()
        db.query(EmotionActivity).filter(EmotionActivity.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()
        db.close()
        app.dependency_overrides.clear()
