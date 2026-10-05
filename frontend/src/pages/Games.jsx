import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import GameRoundEngine from '../components/GameRoundEngine';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function findRecentDifficulty(gameId, recentResults = []) {
  const filtered = recentResults.filter((item) => (item.game_type || '').toLowerCase() === gameId);
  if (!filtered.length) return 'easy';
  const avg = filtered.reduce((sum, item) => sum + Number(item.score || 0), 0) / filtered.length;
  if (avg >= 75) return 'hard';
  if (avg >= 45) return 'medium';
  return 'easy';
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function Games() {
  const { user } = useAuth();
  const location = useLocation();
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [stats, setStats] = useState({ games_played: 0, stars_earned: 0, best_score: 0, recent_results: [], streak: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameRun, setGameRun] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const quickGame = location.state?.quickPlay;
    if (!quickGame || !games.length) return;
    const match = games.find((game) => game.id === quickGame || game.name.toLowerCase().includes(quickGame.replace('-', ' ')));
    if (match) setSelectedGame(match);
  }, [games, location.state]);

  const loadGameStats = async () => {
    const response = await api.get('/api/games/results');
    setStats(response.data || { games_played: 0, stars_earned: 0, best_score: 0, recent_results: [], streak: 0 });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [libraryResponse, statsResponse] = await Promise.all([
          api.get('/api/games'),
          api.get('/api/games/results'),
        ]);
        setGames(libraryResponse.data.games || []);
        setStats(statsResponse.data || { games_played: 0, stars_earned: 0, best_score: 0, recent_results: [], streak: 0 });
      } catch (requestError) {
        console.error('Failed to load games:', requestError);
        setGames([]);
        setError('The game library could not load. Please retry.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [retryKey]);

  const submitGameResult = async (payload) => {
    try {
      const response = await api.post('/api/games/result', {
        session_id: payload.session_id,
        game_name: payload.game_name,
        game_type: payload.game_type,
        difficulty: payload.difficulty || 'easy',
        correct_answers: Number(payload.correct_answers || 0),
        total_questions: Number(payload.total_questions || 0),
        time_taken: Number(payload.time_taken || 0),
        completed: Boolean(payload.completed),
      });
      if (response.data?.status === 'saved') await loadGameStats();
      return response.data;
    } catch (submitError) {
      console.error('Game result save failed:', submitError);
      return null;
    }
  };

  if (loading) {
    return <div className="games-page"><div className="topbar"><div><h1 className="page-title">🎮 Games</h1><p className="subtle">Loading your games…</p></div></div></div>;
  }

  return (
    <div className="games-page">
      <div className="topbar games-topbar">
        <div><h1 className="page-title">🎮 Games</h1><p className="subtle">Play, learn, and earn stars!</p></div>
        <div className="games-summary">
          <div className="stats-pill"><span>⭐</span><div><small>Stars</small><strong>{stats.stars_earned || 0}</strong></div></div>
          <div className="stats-pill"><span>🔥</span><div><small>Streak</small><strong>{stats.streak || 0} days</strong></div></div>
        </div>
      </div>
      {error && <div className="game-error">{error} <button type="button" className="ghost-btn" onClick={() => setRetryKey((value) => value + 1)}>Retry</button></div>}
      {selectedGame ? (
        <GameExperience
          key={`${selectedGame.id}-${gameRun}`}
          game={selectedGame}
          userName={user?.full_name || 'Friend'}
          onExit={() => setSelectedGame(null)}
          onReplay={() => setGameRun((value) => value + 1)}
          onComplete={submitGameResult}
          difficulty={findRecentDifficulty(selectedGame.id, stats.recent_results || [])}
        />
      ) : games.length ? (
        <div className="game-grid">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <div className="game-icon">{game.emoji}</div>
              <div className="game-card-body">
                <h3>{game.name}</h3><p>{game.description}</p>
                <div className="game-meta"><span>⭐ {game.difficulty}</span><span>⏱ {game.duration}</span></div>
                <button className="primary-btn" type="button" onClick={() => setSelectedGame(game)}>Play Now</button>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="card game-empty">No games are currently available.</div>}
    </div>
  );
}

function GameExperience({ game, userName, onExit, onReplay, onComplete, difficulty }) {
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState('Ready to play!');
  const [status, setStatus] = useState('');
  const [earnedStars, setEarnedStars] = useState(0);
  const startTime = useRef(Date.now());
  const completionStarted = useRef(false);
  const sessionId = useRef(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const rounds = game.content?.rounds || [];
  const memoryPairs = game.content?.pairs || [];

  const finishGame = async (correct, total, timeSpent, extraMessage = '') => {
    if (completionStarted.current) return;
    completionStarted.current = true;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    setScore(percent);
    setFinished(true);
    setMessage(extraMessage || '🎉 Well done!');
    setStatus('Saving your result...');

    const result = await onComplete({
      session_id: sessionId.current,
      game_name: game.name,
      game_type: game.id,
      difficulty,
      correct_answers: correct,
      total_questions: total,
      time_taken: timeSpent,
      completed: true,
    });
    if (!result) {
      setStatus('Your result could not be saved. Please try again.');
      return;
    }
    setEarnedStars(Number(result.stars_earned || 0));
    setStatus(result.status === 'already_saved' ? 'This game result was already saved.' : `Score: ${result.score}% | ⭐ +${result.stars_earned} stars`);
  };

  return (
    <div className="game-shell">
      <div className="game-topbar">
        <div><div className="game-kicker">{game.name}</div><h2>{game.emoji} {game.name}</h2></div>
        <div className="game-inline-stats"><div><small>Score</small><strong>{score}%</strong></div><div><small>Stars</small><strong>{earnedStars}</strong></div></div>
      </div>
      <div className="game-board">
        {!finished ? (
          game.id === 'memory'
            ? <MemoryGame onFinish={finishGame} pairs={memoryPairs} startTime={startTime.current} />
            : <GameRoundEngine key={`${game.id}-${sessionId.current}`} rounds={rounds} gameName={game.name} difficulty={difficulty} onFinish={finishGame} />
        ) : (
          <div className="completion-panel">
            <div className="completion-emoji">🎉</div><h3>Well done, {userName}!</h3><p>You completed {game.name}!</p>
            <div className="finish-score">⭐ Score: {score}%</div><div className="finish-score">🏆 Stars Earned: {earnedStars}</div>
            <div className="game-actions"><button className="primary-btn" type="button" onClick={onReplay}>Play Again</button><button className="secondary-btn" type="button" onClick={onExit}>Choose Another Game</button></div>
          </div>
        )}
      </div>
      <div className="game-feedback"><strong>{message}</strong>{status && <span>{status}</span>}</div>
    </div>
  );
}

function MemoryGame({ pairs, onFinish, startTime }) {
  const [deck, setDeck] = useState(() => {
    const symbols = shuffle(pairs);
    return shuffle([...symbols, ...symbols]).map((symbol, index) => ({ id: `${symbol}-${index}`, symbol, matched: false, revealed: false }));
  });
  const [selected, setSelected] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState('Pick two cards to find a pair!');
  const totalPairs = pairs.length;

  const handleFlip = (index) => {
    if (locked || selected.length === 2 || deck[index].matched || deck[index].revealed) return;
    const nextSelected = [...selected, index];
    setSelected(nextSelected);
    setDeck((previous) => previous.map((card, cardIndex) => cardIndex === index ? { ...card, revealed: true } : card));
    if (nextSelected.length !== 2) return;

    const [first, second] = nextSelected;
    setLocked(true);
    if (deck[first].symbol === deck[second].symbol) {
      const nextMatched = matchedPairs + 1;
      setDeck((previous) => previous.map((card, cardIndex) => cardIndex === first || cardIndex === second ? { ...card, matched: true, revealed: true } : card));
      setMatchedPairs(nextMatched);
      setSelected([]);
      setLocked(false);
      setMessage('Nice match! 🎉');
      if (nextMatched === totalPairs) {
        const seconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        onFinish(totalPairs, totalPairs, seconds, `🎉 You matched all ${totalPairs} pairs!`);
      }
      return;
    }

    setMessage('Almost! Try again 😊');
    window.setTimeout(() => {
      setDeck((previous) => previous.map((card, cardIndex) => cardIndex === first || cardIndex === second ? { ...card, revealed: false } : card));
      setSelected([]);
      setLocked(false);
    }, 750);
  };

  return (
    <div>
      <div className="mini-topline"><span>{message}</span><strong>Pairs {matchedPairs}/{totalPairs}</strong></div>
      <div className="game-round-progress" role="progressbar" aria-valuemin="0" aria-valuemax={totalPairs} aria-valuenow={matchedPairs}><span style={{ width: `${(matchedPairs / totalPairs) * 100}%` }} /></div>
      <div className="board-grid memory-grid">
        {deck.map((card, index) => <button key={card.id} type="button" className={`memory-card ${card.revealed || card.matched ? 'flipped' : ''}`} onClick={() => handleFlip(index)} aria-label={card.revealed || card.matched ? `Card ${card.symbol}` : 'Hidden memory card'} disabled={locked}><span>{card.revealed || card.matched ? card.symbol : '?'}</span></button>)}
      </div>
    </div>
  );
}

export default Games;
