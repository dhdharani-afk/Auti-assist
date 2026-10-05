from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import SocialSituationResult, User
from schemas import SocialSituationResultCreate

router = APIRouter()

SCENARIOS = [
    {
        'id': 'meeting-new-friend', 'category': 'Greetings', 'title': 'Meeting a new friend', 'difficulty': 'Easy',
        'steps': [
            {'situation': 'Ravi says: Hi! My name is Ravi. What could you say?', 'question': 'Choose a friendly greeting.', 'options': [
                {'id': 'a', 'text': 'Hi Ravi! My name is Sam.', 'helpful': True}, {'id': 'b', 'text': 'Go away.', 'helpful': False}, {'id': 'c', 'text': 'Walk away.', 'helpful': False}, {'id': 'd', 'text': "I don't know.", 'helpful': False},
            ], 'feedback': 'That is a friendly way to start a conversation.'},
            {'situation': 'Ravi asks: What games do you like?', 'question': 'How could you answer?', 'options': [
                {'id': 'a', 'text': 'I like building games. What do you like?', 'helpful': True}, {'id': 'b', 'text': 'No.', 'helpful': False}, {'id': 'c', 'text': 'That is silly.', 'helpful': False},
            ], 'feedback': 'You shared an idea and asked Ravi a question.'},
        ],
    },
    {'id': 'greeting-teacher', 'category': 'School', 'title': 'Greeting a teacher', 'difficulty': 'Easy', 'steps': [{'situation': 'You see your teacher at the classroom door.', 'question': 'What could you say?', 'options': [{'id': 'a', 'text': 'Good morning!', 'helpful': True}, {'id': 'b', 'text': 'Be quiet.', 'helpful': False}, {'id': 'c', 'text': 'Ignore them.', 'helpful': False}], 'feedback': 'A kind greeting helps everyone feel welcome.'}]},
    {'id': 'asking-for-help', 'category': 'Asking for Help', 'title': 'Asking for help', 'difficulty': 'Easy', 'steps': [{'situation': 'Your puzzle feels difficult and you need support.', 'question': 'What could you say?', 'options': [{'id': 'a', 'text': 'Could you please help me?', 'helpful': True}, {'id': 'b', 'text': 'Do it for me!', 'helpful': False}, {'id': 'c', 'text': 'Throw it away.', 'helpful': False}], 'feedback': 'Asking clearly and politely lets someone know what you need.'}]},
    {'id': 'joining-group', 'category': 'Making Friends', 'title': 'Joining a group', 'difficulty': 'Medium', 'steps': [{'situation': 'Some children are drawing together.', 'question': 'How could you join?', 'options': [{'id': 'a', 'text': 'May I draw with you?', 'helpful': True}, {'id': 'b', 'text': 'Move over!', 'helpful': False}, {'id': 'c', 'text': 'Take the crayons.', 'helpful': False}], 'feedback': 'Asking permission is a friendly way to join.'}]},
    {'id': 'sharing-toy', 'category': 'Sharing & Taking Turns', 'title': 'Sharing a toy', 'difficulty': 'Easy', 'steps': [{'situation': 'You are playing with a favourite toy and a friend wants a turn.', 'question': 'What could you say?', 'options': [{'id': 'a', 'text': 'You can have a turn after me.', 'helpful': True}, {'id': 'b', 'text': 'It is only mine!', 'helpful': False}, {'id': 'c', 'text': 'Grab it quickly.', 'helpful': False}], 'feedback': 'Making a turn plan helps both people play.'}]},
    {'id': 'taking-turns', 'category': 'Sharing & Taking Turns', 'title': 'Taking turns', 'difficulty': 'Medium', 'steps': [{'situation': 'It is your turn in a board game.', 'question': 'What can you do?', 'options': [{'id': 'a', 'text': 'Take your turn, then pass the game.', 'helpful': True}, {'id': 'b', 'text': 'Keep all the pieces.', 'helpful': False}, {'id': 'c', 'text': 'Stop everyone else.', 'helpful': False}], 'feedback': 'Taking turns makes a game fair and fun.'}]},
    {'id': 'saying-thank-you', 'category': 'Conversation', 'title': 'Saying thank you', 'difficulty': 'Easy', 'steps': [{'situation': 'A friend gives you a pencil.', 'question': 'What could you say?', 'options': [{'id': 'a', 'text': 'Thank you!', 'helpful': True}, {'id': 'b', 'text': 'Give me another one.', 'helpful': False}, {'id': 'c', 'text': 'Leave it there.', 'helpful': False}], 'feedback': 'Thanking someone shows you noticed their kindness.'}]},
    {'id': 'saying-sorry', 'category': 'Disagreement', 'title': 'Saying sorry', 'difficulty': 'Medium', 'steps': [{'situation': 'You accidentally knock over a friend’s blocks.', 'question': 'What could you say?', 'options': [{'id': 'a', 'text': 'I am sorry. Can I help rebuild?', 'helpful': True}, {'id': 'b', 'text': 'It was your fault.', 'helpful': False}, {'id': 'c', 'text': 'I do not care.', 'helpful': False}], 'feedback': 'An apology and an offer to help can repair a moment.'}]},
    {'id': 'asking-permission', 'category': 'Personal Boundaries', 'title': 'Asking permission', 'difficulty': 'Medium', 'steps': [{'situation': 'You want to use a friend’s colouring pens.', 'question': 'What could you ask?', 'options': [{'id': 'a', 'text': 'May I use your pens, please?', 'helpful': True}, {'id': 'b', 'text': 'I am taking these.', 'helpful': False}, {'id': 'c', 'text': 'You cannot use them.', 'helpful': False}], 'feedback': 'Asking first respects another person’s belongings.'}]},
    {'id': 'saying-goodbye', 'category': 'Everyday Situations', 'title': 'Saying goodbye', 'difficulty': 'Easy', 'steps': [{'situation': 'The activity is finished and your friend is leaving.', 'question': 'What could you say?', 'options': [{'id': 'a', 'text': 'Goodbye! See you next time.', 'helpful': True}, {'id': 'b', 'text': 'Do not leave.', 'helpful': False}, {'id': 'c', 'text': 'Turn away silently.', 'helpful': False}], 'feedback': 'A warm goodbye lets someone know you enjoyed spending time together.'}]},
]

SCENARIO_MAP = {scenario['id']: scenario for scenario in SCENARIOS}


def require_child(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != 'child':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='This activity is available for child profiles.')
    return current_user


@router.get('/social-simulator/scenarios')
async def get_scenarios(current_user: User = Depends(require_child)):
    return {'scenarios': SCENARIOS}


@router.post('/social-simulator/result')
async def save_result(payload: SocialSituationResultCreate, current_user: User = Depends(require_child), db: Session = Depends(get_db)):
    scenario = SCENARIO_MAP.get(payload.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail='Scenario not found.')
    if payload.category != scenario['category']:
        raise HTTPException(status_code=400, detail='Scenario category does not match.')

    completed = bool(payload.completed)
    if completed:
        expected_steps = scenario['steps']
        valid_responses = len(payload.response_ids) == len(expected_steps) and all(
            any(option['id'] == response_id and option['helpful'] for option in step['options'])
            for step, response_id in zip(expected_steps, payload.response_ids)
        )
        if not valid_responses:
            raise HTTPException(status_code=400, detail='Complete each practice step with a helpful response before saving.')

    prior_completion = None
    if completed:
        prior_completion = (
            db.query(SocialSituationResult)
            .filter(
                SocialSituationResult.user_id == current_user.id,
                SocialSituationResult.scenario_id == payload.scenario_id,
                SocialSituationResult.completed.is_(True),
            )
            .first()
        )
    stars_earned = 2 if completed and prior_completion is None else 0
    result = SocialSituationResult(
        user_id=current_user.id,
        scenario_id=payload.scenario_id,
        category=scenario['category'],
        attempts=max(1, payload.attempts),
        completed=completed,
        stars_earned=stars_earned,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return {'success': True, 'completed': completed, 'stars_earned': stars_earned, 'result_id': result.id}


@router.get('/social-simulator/progress')
async def get_progress(current_user: User = Depends(require_child), db: Session = Depends(get_db)):
    results = db.query(SocialSituationResult).filter(SocialSituationResult.user_id == current_user.id).all()
    return {
        'scenarios_attempted': len(results),
        'scenarios_completed': sum(1 for result in results if result.completed),
        'categories_practiced': len({result.category for result in results}),
        'stars_earned': sum(result.stars_earned for result in results),
        'progress': min(100, round((sum(1 for result in results if result.completed) / len(SCENARIOS)) * 100)) if results else 0,
    }
