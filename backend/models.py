from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    theme = Column(String(50), default='light')
    sound = Column(Boolean, default=True)
    animations = Column(Boolean, default=True)
    notifications = Column(Boolean, default=True)
    role = Column(String(30), nullable=False, default='child')
    created_at = Column(DateTime, default=datetime.utcnow)

    learning_results = relationship('LearningResult', back_populates='user', cascade='all, delete-orphan')
    game_results = relationship('GameResult', back_populates='user', cascade='all, delete-orphan')
    communication_logs = relationship('CommunicationLog', back_populates='user', cascade='all, delete-orphan')
    routine_completions = relationship('RoutineCompletion', back_populates='user', cascade='all, delete-orphan')
    rewards = relationship('Reward', back_populates='user', cascade='all, delete-orphan')
    chat_history = relationship('ChatHistory', back_populates='user', cascade='all, delete-orphan')
    emotion_activities = relationship('EmotionActivity', back_populates='user', cascade='all, delete-orphan')
    recommendations = relationship('Recommendation', back_populates='user', cascade='all, delete-orphan')
    social_situation_results = relationship('SocialSituationResult', back_populates='user', cascade='all, delete-orphan')
    mission_completions = relationship('MissionCompletion', back_populates='user', cascade='all, delete-orphan')


class LearningResult(Base):
    __tablename__ = 'learning_results'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    question = Column(String(255), nullable=False)
    answer = Column(String(255), nullable=True)
    is_correct = Column(Boolean, default=False)
    score = Column(Float, default=0)
    category = Column(String(100), nullable=False)
    difficulty = Column(String(50), default='beginner')
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='learning_results')


class GameResult(Base):
    __tablename__ = 'game_results'
    __table_args__ = (UniqueConstraint('user_id', 'session_id', name='uq_game_results_user_session'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    session_id = Column(String(64), nullable=True)
    game_name = Column(String(150), nullable=False)
    game_type = Column(String(150), nullable=False, default='memory')
    difficulty = Column(String(50), nullable=False, default='easy')
    score = Column(Float, default=0)
    correct_answers = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    time_taken = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    stars = Column(Integer, default=0)
    stars_earned = Column(Integer, default=0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='game_results')


class CommunicationLog(Base):
    __tablename__ = 'communication_logs'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    phrase = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    spoken = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='communication_logs')


class RoutineTask(Base):
    __tablename__ = 'routine_tasks'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    icon = Column(String(50), nullable=True)
    time = Column(String(50), nullable=True)
    order_index = Column(Integer, default=0)


class RoutineCompletion(Base):
    __tablename__ = 'routine_completion'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    task_name = Column(String(150), nullable=False)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='routine_completions')


class Reward(Base):
    __tablename__ = 'rewards'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(150), nullable=False)
    stars = Column(Integer, default=0)
    earned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='rewards')


class ChatHistory(Base):
    __tablename__ = 'chat_history'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='chat_history')


class EmotionActivity(Base):
    __tablename__ = 'emotion_activity'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    emotion = Column(String(100), nullable=False)
    estimated = Column(Boolean, default=False)
    confidence = Column(Float, nullable=True, default=None)
    activity = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='emotion_activities')


class Recommendation(Base):
    __tablename__ = 'recommendations'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=False)
    detail = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='recommendations')


class SocialSituationResult(Base):
    __tablename__ = 'social_situation_results'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    scenario_id = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    attempts = Column(Integer, default=1)
    completed = Column(Boolean, default=False)
    stars_earned = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='social_situation_results')


class MissionCompletion(Base):
    __tablename__ = 'mission_completions'
    __table_args__ = (UniqueConstraint('user_id', 'mission_date', 'mission_key', name='uq_mission_user_date_key'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    mission_date = Column(Date, nullable=False)
    mission_key = Column(String(80), nullable=False)
    stars_earned = Column(Integer, default=0)
    completed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='mission_completions')
