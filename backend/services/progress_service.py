from collections import defaultdict
from datetime import date, datetime, time, timedelta

from models import (
    CommunicationLog,
    EmotionActivity,
    GameResult,
    LearningResult,
    MissionCompletion,
    RoutineCompletion,
    SocialSituationResult,
)

ROUTINE_TASK_COUNT = 8


def _utc_today():
    return datetime.utcnow().date()


def _day_start(day: date):
    return datetime.combine(day, time.min)


def _communication_success(row):
    return (row.category or '').startswith(('sentence-correct:', 'scenario-correct:'))


def get_user_activity(db, user_id: int):
    return {
        'learning': db.query(LearningResult).filter(LearningResult.user_id == user_id).order_by(LearningResult.timestamp.desc()).all(),
        'games': db.query(GameResult).filter(GameResult.user_id == user_id).order_by(GameResult.timestamp.desc()).all(),
        'communication': db.query(CommunicationLog).filter(CommunicationLog.user_id == user_id).order_by(CommunicationLog.created_at.desc()).all(),
        'emotion': db.query(EmotionActivity).filter(EmotionActivity.user_id == user_id).order_by(EmotionActivity.created_at.desc()).all(),
        'routine': db.query(RoutineCompletion).filter(RoutineCompletion.user_id == user_id).order_by(RoutineCompletion.completed_at.desc()).all(),
        'social': db.query(SocialSituationResult).filter(SocialSituationResult.user_id == user_id).order_by(SocialSituationResult.created_at.desc()).all(),
        'missions': db.query(MissionCompletion).filter(MissionCompletion.user_id == user_id).order_by(MissionCompletion.completed_at.desc()).all(),
    }


def _activity_days(records):
    days = set()
    for row in records['learning']:
        if row.timestamp:
            days.add(row.timestamp.date())
    for row in records['games']:
        if row.completed and row.timestamp:
            days.add(row.timestamp.date())
    for row in records['communication']:
        if row.created_at and ((row.category or '').startswith(('sentence-correct:', 'scenario-correct:', 'mission-say-hello'))):
            days.add(row.created_at.date())
    for row in records['emotion']:
        if row.created_at:
            days.add(row.created_at.date())
    for row in records['routine']:
        if row.completed and row.completed_at:
            days.add(row.completed_at.date())
    for row in records['social']:
        if row.completed and row.created_at:
            days.add(row.created_at.date())
    for row in records['missions']:
        if row.mission_date:
            days.add(row.mission_date)
    return days


def _streak(days, today):
    if not days:
        return 0
    cursor = today if today in days else today - timedelta(days=1)
    count = 0
    while cursor in days:
        count += 1
        cursor -= timedelta(days=1)
    return count


def summarize_activity(records, today=None):
    today = today or _utc_today()
    today_start = _day_start(today)
    tomorrow_start = _day_start(today + timedelta(days=1))
    learning = records['learning']
    games = records['games']
    communication = records['communication']
    routine = records['routine']
    social = records['social']
    missions = records['missions']

    today_learning = [row for row in learning if row.timestamp and today_start <= row.timestamp < tomorrow_start]
    today_communication = [row for row in communication if row.created_at and today_start <= row.created_at < tomorrow_start and (row.category or '').startswith(('sentence-correct:', 'sentence-attempt:', 'scenario-correct:', 'scenario-attempt:'))]
    today_routine = [row for row in routine if row.completed_at and today_start <= row.completed_at < tomorrow_start]
    today_games = [row for row in games if row.completed and row.timestamp and today_start <= row.timestamp < tomorrow_start]
    today_emotions = [row for row in records['emotion'] if row.created_at and today_start <= row.created_at < tomorrow_start]
    today_learning_completed = {(row.category, row.question) for row in today_learning if row.is_correct}
    today_communication_successes = [row for row in today_communication if _communication_success(row)]
    completed_today_count = len(today_learning_completed) + len(today_communication_successes) + len(today_games) + len({row.task_name for row in today_routine if row.completed}) + len(today_emotions)

    all_correct_learning = { (row.category, row.question) for row in learning if row.is_correct }
    learning_stars = len(all_correct_learning)
    communication_stars = sum(1 for row in communication if _communication_success(row))
    game_stars = sum(int(row.stars_earned or row.stars or 0) for row in games if row.completed)
    social_stars = sum(int(row.stars_earned or 0) for row in social if row.completed)
    mission_stars = sum(int(row.stars_earned or 0) for row in missions)
    stars = learning_stars + communication_stars + game_stars + social_stars + mission_stars

    learning_percent = round(sum(1 for row in learning if row.is_correct) / len(learning) * 100) if learning else 0
    communication_attempts = [row for row in communication if (row.category or '').startswith(('sentence-correct:', 'sentence-attempt:', 'scenario-correct:', 'scenario-attempt:'))]
    communication_percent = round(sum(1 for row in communication_attempts if _communication_success(row)) / len(communication_attempts) * 100) if communication_attempts else 0
    routine_percent = round(len({row.task_name for row in today_routine if row.completed}) / ROUTINE_TASK_COUNT * 100)
    today_learning_percent = round(sum(1 for row in today_learning if row.is_correct) / len(today_learning) * 100) if today_learning else 0
    today_communication_percent = round(sum(1 for row in today_communication if _communication_success(row)) / len(today_communication) * 100) if today_communication else 0
    today_progress = round((today_learning_percent + today_communication_percent + routine_percent) / 3)

    if not any((learning, games, communication, routine, social, missions)):
        recommendation = 'Choose an activity to begin.'
    elif routine_percent < 100:
        recommendation = 'Choose one routine step for today.'
    elif today_learning_percent < 100:
        recommendation = 'Try a short learning activity.'
    elif today_communication_percent < 100:
        recommendation = 'Build a sentence or practice a helpful phrase.'
    else:
        recommendation = 'You have explored all your activity areas today. Great work!'

    activities = [
        {'name': row.task_name, 'done': row.completed}
        for row in today_routine[:4]
    ]

    return {
        'todayProgress': today_progress,
        'learning': learning_percent,
        'communication': communication_percent,
        'routine': routine_percent,
        'streak': _streak(_activity_days(records), today),
        'stars': stars,
        'recommendation': recommendation,
        'activities': activities,
        'learning_attempts': len(learning),
        'learning_correct': sum(1 for row in learning if row.is_correct),
        'game_count': sum(1 for row in games if row.completed),
        'communication_attempts': len(communication_attempts),
        'communication_correct': sum(1 for row in communication_attempts if _communication_success(row)),
        'routine_completed_today': len({row.task_name for row in today_routine if row.completed}),
        'emotion_activities': len(records['emotion']),
        'social_completed': sum(1 for row in social if row.completed),
        'mission_completed_today': sum(1 for row in missions if row.mission_date == today),
        'today_activity_count': completed_today_count,
    }


def get_progress_charts(records, today=None):
    today = today or _utc_today()
    days = [today - timedelta(days=offset) for offset in reversed(range(7))]
    learning_by_day = defaultdict(list)
    games_by_day = defaultdict(list)
    communication_by_day = defaultdict(list)
    routine_by_day = defaultdict(set)
    activity_count_by_day = defaultdict(int)

    for row in records['learning']:
        if row.timestamp:
            learning_by_day[row.timestamp.date()].append(row)
            activity_count_by_day[row.timestamp.date()] += 1
    for row in records['games']:
        if row.completed and row.timestamp:
            games_by_day[row.timestamp.date()].append(row)
            activity_count_by_day[row.timestamp.date()] += 1
    for row in records['communication']:
        if row.created_at and (row.category or '').startswith(('sentence-correct:', 'sentence-attempt:', 'scenario-correct:', 'scenario-attempt:')):
            communication_by_day[row.created_at.date()].append(row)
            activity_count_by_day[row.created_at.date()] += 1
    for row in records['emotion']:
        if row.created_at:
            activity_count_by_day[row.created_at.date()] += 1
    for row in records['routine']:
        if row.completed and row.completed_at:
            routine_by_day[row.completed_at.date()].add(row.task_name)
            activity_count_by_day[row.completed_at.date()] += 1

    learning_progress = [
        round(sum(1 for row in learning_by_day[day] if row.is_correct) / len(learning_by_day[day]) * 100) if learning_by_day[day] else 0
        for day in days
    ]
    game_scores = [
        round(sum(float(row.score or 0) for row in games_by_day[day]) / len(games_by_day[day])) if games_by_day[day] else 0
        for day in days
    ]
    communication_progress = [
        round(sum(1 for row in communication_by_day[day] if _communication_success(row)) / len(communication_by_day[day]) * 100) if communication_by_day[day] else 0
        for day in days
    ]
    routine_progress = [round(len(routine_by_day[day]) / ROUTINE_TASK_COUNT * 100) for day in days]

    return {
        'labels': [day.strftime('%a') for day in days],
        'weekly_learning_progress': learning_progress,
        'activity_completion': [min(100, activity_count_by_day[day] * 20) for day in days],
        'game_scores': game_scores,
        'routine_completion': routine_progress,
        'communication_progress': communication_progress,
    }
