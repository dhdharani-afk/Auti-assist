from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, value):
        if not value.strip():
            raise ValueError('Name cannot be empty')
        return value.strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    theme: str = 'light'
    sound: bool = True
    animations: bool = True
    notifications: bool = True
    role: str = 'child'


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserResponse


class LearningResultCreate(BaseModel):
    question: str = Field(min_length=1, max_length=255)
    answer: Optional[str] = Field(default=None, max_length=255)
    is_correct: bool
    score: float = Field(ge=0, le=1)
    category: str = Field(min_length=1, max_length=100)
    difficulty: str = Field(default='beginner', max_length=50)


class GameResultCreate(BaseModel):
    session_id: str = Field(min_length=1, max_length=64)
    game_name: Optional[str] = None
    game_type: Optional[str] = None
    difficulty: str = 'easy'
    score: float = Field(default=0, ge=0, le=100)
    correct_answers: int = Field(default=0, ge=0)
    total_questions: int = Field(default=0, ge=0)
    time_taken: int = Field(default=0, ge=0)
    completed: bool = False
    stars: int = 0
    stars_earned: int = 0


class CommunicationLogCreate(BaseModel):
    phrase: str = Field(min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    spoken: bool = False


class RoutineCompleteCreate(BaseModel):
    task_name: str = Field(min_length=1, max_length=150)
    completed: bool = True


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_context: Optional[List[str]] = Field(default=None, max_length=8)


class AIChatResponse(BaseModel):
    success: bool = True
    response: str


class EmotionActivityCreate(BaseModel):
    emotion: str
    estimated: bool = False
    confidence: float = 0.0
    activity: str


class SocialSituationResultCreate(BaseModel):
    scenario_id: str
    category: str
    attempts: int = 1
    completed: bool = False
    response_ids: List[str] = Field(default_factory=list)


class EmotionAnalysisResponse(BaseModel):
    face_detected: bool
    multiple_faces: bool = False
    expression: Optional[str] = None
    confidence: float = 0.0
    message: str
    estimated: bool = True
    source: str = 'camera'


class SettingsUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    theme: Optional[str] = None
    sound: Optional[bool] = None
    animations: Optional[bool] = None
    notifications: Optional[bool] = None


class RecommendationOut(BaseModel):
    title: str
    detail: str


class MissionCompletionCreate(BaseModel):
    mission_key: str
