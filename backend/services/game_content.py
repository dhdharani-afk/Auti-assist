MEMORY_PAIRS = [
    '🐶', '🍎', '🐱', '⭐', '🍉', '🌼', '🦋', '🍇', '🐸', '🚗',
    '🐢', '⚽', '🐰', '🌙', '🐟', '🎈', '🦁', '🍓', '🐼', '🌻',
]

COLOUR_ITEMS = [
    ('red', 'Red', '#ff5f57'), ('blue', 'Blue', '#4aa3ff'), ('yellow', 'Yellow', '#f7d154'),
    ('green', 'Green', '#56cc7a'), ('purple', 'Purple', '#9d7bff'), ('orange', 'Orange', '#ff9d57'),
    ('pink', 'Pink', '#ee84ad'), ('brown', 'Brown', '#a46a43'),
]

SHAPE_ITEMS = [
    ('circle', 'Circle'), ('square', 'Square'), ('triangle', 'Triangle'), ('rectangle', 'Rectangle'),
    ('star', 'Star'), ('oval', 'Oval'), ('diamond', 'Diamond'), ('heart', 'Heart'),
]

NUMBER_ROUNDS = [
    ('Which number is 3?', '3', [('1','1'),('3','3'),('5','5'),('7','7')], '3', 'easy'),
    ('Which number is 8?', '8', [('5','5'),('7','7'),('8','8'),('9','9')], '8', 'easy'),
    ('Which number is 6?', '6', [('4','4'),('6','6'),('10','10'),('2','2')], '6', 'easy'),
    ('How many apples? 🍎🍎🍎🍎', '🍎 🍎 🍎 🍎', [('2','2'),('4','4'),('6','6'),('8','8')], '4', 'medium'),
    ('How many stars? ⭐⭐⭐', '⭐ ⭐ ⭐', [('2','2'),('3','3'),('5','5'),('8','8')], '3', 'medium'),
    ('2, 4, 6, ?', '2, 4, 6, ?', [('7','7'),('8','8'),('9','9'),('10','10')], '8', 'hard'),
    ('5, 10, 15, ?', '5, 10, 15, ?', [('16','16'),('18','18'),('20','20'),('25','25')], '20', 'hard'),
    ('How many apples can you count?', '🍎 🍎 🍎', [('2','2'),('3','3'),('4','4'),('5','5')], '3', 'easy'),
    ('Find the number seven.', '7', [('5','5'),('7','7'),('9','9'),('4','4')], '7', 'easy'),
    ('What comes after 9?', '9 → ?', [('8','8'),('10','10'),('11','11'),('7','7')], '10', 'easy'),
    ('Count the little stars.', '⭐ ⭐ ⭐ ⭐ ⭐', [('3','3'),('4','4'),('5','5'),('6','6')], '5', 'easy'),
    ('Which group has more?', '🍐 🍐  or  🍐 🍐 🍐 🍐', [('two','🍐 🍐'),('four','🍐 🍐 🍐 🍐'),('one','🍐'),('three','🍐 🍐 🍐')], 'four', 'easy'),
    ('What number comes before 12?', '? → 12', [('10','10'),('11','11'),('13','13'),('9','9')], '11', 'easy'),
    ('Count the balloons.', '🎈 🎈 🎈 🎈', [('2','2'),('3','3'),('4','4'),('5','5')], '4', 'easy'),
    ('Which group has fewer?', '🐞 🐞  or  🐞 🐞 🐞 🐞 🐞', [('two','🐞 🐞'),('five','🐞 🐞 🐞 🐞 🐞'),('four','🐞 🐞 🐞 🐞'),('three','🐞 🐞 🐞')], 'two', 'easy'),
    ('What is 3 plus 2?', '3 + 2 = ?', [('4','4'),('5','5'),('6','6'),('7','7')], '5', 'medium'),
    ('Count the shells.', '🐚 🐚 🐚 🐚 🐚 🐚', [('5','5'),('6','6'),('7','7'),('8','8')], '6', 'medium'),
    ('What comes next in the count?', '14, 15, ?', [('13','13'),('16','16'),('17','17'),('12','12')], '16', 'medium'),
    ('Which number is smallest?', 'Choose the smallest number.', [('12','12'),('8','8'),('15','15'),('10','10')], '8', 'medium'),
    ('What is 5 more than 10?', '10 + 5 = ?', [('14','14'),('15','15'),('16','16'),('13','13')], '15', 'challenge'),
]

ATTENTION_ROUNDS = [
    ('Find the different one', ['⭐','⭐','⭐','🔷'], '🔷', 'easy'),
    ('Which object is not a fruit?', ['🍎','🍌','🚲','🍇'], '🚲', 'easy'),
    ('Find the blue shape.', ['🔴','🟢','🔵','🟡'], '🔵', 'easy'),
    ('Which animal is different?', ['🐱','🐱','🐶','🐱'], '🐶', 'easy'),
    ('Find the object used for reading.', ['📚','⚽','🍉','🧦'], '📚', 'easy'),
    ('Which one can fly?', ['🐢','🐟','🐦','🐶'], '🐦', 'easy'),
    ('Find the shape with three sides.', ['⚪','🟦','🔺','⭐'], '🔺', 'easy'),
    ('Which item belongs in the kitchen?', ['🥄','🪁','🚂','🧸'], '🥄', 'easy'),
    ('Find the odd colour.', ['🟣','🟣','🟠','🟣'], '🟠', 'easy'),
    ('Which one is a musical instrument?', ['🥁','🍎','🧤','🚗'], '🥁', 'easy'),
    ('Spot the different pattern.', ['🔴🔵','🔴🔵','🔵🔴','🔴🔵'], '🔵🔴', 'medium'),
    ('Which animal lives in water?', ['🐠','🐓','🐴','🐈'], '🐠', 'medium'),
    ('Find the object with wheels.', ['🛴','📖','🍌','🌼'], '🛴', 'medium'),
    ('Which one is a vegetable?', ['🥕','🍇','🍉','🍍'], '🥕', 'medium'),
    ('Choose the matching pair.', ['☀️🌙','☀️☀️','⭐🌙','🌙☀️'], '☀️☀️', 'medium'),
    ('Which shape has no corners?', ['⬜','🔺','⚪','🔷'], '⚪', 'medium'),
    ('Find the object you wear on your feet.', ['🧦','🎩','🥣','📘'], '🧦', 'medium'),
    ('Which set repeats the same item?', ['🍎🍐🍎','🐟🐟🐟','🚗🚌🚲','🌼🌻🌷'], '🐟🐟🐟', 'medium'),
    ('Find the smallest animal shown.', ['🐘','🐭','🦒','🐄'], '🐭', 'challenge'),
    ('Which picture completes the pair?', ['🌧️☂️','🌞🧤','❄️🩱','🌙🕶️'], '🌧️☂️', 'challenge'),
]

PUZZLE_ROUNDS = [
    ('What comes next? 🔴 🔵 🔴 🔵 ?', ['🔴','🔵','🟢','🟡'], '🔴','easy'),
    ('Put these in order: 1, 3, 2', ['1 → 2 → 3','3 → 2 → 1','2 → 3 → 1','1 → 3 → 2'], '1 → 2 → 3','easy'),
    ('Complete the pattern: ⭐ 🌙 ⭐ ?', ['☀️','🌙','⭐','☁️'], '🌙','easy'),
    ('What comes next? 🟦 🟦 🟨 🟦 🟦 ?', ['🟦','🟨','🟥','🟩'], '🟨','easy'),
    ('Finish the shape pattern.', ['⚪ ⬜ ⚪ ⬜ ?', '⚪','⬜','🔺','⭐'], '⚪','easy'),
    ('Which number completes it? 2, 3, 4, ?', ['5','6','7','8'], '5','easy'),
    ('Put these steps in order.', ['Wake → Eat → Brush','Eat → Wake → Brush','Brush → Eat → Wake','Eat → Brush → Wake'], 'Wake → Eat → Brush','easy'),
    ('Complete: 🐶 🐱 🐶 ?', ['🐶','🐱','🐭','🐰'], '🐱','easy'),
    ('What comes next? 5, 10, 15, ?', ['18','20','22','25'], '20','medium'),
    ('Find the missing colour.', '🟢 🟡 🟢 ?', [('green','🟢'),('yellow','🟡'),('blue','🔵'),('red','🔴')], 'yellow','medium'),
    ('Build the shape sequence.', ['🔺 🔵 🔺 🔵 ?', '🔺','🔵','🟡','🟩'], '🔺','medium'),
    ('Which comes first in the day?', ['Morning','Night','Evening','Midnight'], 'Morning','medium'),
    ('Complete the count backwards.', '10, 9, 8, ?', [('6','6'),('7','7'),('9','9'),('5','5')], '7','medium'),
    ('Which picture follows? 🌱 🌿 🌳 ?', ['🌱','🌿','🌳','🌲'], '🌲','medium'),
    ('Put the letters in order.', ['A → B → C','C → A → B','B → C → A','A → C → B'], 'A → B → C','medium'),
    ('Complete: 1, 3, 5, ?', ['6','7','8','9'], '7','medium'),
    ('Which piece finishes the pattern? 🍎 🍌 🍌 🍎 🍌 ?', ['🍎','🍌','🍇','🍊'], '🍌','medium'),
    ('Arrange from small to large.', ['🐜 → 🐈 → 🐘','🐘 → 🐈 → 🐜','🐈 → 🐜 → 🐘','🐜 → 🐘 → 🐈'], '🐜 → 🐈 → 🐘','challenge'),
    ('What number is missing? 4, 8, ?, 16', ['10','11','12','13'], '12','challenge'),
    ('Complete the repeating pattern.', '🔺 ⚪ ⭐ 🔺 ⚪ ?', [('triangle','🔺'),('circle','⚪'),('star','⭐'),('square','⬜')], 'star','challenge'),
]


def _colour_rounds():
    rounds = []
    for index, (value, name, swatch) in enumerate(COLOUR_ITEMS):
        choices = [(item[0], item[1], item[2]) for item in COLOUR_ITEMS if item[0] != value]
        rounds.append({
            'id': f'colour-{index + 1}',
            'prompt': f'Find the {name.upper()}',
            'visual': '🎨',
            'answer': value,
            'difficulty': 'easy' if index < 5 else 'medium',
            'kind': 'colour',
            'choices': [{'value': item[0], 'label': item[1], 'swatch': item[2]} for item in choices] + [{'value': value, 'label': name, 'swatch': swatch}],
        })
    more = [
        ('Which colour is the sun?', 'yellow', '☀️'), ('Choose the colour of a leaf.', 'green', '🍃'),
        ('Find the colour of a clear sky.', 'blue', '🌤️'), ('Which colour is a ripe orange?', 'orange', '🍊'),
        ('Pick the colour of a strawberry.', 'red', '🍓'), ('Which colour can a grape be?', 'purple', '🍇'),
        ('Find a pink flower.', 'pink', '🌸'), ('Which colour is tree bark often?', 'brown', '🌳'),
        ('A banana is usually which colour?', 'yellow', '🍌'), ('Which colour matches a blueberry?', 'blue', '🫐'),
        ('Choose the colour of a carrot.', 'orange', '🥕'), ('Which colour matches a flamingo?', 'pink', '🦩'),
    ]
    for index, (prompt, answer, visual) in enumerate(more, start=9):
        choices = [(value, name, swatch) for value, name, swatch in COLOUR_ITEMS]
        rounds.append({
            'id': f'colour-{index}', 'prompt': prompt, 'visual': visual, 'answer': answer,
            'difficulty': 'medium' if index < 17 else 'challenge', 'kind': 'colour',
            'choices': [{'value': value, 'label': name, 'swatch': swatch} for value, name, swatch in choices],
        })
    return rounds


def _shape_rounds():
    rounds = []
    for index, (key, label) in enumerate(SHAPE_ITEMS):
        others = [(other_key, other_label) for other_key, other_label in SHAPE_ITEMS if other_key != key]
        rounds.append({
            'id': f'shape-{index + 1}', 'prompt': f'Find the {label.upper()}', 'answer': key,
            'difficulty': 'easy' if index < 5 else 'medium', 'kind': 'shape',
            'choices': [{'value': value, 'label': name} for value, name in others[:3]] + [{'value': key, 'label': label}],
        })
    prompts = [
        ('Which shape is round?', 'circle'), ('Find the shape with three sides.', 'triangle'),
        ('Which shape has four equal sides?', 'square'), ('Pick the shape like a door.', 'rectangle'),
        ('Find the pointed shape.', 'star'), ('Which shape is stretched and round?', 'oval'),
        ('Choose the diamond shape.', 'diamond'), ('Match the heart shape to a heart card.', 'heart'),
        ('Which shape has no corners?', 'circle'), ('Which shape has one curved edge?', 'oval'),
        ('Find the shape with four corners and long sides.', 'rectangle'), ('Choose a shape with three corners.', 'triangle'),
    ]
    for index, (prompt, answer) in enumerate(prompts, start=9):
        rounds.append({
            'id': f'shape-{index}', 'prompt': prompt, 'answer': answer,
            'difficulty': 'medium' if index < 17 else 'challenge', 'kind': 'shape',
            'choices': [{'value': key, 'label': label} for key, label in SHAPE_ITEMS],
        })
    return rounds


def _attention_rounds():
    return [
        {
            'id': f'attention-{index + 1}', 'prompt': prompt, 'answer': answer,
            'difficulty': difficulty, 'kind': 'visual',
            'choices': [{'value': value, 'label': value} for value in choices],
        }
        for index, (prompt, choices, answer, difficulty) in enumerate(ATTENTION_ROUNDS)
    ]


def _puzzle_rounds():
    result = []
    for index, item in enumerate(PUZZLE_ROUNDS):
        prompt, visual_or_choices, *rest = item
        if len(rest) == 3:
            choices, answer, difficulty = rest
            visual = visual_or_choices
        else:
            choices, answer, difficulty = visual_or_choices, rest[0], rest[1]
            visual = None
        result.append({
            'id': f'puzzle-{index + 1}', 'prompt': prompt, 'visual': visual,
            'answer': answer, 'difficulty': difficulty, 'kind': 'text',
            'choices': [{'value': value, 'label': label} for value, label in choices] if isinstance(choices, list) and choices and isinstance(choices[0], tuple) else [{'value': value, 'label': value} for value in choices],
        })
    return result


NUMBER_BANK = [
    {
        'id': f'number-{index + 1}', 'prompt': prompt, 'visual': visual, 'answer': answer,
        'difficulty': 'challenge' if difficulty == 'hard' else difficulty, 'kind': 'text',
        'choices': [{'value': value, 'label': label} for value, label in choices],
    }
    for index, (prompt, visual, choices, answer, difficulty) in enumerate(NUMBER_ROUNDS)
]

GAME_ROUNDS = {
    'memory': {'kind': 'memory', 'pairs': MEMORY_PAIRS},
    'colour': {'kind': 'choice', 'rounds': _colour_rounds()},
    'shape': {'kind': 'choice', 'rounds': _shape_rounds()},
    'number': {'kind': 'choice', 'rounds': NUMBER_BANK},
    'attention': {'kind': 'choice', 'rounds': _attention_rounds()},
    'puzzle': {'kind': 'choice', 'rounds': _puzzle_rounds()},
}

assert all(len(GAME_ROUNDS[game_id].get('rounds', GAME_ROUNDS[game_id].get('pairs', []))) >= 20 for game_id in GAME_ROUNDS)
