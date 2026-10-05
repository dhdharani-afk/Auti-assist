import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import aiService from '../services/aiService';

const suggestedQuestions = [
  '🎨 Teach me colours',
  '🔢 Teach me numbers',
  '🔺 What is a triangle?',
  '🐶 Let\'s learn animals',
  '📖 Tell me a short story',
  '🧩 Give me a simple puzzle',
];

const welcomeMessage = {
  from: 'ai',
  text: 'Hi! 👋 I\'m AutiAssist.\nWhat would you like to learn today?',
};

const fallbackMessage = 'Hmm... AutiAssist is temporarily unavailable. Please try again in a little while. 😊';

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready');
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const speechSupported = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);
  const voiceEnabled = useMemo(() => typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window), []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await aiService.getHistory();
        const items = response?.data?.history || [];
        if (items.length > 0) {
          const historyMessages = items
            .slice()
            .reverse()
            .flatMap((item) => [
              { from: 'user', text: item.message },
              { from: 'ai', text: item.response },
            ]);
          setMessages([...historyMessages]);
        }
      } catch (err) {
        console.error('Could not load chat history:', err);
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const speakResponse = (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const cleanText = (text || '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.lang = 'en-US';

    if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length > 0) {
      const preferredVoice = window.speechSynthesis
        .getVoices()
        .find((voice) => /en(-|_)?(us|gb|au)|english/i.test(voice.lang)) ||
        window.speechSynthesis.getVoices()[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (!voiceEnabled) {
      setError('Voice input is not supported in this browser yet. You can still type your question.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setStatus('Listening...');
      setError('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((current) => (current ? `${current} ${transcript}`.trim() : transcript));
    };

    recognition.onerror = () => {
      setListening(false);
      setStatus('Ready');
      setError('I could not hear that clearly. Please try again or type your message.');
    };

    recognition.onend = () => {
      setListening(false);
      setStatus('Ready');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setStatus('Ready');
  };

  const handleSubmit = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt || typing) return;

    const conversationContext = messages
      .slice(-8)
      .filter((message) => message && message.text)
      .map((message) => `${message.from === 'user' ? 'Child' : 'AutiAssist'}: ${message.text}`);

    setMessages((current) => [...current, { from: 'user', text: prompt }]);
    setInput('');
    setTyping(true);
    setError('');
    setStatus('AutiAssist is thinking...');

    try {
      const response = await aiService.sendChatMessage(prompt, conversationContext);
      const reply = response?.data?.response || 'I am here to help you learn and explore!';
      setMessages((current) => [...current, { from: 'ai', text: reply }]);
      if (autoSpeak && speechSupported) {
        speakResponse(reply);
      }
      setStatus('Ready');
    } catch (error) {
      const backendMessage = error?.response?.data?.detail || fallbackMessage;
      setMessages((current) => [...current, { from: 'ai', text: backendMessage }]);
      setError(backendMessage);
      setStatus('Needs attention');
    } finally {
      setTyping(false);
    }
  };

  const handleClear = async () => {
    setMessages([welcomeMessage]);
    setError('');
    setInput('');
    try {
      await aiService.clearHistory();
    } catch (error) {
      console.error('Could not clear AI history:', error);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">🤖 AutiAssist</h1>
          <p className="subtle">Your friendly learning companion</p>
        </div>
        <div className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: typing ? '#ffc857' : '#4ecb71', display: 'inline-block' }} />
          <strong>{typing ? 'AutiAssist is thinking...' : status}</strong>
        </div>
      </div>

      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          {suggestedQuestions.map((question) => (
            <button key={question} type="button" className="ghost-btn" onClick={() => handleSubmit(question)}>
              {question}
            </button>
          ))}
        </div>

        <div style={{ background: '#f8faff', borderRadius: '22px', padding: '18px', minHeight: '360px', maxHeight: '520px', overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div className="card" style={{ background: '#fff', padding: '16px' }}>
                <strong>Hi! 👋 I’m AutiAssist.</strong>
                <div>What would you like to learn today?</div>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={`${message.from}-${index}`} style={{ marginBottom: '14px', display: 'flex', justifyContent: message.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    background: message.from === 'user' ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : '#fff',
                    color: message.from === 'user' ? '#fff' : 'var(--text)',
                    padding: '12px 16px',
                    borderRadius: '18px',
                    maxWidth: '78%',
                    boxShadow: 'var(--shadow)',
                    whiteSpace: 'pre-line',
                    border: message.from === 'ai' ? '1px solid rgba(120,133,167,0.12)' : 'none',
                  }}
                >
                  <div>{message.text}</div>
                  {message.from === 'ai' && (
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="ghost-btn" type="button" onClick={() => speakResponse(message.text)} style={{ padding: '8px 10px', borderRadius: '10px' }}>
                        🔊
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {typing && (
            <div style={{ color: 'var(--text-soft)', fontWeight: 700, marginTop: '8px' }}>
              AutiAssist is thinking...
            </div>
          )}

          {error && (
            <div style={{ marginTop: '12px', color: 'var(--danger)', fontWeight: 700 }}>
              {error}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about colours, numbers, animals, stories, or puzzles..."
            aria-label="Ask AutiAssist"
            disabled={typing}
            style={{ flex: 1, minWidth: '220px' }}
          />
          {speechSupported && (
            <button type="button" className={autoSpeak ? 'secondary-btn' : 'ghost-btn'} onClick={() => setAutoSpeak((value) => !value)} aria-label="Toggle AI voiceover">
              {autoSpeak ? '🔊 Auto voice on' : '🔇 Auto voice off'}
            </button>
          )}
          {voiceEnabled && (
            <button type="button" className={listening ? 'secondary-btn' : 'ghost-btn'} onClick={listening ? stopListening : startListening} aria-label="Voice input">
              {listening ? '🎙️ Listening...' : '🎙️ Mic'}
            </button>
          )}
          <button type="button" className="secondary-btn" onClick={() => handleClear()}>
            Clear chat
          </button>
          <button type="button" className="primary-btn" onClick={() => handleSubmit()} disabled={typing || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
