from __future__ import annotations

from typing import Dict

import cv2
import numpy as np

try:
    import mediapipe as mp
except Exception:  # pragma: no cover
    mp = None

from services.expression_classifier import ExpressionClassifier


class VisionService:
    def __init__(self) -> None:
        self.face_mesh = None
        self.face_cascade = None

        if mp is not None:
            try:
                self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                    static_image_mode=False,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
            except Exception:
                self.face_mesh = None

        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        smile_path = cv2.data.haarcascades + 'haarcascade_smile.xml'
        self.smile_cascade = cv2.CascadeClassifier(smile_path)
        self.classifier = ExpressionClassifier()

    def analyze_image(self, image_data: bytes) -> Dict[str, object]:
        try:
            np_arr = np.frombuffer(image_data, dtype=np.uint8)
            image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if image is None:
                return {
                    'face_detected': False,
                    'expression': None,
                    'confidence': 0,
                    'message': 'Invalid image data.',
                    'multiple_faces': False,
                    'source': 'camera',
                    'estimated': True,
                }

            if self.face_mesh is not None:
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                results = self.face_mesh.process(rgb)

                if results.multi_face_landmarks is None:
                    return self._missing_face_response()

                if len(results.multi_face_landmarks) > 1:
                    return {
                        'face_detected': True,
                        'multiple_faces': True,
                        'expression': None,
                        'confidence': 0,
                        'message': 'Please make sure only one person is visible.',
                        'source': 'camera',
                        'estimated': True,
                    }

                landmarks = results.multi_face_landmarks[0].landmark
                features = self.classifier.extract_features(landmarks)
                prediction = self.classifier.predict(features)
            else:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))

                if len(faces) == 0:
                    return self._missing_face_response()

                if len(faces) > 1:
                    return {
                        'face_detected': True,
                        'multiple_faces': True,
                        'expression': None,
                        'confidence': 0,
                        'message': 'Please make sure only one person is visible.',
                        'source': 'camera',
                        'estimated': True,
                    }

                x, y, w, h = faces[0]
                face_gray = gray[y:y + h, x:x + w]
                lower_face = face_gray[int(h * 0.45):, :]
                upper_face = face_gray[:int(h * 0.48), :]
                smiles = self.smile_cascade.detectMultiScale(
                    lower_face,
                    scaleFactor=1.7,
                    minNeighbors=18,
                    minSize=(max(18, int(w * 0.18)), max(10, int(h * 0.08))),
                )
                eyes = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml').detectMultiScale(
                    upper_face,
                    scaleFactor=1.1,
                    minNeighbors=8,
                    minSize=(max(12, int(w * 0.08)), max(12, int(h * 0.08))),
                )
                features = {
                    # Haar fallback can only support a tentative smile cue. It
                    # cannot reliably distinguish sadness, anger, or neutral.
                    'smile_curve': 0.06 if len(smiles) else 0.0,
                    'mouth_open_ratio': 0.0,
                    'brow_lowering': 0.0,
                    'eye_open_ratio': 0.2 if len(eyes) >= 2 else 0.0,
                }
                prediction = self.classifier.predict(features)

            expression = prediction['expression']
            confidence = float(prediction['confidence'])
            message = self._expression_message(expression, confidence) if expression else (
                'Facial expression is unclear. Try facing the camera in even lighting, or choose a feeling yourself.'
            )

            return {
                'face_detected': True,
                'multiple_faces': False,
                'expression': expression,
                'confidence': confidence,
                'message': message,
                'source': 'camera',
                'estimated': True,
            }
        except Exception as exc:
            return {
                'face_detected': False,
                'expression': None,
                'confidence': 0,
                'message': 'We could not process the face image. Please try again.',
                'multiple_faces': False,
                'source': 'camera',
                'estimated': True,
                'error': str(exc),
            }

    def _missing_face_response(self) -> Dict[str, object]:
        return {
            'face_detected': False,
            'expression': None,
            'confidence': 0,
            'message': 'No face detected. Please look toward the camera.',
            'multiple_faces': False,
            'source': 'camera',
            'estimated': True,
        }

    def _expression_message(self, expression: str, confidence: float) -> str:
        label_map = {
            'happy': 'Estimated facial expression: Happy',
            'sad': 'Estimated facial expression: Sad',
            'angry': 'Estimated facial expression: Angry',
            'neutral': 'Estimated facial expression: Neutral',
        }

        estimate = label_map.get(expression, 'Estimated facial expression')
        return f'{estimate}. Confidence: {int(round(confidence * 100))}%.'
