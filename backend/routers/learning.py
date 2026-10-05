from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import LearningResult, User
from schemas import LearningResultCreate
from auth import get_current_user

router = APIRouter()

CATEGORY_ICONS = {
    'Alphabet': '🔤',
    'Numbers': '🔢',
    'Colours': '🎨',
    'Shapes': '🔺',
    'Animals': '🐶',
    'Fruits': '🍎',
}


def question(question_id, category, prompt, choices, answer, question_type, level, visual=None):
    return {
        'id': question_id,
        'category': category,
        'prompt': prompt,
        'choices': choices,
        'answer': answer,
        'type': question_type,
        'level': level,
        'visual': visual,
    }


QUESTION_BANK = {
    'Alphabet': [
        question('alphabet-1', 'Alphabet', 'Which letter is this?', ['A', 'B', 'C', 'D'], 'A', 'multiple_choice', 1, '🔤 A'),
        question('alphabet-2', 'Alphabet', 'Find the letter B.', ['A', 'B', 'D', 'E'], 'B', 'find_object', 1, '🔎'),
        question('alphabet-3', 'Alphabet', 'Which word starts with C?', ['Cat', 'Dog', 'Fish', 'Sun'], 'Cat', 'multiple_choice', 1, '🐱'),
        question('alphabet-4', 'Alphabet', 'Match the letter D with its word.', ['Dog', 'Apple', 'Ball', 'Cat'], 'Dog', 'picture_matching', 2, '🐶 D'),
        question('alphabet-5', 'Alphabet', 'What comes after E?', ['D', 'F', 'G', 'H'], 'F', 'sequence', 2, 'E → ?'),
        question('alphabet-6', 'Alphabet', 'Which letter starts the word Fish?', ['F', 'S', 'H', 'I'], 'F', 'choose_answer', 2, '🐟 Fish'),
        question('alphabet-7', 'Alphabet', 'Put the next letter after H.', ['I', 'J', 'K', 'G'], 'I', 'sequence', 3, 'G, H, ?'),
        question('alphabet-8', 'Alphabet', 'Which pair matches?', ['J - Jam', 'K - Apple', 'L - Dog', 'M - Cat'], 'J - Jam', 'picture_matching', 3, '🍓 Jam'),
        question('alphabet-9', 'Alphabet', 'Which letter is between P and R?', ['O', 'Q', 'S', 'T'], 'Q', 'sequence', 3, 'P, ?, R'),
        question('alphabet-10', 'Alphabet', 'Find the letter that starts Sun.', ['T', 'U', 'S', 'V'], 'S', 'find_object', 3, '☀️ Sun'),
    ],
    'Numbers': [
        question('numbers-1', 'Numbers', 'Count the stars. How many are there?', ['3', '4', '5', '6'], '5', 'counting', 1, '⭐ ⭐ ⭐ ⭐ ⭐'),
        question('numbers-2', 'Numbers', 'Which number is 3?', ['2', '3', '4', '5'], '3', 'find_object', 1, '🔢'),
        question('numbers-3', 'Numbers', 'What comes after 6?', ['5', '7', '8', '9'], '7', 'sequence', 1, '6 → ?'),
        question('numbers-4', 'Numbers', 'Which group has more objects?', ['🍎 🍎', '🍎 🍎 🍎 🍎'], '🍎 🍎 🍎 🍎', 'choose_answer', 2, '🍎'),
        question('numbers-5', 'Numbers', 'Match number 4 with four objects.', ['4 - ⭐ ⭐ ⭐ ⭐', '3 - ⭐ ⭐', '5 - ⭐', '2 - ⭐ ⭐ ⭐'], '4 - ⭐ ⭐ ⭐ ⭐', 'picture_matching', 2, '4'),
        question('numbers-6', 'Numbers', 'What is 2 + 2?', ['3', '4', '5', '6'], '4', 'choose_answer', 2, '➕'),
        question('numbers-7', 'Numbers', 'Count the circles.', ['4', '5', '6', '7'], '6', 'counting', 3, '🔵 🔵 🔵 🔵 🔵 🔵'),
        question('numbers-8', 'Numbers', 'What comes before 10?', ['7', '8', '9', '11'], '9', 'sequence', 3, '?, 10'),
        question('numbers-9', 'Numbers', 'Which group has fewer objects?', ['🧸 🧸 🧸', '🧸 🧸 🧸 🧸 🧸'], '🧸 🧸 🧸', 'choose_answer', 3, '🧸'),
        question('numbers-10', 'Numbers', 'Match 5 with five fruits.', ['5 - 🍎 🍎 🍎 🍎 🍎', '4 - 🍎 🍎', '3 - 🍎', '2 - 🍎 🍎 🍎'], '5 - 🍎 🍎 🍎 🍎 🍎', 'picture_matching', 3, '🍎'),
    ],
    'Colours': [
        question('colours-1', 'Colours', 'Which one is RED?', ['Red apple', 'Blue sky', 'Green leaf', 'Yellow sun'], 'Red apple', 'multiple_choice', 1, '🍎'),
        question('colours-2', 'Colours', 'What colour is the sun?', ['Blue', 'Green', 'Yellow', 'Purple'], 'Yellow', 'choose_answer', 1, '☀️'),
        question('colours-3', 'Colours', 'Find the blue object.', ['🍎', '🌊', '🍌', '🍃'], '🌊', 'find_object', 1, '🔎'),
        question('colours-4', 'Colours', 'Match the same colours.', ['Red - 🔴', 'Blue - 🟡', 'Green - 🔵', 'Yellow - 🟢'], 'Red - 🔴', 'picture_matching', 2, '🎨'),
        question('colours-5', 'Colours', 'Which object is green?', ['🍃', '🍊', '🍇', '☁️'], '🍃', 'find_object', 2, '🌿'),
        question('colours-6', 'Colours', 'Choose the correct colour for a banana.', ['Purple', 'Yellow', 'Blue', 'Red'], 'Yellow', 'choose_answer', 2, '🍌'),
        question('colours-7', 'Colours', 'Which colour comes next?', ['Red, blue, red, ?', 'Red', 'Blue', 'Green', 'Yellow'], 'Blue', 'sequence', 3, '🔴 🔵 🔴 ?'),
        question('colours-8', 'Colours', 'Match the fruit to its colour.', ['Orange - 🟠', 'Apple - 🔵', 'Banana - 🟣', 'Leaf - 🔴'], 'Orange - 🟠', 'picture_matching', 3, '🍊'),
        question('colours-9', 'Colours', 'Find the purple object.', ['🍓', '🍇', '🍋', '🥒'], '🍇', 'find_object', 3, '🟣'),
        question('colours-10', 'Colours', 'What colour is a clear sky?', ['Blue', 'Pink', 'Brown', 'Orange'], 'Blue', 'choose_answer', 3, '🌤️'),
    ],
    'Shapes': [
        question('shapes-1', 'Shapes', 'Which shape has 3 sides?', ['Square', 'Triangle', 'Circle', 'Rectangle'], 'Triangle', 'multiple_choice', 1, '🔺'),
        question('shapes-2', 'Shapes', 'Find the circle.', ['🔺', '🟦', '⚪', '▭'], '⚪', 'find_object', 1, '🔎'),
        question('shapes-3', 'Shapes', 'Which shape is round?', ['Circle', 'Square', 'Triangle', 'Rectangle'], 'Circle', 'choose_answer', 1, '⚪'),
        question('shapes-4', 'Shapes', 'Match the shape with its name.', ['🔺 - Triangle', '⚪ - Square', '🟦 - Circle', '▭ - Triangle'], '🔺 - Triangle', 'picture_matching', 2, '🔷'),
        question('shapes-5', 'Shapes', 'Find the square object.', ['⚪', '🔺', '🟦', '▭'], '🟦', 'find_object', 2, '🟦'),
        question('shapes-6', 'Shapes', 'Which shape has 4 equal sides?', ['Circle', 'Triangle', 'Square', 'Oval'], 'Square', 'choose_answer', 2, '⬜'),
        question('shapes-7', 'Shapes', 'What shape comes next?', ['Circle, square, circle, ?', 'Circle', 'Square', 'Triangle', 'Oval'], 'Square', 'sequence', 3, '⚪ ⬜ ⚪ ?'),
        question('shapes-8', 'Shapes', 'Match the object to its shape.', ['Ball - Circle', 'Book - Triangle', 'Roof - Circle', 'Window - Oval'], 'Ball - Circle', 'picture_matching', 3, '⚽'),
        question('shapes-9', 'Shapes', 'Which shape has no corners?', ['Square', 'Circle', 'Triangle', 'Rectangle'], 'Circle', 'choose_answer', 3, '⭕'),
        question('shapes-10', 'Shapes', 'Find the rectangle.', ['🔺', '⚪', '▭', '🟦'], '▭', 'find_object', 3, '▭'),
    ],
    'Animals': [
        question('animals-1', 'Animals', 'Which animal is this?', ['Cat', 'Dog', 'Fish', 'Bird'], 'Cat', 'multiple_choice', 1, '🐱'),
        question('animals-2', 'Animals', 'Match the animal with its name.', ['🐶 - Dog', '🐱 - Bird', '🐟 - Cat', '🐦 - Fish'], '🐶 - Dog', 'picture_matching', 1, '🐶'),
        question('animals-3', 'Animals', 'Which animal says “meow”?', ['Dog', 'Cat', 'Cow', 'Duck'], 'Cat', 'choose_answer', 1, '🐱'),
        question('animals-4', 'Animals', 'Find the animal that can fly.', ['🐶', '🐟', '🐦', '🐱'], '🐦', 'find_object', 2, '☁️'),
        question('animals-5', 'Animals', 'Which animal lives in water?', ['Fish', 'Dog', 'Cat', 'Horse'], 'Fish', 'choose_answer', 2, '🌊'),
        question('animals-6', 'Animals', 'Match the sound “woof”.', ['Dog', 'Cat', 'Bird', 'Cow'], 'Dog', 'multiple_choice', 2, '🔊'),
        question('animals-7', 'Animals', 'Which animal comes next?', ['Cat, dog, cat, ?', 'Cat', 'Dog', 'Fish', 'Bird'], 'Dog', 'sequence', 3, '🐱 🐶 🐱 ?'),
        question('animals-8', 'Animals', 'Match the animal to its home.', ['Bird - Nest', 'Fish - Tree', 'Dog - Pond', 'Cat - Sky'], 'Bird - Nest', 'picture_matching', 3, '🏡'),
        question('animals-9', 'Animals', 'Which animal is the largest?', ['Mouse', 'Elephant', 'Ant', 'Bee'], 'Elephant', 'choose_answer', 3, '🐘'),
        question('animals-10', 'Animals', 'Find the animal with four legs.', ['🐟', '🐦', '🐶', '🐝'], '🐶', 'find_object', 3, '🔎'),
    ],
    'Fruits': [
        question('fruits-1', 'Fruits', 'Which fruit is this?', ['Apple', 'Banana', 'Orange', 'Grape'], 'Apple', 'multiple_choice', 1, '🍎'),
        question('fruits-2', 'Fruits', 'Match the fruit with its name.', ['🍌 - Banana', '🍎 - Orange', '🍊 - Apple', '🍇 - Pear'], '🍌 - Banana', 'picture_matching', 1, '🍌'),
        question('fruits-3', 'Fruits', 'Which fruit is usually yellow?', ['Apple', 'Banana', 'Grape', 'Orange'], 'Banana', 'choose_answer', 1, '🌞'),
        question('fruits-4', 'Fruits', 'Find the apple.', ['🍊', '🍎', '🍌', '🍇'], '🍎', 'find_object', 2, '🔎'),
        question('fruits-5', 'Fruits', 'Which fruit is round and orange?', ['Banana', 'Orange', 'Grape', 'Apple'], 'Orange', 'choose_answer', 2, '🍊'),
        question('fruits-6', 'Fruits', 'Match the colour to the fruit.', ['Banana - Yellow', 'Apple - Blue', 'Orange - Purple', 'Grape - Red'], 'Banana - Yellow', 'picture_matching', 2, '🎨'),
        question('fruits-7', 'Fruits', 'Which fruit comes next?', ['Apple, banana, apple, ?', 'Apple', 'Banana', 'Orange', 'Grape'], 'Banana', 'sequence', 3, '🍎 🍌 🍎 ?'),
        question('fruits-8', 'Fruits', 'Find the fruit with many small circles.', ['Apple', 'Grape', 'Banana', 'Orange'], 'Grape', 'find_object', 3, '🍇'),
        question('fruits-9', 'Fruits', 'Which fruit can be peeled?', ['Banana', 'Grape', 'Berry', 'Cherry'], 'Banana', 'choose_answer', 3, '🍌'),
        question('fruits-10', 'Fruits', 'Match fruit pictures.', ['🍊 - Orange', '🍎 - Banana', '🍌 - Grape', '🍇 - Apple'], '🍊 - Orange', 'picture_matching', 3, '🍊'),
    ],
}

for category_questions in QUESTION_BANK.values():
    for index, item in enumerate(category_questions):
        item['level'] = 1 if index < 5 else 2 if index < 8 else 3

@router.get('/learning')
async def get_learning(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    recent = (
        db.query(LearningResult)
        .filter(LearningResult.user_id == current_user.id)
        .order_by(LearningResult.timestamp.desc())
        .limit(10)
        .all()
    )
    correct = sum(1 for item in recent if item.is_correct)
    accuracy = correct / len(recent) if recent else 0
    level = 3 if len(recent) >= 6 and accuracy >= 0.9 else 2 if len(recent) >= 3 and accuracy >= 0.75 else 1
    return {
        'categories': [
            {'name': name, 'icon': CATEGORY_ICONS[name], 'question_count': len(questions)}
            for name, questions in QUESTION_BANK.items()
        ],
        'level': level,
        'recent_performance': {'attempts': len(recent), 'correct': correct, 'accuracy': round(accuracy * 100)},
        'activities': [
            {key: value for key, value in item.items() if key != 'answer'}
            for questions in QUESTION_BANK.values()
            for item in questions
        ],
    }

@router.post('/learning/result')
async def save_learning_result(payload: LearningResultCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    question_record = next(
        (
            item
            for item in QUESTION_BANK.get(payload.category, [])
            if item['prompt'] == payload.question
        ),
        None,
    )
    if question_record is None:
        raise HTTPException(status_code=400, detail='Learning question was not found for this category.')

    is_correct = payload.answer == question_record['answer']
    prior_correct = db.query(LearningResult).filter(
        LearningResult.user_id == current_user.id,
        LearningResult.category == payload.category,
        LearningResult.question == payload.question,
        LearningResult.is_correct.is_(True),
    ).first()
    result = LearningResult(
        user_id=current_user.id,
        question=payload.question,
        answer=payload.answer,
        is_correct=is_correct,
        score=1 if is_correct else 0,
        category=payload.category,
        difficulty=payload.difficulty,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return {
        'status': 'saved',
        'id': result.id,
        'is_correct': is_correct,
        'stars_earned': 1 if is_correct and prior_correct is None else 0,
    }
