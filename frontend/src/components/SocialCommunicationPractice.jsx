import { useState } from 'react';
import PictureWordBuilder from './PictureWordBuilder';

const wordPictures = {
  hi: '👋', hello: '👋', good: '🌤️', morning: '🌤️', may: '🙋', i: '🙂', can: '🙋',
  help: '🤝', please: '🙏', thank: '💛', you: '🙂', sorry: '💜', my: '🧒',
  name: '🏷️', like: '💚', what: '❓', draw: '🎨', with: '🧑‍🤝‍🧑', your: '👤',
  turn: '🔄', after: '➡️', me: '🧒', use: '🖍️', pens: '🖍️', goodbye: '👋',
};

export default function SocialCommunicationPractice({
  sentence,
  onListen,
  onPracticeSpeech,
  speechAvailable,
  listening,
  onUseAac,
  onContinue,
  message,
}) {
  const [aacOpen, setAacOpen] = useState(false);
  const [selectedWords, setSelectedWords] = useState([]);
  const words = sentence.trim().split(/\s+/);
  const pictureWords = words.map((word, index) => ({
    key: String(index),
    label: word,
    emoji: wordPictures[word.toLowerCase().replace(/[!?.,]/g, '')] || '💬',
  }));

  const toggleWord = (word, index) => {
    setSelectedWords((current) => (
      current.some((item) => item.index === index)
        ? current.filter((item) => item.index !== index)
        : [...current, { word, index }].sort((left, right) => left.index - right.index)
    ));
  };

  const submitAac = () => {
    const phrase = selectedWords.length ? selectedWords.map((item) => item.word).join(' ') : sentence;
    onUseAac(phrase);
    setSelectedWords([]);
    setAacOpen(false);
  };

  return (
    <section className="social-communication-practice" aria-labelledby="social-practice-title">
      <div className="social-practice-intro">
        <span aria-hidden="true">💬</span>
        <div>
          <h3 id="social-practice-title">Let’s practice saying it!</h3>
          <p>You can use your voice, picture words, or just listen.</p>
        </div>
      </div>
      <p className="social-practice-sentence">“{sentence}”</p>
      <div className="social-communication-actions">
        <button type="button" className="secondary-btn" onClick={onPracticeSpeech} disabled={listening}>
          {speechAvailable ? (listening ? '🎤 Listening…' : '🎤 Practice Speech') : '🗣️ I practiced saying it'}
        </button>
        <button type="button" className="secondary-btn" onClick={() => setAacOpen((open) => !open)}>
          🗣️ {aacOpen ? 'Close picture words' : 'Use AAC'}
        </button>
        <button type="button" className="ghost-btn" onClick={onListen}>🔊 Listen</button>
      </div>
      {aacOpen && (
        <PictureWordBuilder
          className="social-aac-board"
          cards={pictureWords}
          sentence={selectedWords.map((item) => item.word).join(' ')}
          selectedKeys={selectedWords.map((item) => String(item.index))}
          title="Build your message"
          eyebrow="🗣️ Picture-word AAC"
          submitLabel="Use this message"
          onWord={(card) => toggleWord(card.label, Number(card.key))}
          onListen={(text) => onListen(text || sentence)}
          onClear={() => setSelectedWords([])}
          onSubmit={submitAac}
        />
      )}
      {message && <p className="social-practice-status" aria-live="polite">{message}</p>}
      <button type="button" className="primary-btn social-next-step" onClick={onContinue}>Continue →</button>
    </section>
  );
}
