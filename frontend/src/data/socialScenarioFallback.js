const choice = (id, text, helpful, image) => ({ id, text, helpful, image });
const step = (situation, question, feedback, practice_sentence, options) => ({
  situation,
  question,
  feedback,
  practice_sentence,
  options,
});

export const socialScenarioFallback = [
  {
    id: 'meeting-new-friend',
    category: 'Greetings',
    title: 'Meeting a new friend',
    difficulty: 'Easy',
    image: 'playground',
    background: 'playground',
    characters: [{ id: 'child', label: 'You' }, { id: 'friend', label: 'Ravi' }],
    objects: [{ id: 'ball', label: 'Ball', icon: '⚽' }, { id: 'bench', label: 'Bench', icon: '🪑' }],
    emotion: { label: 'Friendly', icon: '😊' },
    steps: [
      step('Ravi says: Hi! My name is Ravi. What could you say?', 'Choose a friendly greeting.', 'That is a friendly way to start a conversation.', 'Hi Ravi! My name is Sam.', [
        choice('a', 'Hi Ravi! My name is Sam.', true, '👋'),
        choice('b', 'Go away.', false, '✋'),
        choice('c', 'Walk away.', false, '🚶'),
        choice('d', "I don't know.", false, '💭'),
      ]),
      step('Ravi asks: What games do you like?', 'How could you answer?', 'You shared an idea and asked Ravi a question.', 'I like building games. What do you like?', [
        choice('a', 'I like building games. What do you like?', true, '🧱'),
        choice('b', 'No.', false, '🙅'),
        choice('c', 'That is silly.', false, '🎲'),
      ]),
    ],
  },
  {
    id: 'greeting-teacher', category: 'School', title: 'Greeting a teacher', difficulty: 'Easy',
    image: 'classroom', background: 'classroom',
    characters: [{ id: 'child', label: 'You' }, { id: 'teacher', label: 'Teacher' }],
    objects: [{ id: 'door', label: 'Classroom door', icon: '🚪' }, { id: 'backpack', label: 'Backpack', icon: '🎒' }],
    emotion: { label: 'Calm', icon: '😌' },
    steps: [step('You see your teacher at the classroom door.', 'What could you say?', 'A kind greeting helps everyone feel welcome.', 'Good morning!', [
      choice('a', 'Good morning!', true, '👋'), choice('b', 'Be quiet.', false, '🔇'), choice('c', 'Ignore them.', false, '🙂'),
    ])],
  },
  {
    id: 'asking-for-help', category: 'Asking for Help', title: 'Asking for help', difficulty: 'Easy',
    image: 'classroom', background: 'classroom',
    characters: [{ id: 'child', label: 'You' }, { id: 'teacher', label: 'Helpful adult' }],
    objects: [{ id: 'puzzle', label: 'Puzzle', icon: '🧩' }, { id: 'hand', label: 'Helping hand', icon: '🤝' }],
    emotion: { label: 'Worried', icon: '😟' },
    steps: [step('Your puzzle feels difficult and you need support.', 'What could you say?', 'Asking clearly and politely lets someone know what you need.', 'Could you please help me?', [
      choice('a', 'Could you please help me?', true, '🙋'), choice('b', 'Do it for me!', false, '📣'), choice('c', 'Throw it away.', false, '🧩'),
    ])],
  },
  {
    id: 'joining-group', category: 'Making Friends', title: 'Joining a group', difficulty: 'Medium',
    image: 'playground', background: 'playground',
    characters: [{ id: 'child', label: 'You' }, { id: 'friends', label: 'Friends' }],
    objects: [{ id: 'paper', label: 'Drawing paper', icon: '🖍️' }, { id: 'crayons', label: 'Crayons', icon: '🎨' }],
    emotion: { label: 'Friendly', icon: '😊' },
    steps: [step('Some children are drawing together.', 'How could you join?', 'Asking permission is a friendly way to join.', 'May I draw with you?', [
      choice('a', 'May I draw with you?', true, '🙋'), choice('b', 'Move over!', false, '🗯️'), choice('c', 'Take the crayons.', false, '🖍️'),
    ])],
  },
  {
    id: 'sharing-toy', category: 'Sharing & Taking Turns', title: 'Sharing a toy', difficulty: 'Easy',
    image: 'home', background: 'home',
    characters: [{ id: 'child', label: 'You' }, { id: 'friend', label: 'Friend' }],
    objects: [{ id: 'toy', label: 'Favorite toy', icon: '🧸' }, { id: 'timer', label: 'Turn timer', icon: '⏱️' }],
    emotion: { label: 'Calm', icon: '😌' },
    steps: [step('You are playing with a favourite toy and a friend wants a turn.', 'What could you say?', 'Making a turn plan helps both people play.', 'You can have a turn after me.', [
      choice('a', 'You can have a turn after me.', true, '🧸'), choice('b', 'It is only mine!', false, '🙅'), choice('c', 'Grab it quickly.', false, '✋'),
    ])],
  },
  {
    id: 'taking-turns', category: 'Sharing & Taking Turns', title: 'Taking turns', difficulty: 'Medium',
    image: 'home', background: 'home',
    characters: [{ id: 'child', label: 'You' }, { id: 'friend', label: 'Friend' }],
    objects: [{ id: 'game', label: 'Board game', icon: '🎲' }, { id: 'pieces', label: 'Game pieces', icon: '🟡' }],
    emotion: { label: 'Happy', icon: '😊' },
    steps: [step('It is your turn in a board game.', 'What can you do?', 'Taking turns makes a game fair and fun.', 'Take your turn, then pass the game.', [
      choice('a', 'Take your turn, then pass the game.', true, '🎲'), choice('b', 'Keep all the pieces.', false, '🧩'), choice('c', 'Stop everyone else.', false, '✋'),
    ])],
  },
  {
    id: 'saying-thank-you', category: 'Conversation', title: 'Saying thank you', difficulty: 'Easy',
    image: 'classroom', background: 'classroom',
    characters: [{ id: 'child', label: 'You' }, { id: 'friend', label: 'Friend' }],
    objects: [{ id: 'pencil', label: 'Pencil', icon: '✏️' }, { id: 'notebook', label: 'Notebook', icon: '📒' }],
    emotion: { label: 'Happy', icon: '😊' },
    steps: [step('A friend gives you a pencil.', 'What could you say?', 'Thanking someone shows you noticed their kindness.', 'Thank you!', [
      choice('a', 'Thank you!', true, '💛'), choice('b', 'Give me another one.', false, '✏️'), choice('c', 'Leave it there.', false, '🙂'),
    ])],
  },
  {
    id: 'saying-sorry', category: 'Disagreement', title: 'Saying sorry', difficulty: 'Medium',
    image: 'playground', background: 'playground',
    characters: [{ id: 'child', label: 'You' }, { id: 'friend', label: 'Friend' }],
    objects: [{ id: 'blocks', label: 'Fallen blocks', icon: '🧱' }, { id: 'hands', label: 'Helping hands', icon: '🤝' }],
    emotion: { label: 'Worried', icon: '😟' },
    steps: [step('You accidentally knock over a friend’s blocks.', 'What could you say?', 'An apology and an offer to help can repair a moment.', 'I am sorry. Can I help rebuild?', [
      choice('a', 'I am sorry. Can I help rebuild?', true, '🤝'), choice('b', 'It was your fault.', false, '👉'), choice('c', 'I do not care.', false, '💭'),
    ])],
  },
  {
    id: 'asking-permission', category: 'Personal Boundaries', title: 'Asking permission', difficulty: 'Medium',
    image: 'classroom', background: 'classroom',
    characters: [{ id: 'child', label: 'You' }, { id: 'friend', label: 'Friend' }],
    objects: [{ id: 'pens', label: 'Coloring pens', icon: '🖍️' }, { id: 'artwork', label: 'Friend’s artwork', icon: '🖼️' }],
    emotion: { label: 'Calm', icon: '😌' },
    steps: [step('You want to use a friend’s colouring pens.', 'What could you ask?', 'Asking first respects another person’s belongings.', 'May I use your pens, please?', [
      choice('a', 'May I use your pens, please?', true, '🙋'), choice('b', 'I am taking these.', false, '🖍️'), choice('c', 'You cannot use them.', false, '🚫'),
    ])],
  },
  {
    id: 'saying-goodbye', category: 'Everyday Situations', title: 'Saying goodbye', difficulty: 'Easy',
    image: 'community', background: 'community',
    characters: [{ id: 'child', label: 'You' }, { id: 'friend', label: 'Friend' }],
    objects: [{ id: 'door', label: 'Exit door', icon: '🚪' }, { id: 'sun', label: 'Sunny day', icon: '☀️' }],
    emotion: { label: 'Happy', icon: '😊' },
    steps: [step('The activity is finished and your friend is leaving.', 'What could you say?', 'A warm goodbye lets someone know you enjoyed spending time together.', 'Goodbye! See you next time.', [
      choice('a', 'Goodbye! See you next time.', true, '👋'), choice('b', 'Do not leave.', false, '🛑'), choice('c', 'Turn away silently.', false, '🙂'),
    ])],
  },
];
