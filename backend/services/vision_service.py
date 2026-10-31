from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict

import cv2
import numpy as np
from services.expression_classifier import ExpressionClassifier

try:
    import mediapipe as mp
except Exception:  # pragma: no cover
    mp = None

logger = logging.getLogger(__name__)

class VisionService:
    MAX_INFERENCE_WIDTH = 320
    MAX_INFERENCE_HEIGHT = 240

    def __init__(self) -> None:
        self.face_mesh = None
        self.face_landmarker = None
        self.face_cascade = None
        self.face_mesh_error = None
        self.expression_classifier = ExpressionClassifier()

        if mp is not None:
            try:
                model_path = Path(__file__).resolve().parents[1] / 'assets' / 'face_landmarker.task'
                if hasattr(mp, 'tasks') and model_path.is_file():
                    options = mp.tasks.vision.FaceLandmarkerOptions(
                        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
                        running_mode=mp.tasks.vision.RunningMode.IMAGE,
                        num_faces=2,
                        output_face_blendshapes=True,
                    )
                    self.face_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
                elif getattr(mp, 'solutions', None):
                    self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                        static_image_mode=True,
                        max_num_faces=2,
                        refine_landmarks=False,
                        min_detection_confidence=0.4,
                        min_tracking_confidence=0.4,
                    )
                else:
                    raise RuntimeError('No supported MediaPipe face-landmark API or model asset is available.')
            except Exception as exc:
                self.face_mesh_error = str(exc)
                logger.exception('MediaPipe face-landmark initialization failed; using the OpenCV fallback.')

        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

    def analyze_image(self, image_data: bytes) -> Dict[str, object]:
        try:
            np_arr = np.frombuffer(image_data, dtype=np.uint8)
            image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if image is None:
                return {
                    'face_detected': False,
                    'expression': None,
                    'confidence': None,
                    'message': 'Invalid image data.',
                    'multiple_faces': False,
                    'source': 'invalid',
                    'detector': 'none',
                }
            image = self.resize_for_inference(image)

            if self.face_landmarker is not None:
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                results = self.face_landmarker.detect(mp_image)
                faces = results.face_landmarks or []
                if not faces:
                    return self._missing_face_response()
                if len(faces) > 1:
                    return self._multiple_faces_response()
                blendshapes = results.face_blendshapes[0] if results.face_blendshapes else []
                expression = self._classify_landmarks(faces[0], blendshapes)
                return self._face_expression_response('mediapipe-tasks', expression)
            elif self.face_mesh is not None:
                rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                results = self.face_mesh.process(rgb)

                if results.multi_face_landmarks is None:
                    return self._missing_face_response()

                if len(results.multi_face_landmarks) > 1:
                    return self._multiple_faces_response()

                expression = self._classify_landmarks(results.multi_face_landmarks[0].landmark)
                return self._face_expression_response('mediapipe', expression)
            else:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                if self.face_cascade.empty():
                    return {
                        'face_detected': False,
                        'multiple_faces': False,
                        'expression': None,
                        'confidence': None,
                        'message': 'The camera detector is unavailable. You can still choose an activity below.',
                        'source': 'unavailable',
                        'detector': 'unavailable',
                    }
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.15,
                    minNeighbors=4,
                    minSize=(32, 32),
                )

                if len(faces) == 0:
                    return self._missing_face_response()

                if len(faces) > 1:
                    return self._multiple_faces_response()

                return self._face_expression_response('opencv', None)
        except Exception:
            logger.exception('Camera image analysis failed')
            return {
                'face_detected': False,
                'expression': None,
                'confidence': None,
                'message': 'The camera check could not be completed. Please try again.',
                'multiple_faces': False,
                'source': 'error',
                'detector': 'error',
            }

    @classmethod
    def resize_for_inference(cls, image: np.ndarray) -> np.ndarray:
        height, width = image.shape[:2]
        scale = min(1.0, cls.MAX_INFERENCE_WIDTH / width, cls.MAX_INFERENCE_HEIGHT / height)
        if scale >= 1:
            return image
        target_size = (max(1, round(width * scale)), max(1, round(height * scale)))
        return cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)

    def _classify_landmarks(self, landmarks, blendshapes=None) -> str | None:
        if blendshapes:
            prediction = self.expression_classifier.predict_blendshapes(blendshapes)
            expression = prediction.get('expression')
            return expression if expression in {'happy', 'sad', 'angry', 'calm'} else None
        features = self.expression_classifier.extract_features(landmarks)
        prediction = self.expression_classifier.predict(features) if features else {}
        expression = prediction.get('expression')
        return expression if expression in {'happy', 'sad', 'angry', 'calm'} else None

    def _missing_face_response(self) -> Dict[str, object]:
        return {
            'face_detected': False,
            'expression': None,
            'confidence': None,
            'message': '🙂 Please look toward the camera.',
            'multiple_faces': False,
            'source': 'camera',
            'detector': 'face-presence',
        }

    @staticmethod
    def _face_expression_response(detector: str, expression: str | None) -> Dict[str, object]:
        if expression:
            message = (
                f'Demo estimation — estimated facial expression: {expression.title()}. '
                'A facial expression cannot tell us how you feel.'
            )
        elif detector == 'opencv':
            message = 'Face detected. Facial-expression estimation is unavailable; only face presence was checked.'
        else:
            message = 'Face detected, but the visible expression is unclear. Try again in good lighting.'
        return {
            'face_detected': True,
            'multiple_faces': False,
            'expression': expression,
            'confidence': None,
            'estimation_type': 'demo' if expression else None,
            'message': message,
            'source': 'camera',
            'detector': detector,
        }

    @staticmethod
    def _multiple_faces_response() -> Dict[str, object]:
        return {
            'face_detected': True,
            'multiple_faces': True,
            'expression': None,
            'confidence': None,
            'message': 'Please make sure only one person is visible.',
            'source': 'camera',
            'detector': 'face-presence',
        }
