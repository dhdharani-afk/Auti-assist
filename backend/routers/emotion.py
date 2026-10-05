from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from database import get_db
from models import EmotionActivity, User
from schemas import EmotionActivityCreate, EmotionAnalysisResponse
from auth import get_current_user
from services.vision_service import VisionService

router = APIRouter()
vision_service = VisionService()

EMOTION_GUIDES = {
    'happy': 'Try a short movement or drawing activity.',
    'sad': 'Take a calm breathing break and a quiet colouring activity.',
    'angry': 'Take three slow breaths and do a counting game.',
    'scared': 'Listen to a calming story and sit in a cozy space.',
    'calm': 'Enjoy a simple puzzle or gentle music.',
    'okay': 'Try a quick learning activity or a short stretch.',
    'neutral': 'Try a quick learning activity or a short stretch.',
}

@router.post('/emotion/activity')
async def emotion_activity(payload: EmotionActivityCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    activity = EMOTION_GUIDES.get(payload.emotion.lower(), 'Try a calm break and a small learning task.')
    item = EmotionActivity(
        user_id=current_user.id,
        emotion=payload.emotion,
        estimated=payload.estimated,
        confidence=payload.confidence,
        activity=activity,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {'status': 'saved', 'activity': activity, 'estimated': payload.estimated, 'confidence': payload.confidence}

@router.post('/emotion/analyze', response_model=EmotionAnalysisResponse)
async def emotion_analyze(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='No image file provided.')

    image_bytes = await file.read()
    result = vision_service.analyze_image(image_bytes)

    if result.get('multiple_faces'):
        return EmotionAnalysisResponse(
            face_detected=True,
            multiple_faces=True,
            expression=None,
            confidence=0.0,
            message='Please make sure only one person is visible.',
            estimated=True,
            source='camera',
        )

    if not result.get('face_detected'):
        return EmotionAnalysisResponse(
            face_detected=False,
            expression=None,
            confidence=0.0,
            message=result.get('message', 'No face detected. Please look toward the camera.'),
            estimated=True,
            source='camera',
        )

    return EmotionAnalysisResponse(
        face_detected=True,
        expression=result.get('expression'),
        confidence=float(result.get('confidence') or 0.0),
        message=result.get('message', 'Estimated facial expression available.'),
        estimated=True,
        source='camera',
    )

@router.get('/emotion')
async def get_emotion(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {'options': ['Happy', 'Sad', 'Angry', 'Scared', 'Calm', 'Okay'], 'note': 'Facial expression estimate only.'}
