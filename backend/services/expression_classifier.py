from __future__ import annotations

from typing import Dict, List


class ExpressionClassifier:
    """Conservative visible-expression estimates from MediaPipe output.

    These are visible-expression cues, not a measurement of someone's internal
    emotional state. Ambiguous signals deliberately produce no label.
    """

    def predict_blendshapes(self, categories: List[object]) -> Dict[str, object]:
        scores: Dict[str, float] = {}
        for category in categories:
            name = getattr(category, 'category_name', None)
            score = getattr(category, 'score', None)
            if isinstance(name, str) and isinstance(score, (int, float)):
                scores[name] = float(score)

        if not scores:
            return {'expression': None, 'confidence': None}

        def average(*names: str) -> float:
            values = [scores[name] for name in names if name in scores]
            return sum(values) / len(values) if values else 0.0

        smile = average('mouthSmileLeft', 'mouthSmileRight')
        frown = average('mouthFrownLeft', 'mouthFrownRight')
        brow_down = average('browDownLeft', 'browDownRight')
        eye_squint = average('eyeSquintLeft', 'eyeSquintRight')
        inner_brow_up = scores.get('browInnerUp', 0.0)

        if smile >= 0.4:
            expression = 'happy'
        elif brow_down >= 0.35 and eye_squint >= 0.25:
            expression = 'angry'
        elif frown >= 0.3 or (inner_brow_up >= 0.45 and frown >= 0.15):
            expression = 'sad'
        elif max(smile, frown, brow_down, eye_squint, inner_brow_up) < 0.18:
            expression = 'calm'
        else:
            expression = None

        return {
            'expression': expression,
            'confidence': None,
            'estimation_type': 'demo',
            'model_note': 'Demo estimation from MediaPipe blendshapes' if expression else 'Unclear facial-expression signal',
        }

    def predict(self, features: Dict[str, float]) -> Dict[str, object]:
        smile = float(features.get('smile_curve', 0.0))
        mouth_open = float(features.get('mouth_open_ratio', 0.0))
        brow_lower = float(features.get('brow_lowering', 0.0))
        eye_open = float(features.get('eye_open_ratio', 0.0))

        # Clear upward mouth-corner movement is the most useful available cue.
        if smile >= 0.035:
            expression = 'happy'
        # A lowered brow plus narrowed eyes is a weak frown cue; require both.
        elif brow_lower >= 0.035 and eye_open <= 0.20:
            expression = 'angry'
        # Sadness is particularly hard to infer from a still image. Only report
        # a visible downturned mouth with otherwise relaxed brows.
        elif smile <= -0.045 and brow_lower < 0.025 and mouth_open < 0.12:
            expression = 'sad'
        elif abs(smile) < 0.025 and brow_lower < 0.025 and 0.12 < eye_open < 0.30:
            expression = 'calm'
        else:
            expression = None

        return {
            'expression': expression,
            'confidence': None,
            'estimation_type': 'demo',
            'model_note': 'Demo estimation from facial landmarks' if expression else 'Unclear facial-expression signal',
        }

    def extract_features(self, landmarks: List[object]) -> Dict[str, float]:
        if len(landmarks) < 468:
            return {}

        def point(index: int):
            item = landmarks[index]
            return (float(item.x), float(item.y))

        def distance(a, b):
            return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5

        # Normalize vertical cues by cheek-to-cheek face width so distance from
        # the camera and image resolution do not change the thresholds.
        face_width = max(distance(point(234), point(454)), 1e-5)
        left_corner, right_corner = point(61), point(291)
        mouth_center = point(13)
        corner_y = (left_corner[1] + right_corner[1]) / 2.0
        smile_curve = (mouth_center[1] - corner_y) / face_width

        # Eye aspect ratio estimates openness while compensating for scale.
        left_eye_h = (distance(point(159), point(145)) + distance(point(158), point(153))) / 2
        left_eye_w = distance(point(33), point(133))
        right_eye_h = (distance(point(386), point(374)) + distance(point(385), point(380))) / 2
        right_eye_w = distance(point(362), point(263))
        eye_open_ratio = (left_eye_h / max(left_eye_w, 1e-5) + right_eye_h / max(right_eye_w, 1e-5)) / 2

        # Approximate brow lowering using brow-to-eye vertical spacing, relative
        # to face width. Larger spacing is not treated as an emotion cue.
        left_brow_eye = point(105)[1] - point(159)[1]
        right_brow_eye = point(334)[1] - point(386)[1]
        brow_lowering = ((left_brow_eye + right_brow_eye) / 2) / face_width
        mouth_open_ratio = distance(point(13), point(14)) / face_width

        return {
            'smile_curve': smile_curve,
            'mouth_open_ratio': mouth_open_ratio,
            'brow_lowering': brow_lowering,
            'eye_open_ratio': eye_open_ratio,
        }
