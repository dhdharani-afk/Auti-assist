import { useState } from 'react';
import api from '../services/api';
import EmotionCamera from '../components/EmotionCamera';

const emotions = ['😊 Happy', '😢 Sad', '😠 Angry', '😨 Scared', '😌 Calm', '😐 Okay'];
const activities = {
  '😊 Happy': ['Draw a picture', 'Sing a short song', 'Play a movement game'],
  '😢 Sad': ['Take three deep breaths', 'Colour a page', 'Listen to a calm story'],
  '😠 Angry': ['Count to ten', 'Stretch arms', 'Quiet breathing break'],
  '😨 Scared': ['Take a cozy break', 'Listen to a calm story', 'Use a counting exercise'],
  '😌 Calm': ['Do a simple puzzle', 'Look at clouds', 'Read a short poem'],
  '😐 Okay': ['Complete one learning task', 'Do a quick drawing', 'Look around the room and count objects'],
};

const emotionToApiValue = {
  '😊 Happy': 'happy',
  '😢 Sad': 'sad',
  '😠 Angry': 'angry',
  '😨 Scared': 'scared',
  '😌 Calm': 'calm',
  '😐 Okay': 'okay',
};

export default function EmotionActivities() {
  const [selectedEmotion, setSelectedEmotion] = useState('😊 Happy');
  const [message, setMessage] = useState('Pick an emotion and try a calming activity.');

  const handleManualEmotion = async (emotion) => {
    setSelectedEmotion(emotion);
    const activity = activities[emotion][0];
    const apiEmotion = emotionToApiValue[emotion] || emotion.replace(/[^a-zA-Z ]/g, '').trim().toLowerCase();
    setMessage(`${emotion} — ${activity}`);

    try {
      await api.post('/api/emotion/activity', {
        emotion: apiEmotion,
        estimated: false,
        confidence: 0,
        activity,
      });
    } catch (error) {
      console.error('Emotion save failed:', error);
    }
  };

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">Emotion Activities</h1>
          <p className="subtle">Choose a feeling and a calm activity.</p>
        </div>
      </div>

      <div className="card">
        <h2>How are you feeling?</h2>
        <div className="grid grid-3">
          {emotions.map((emotion) => (
            <button key={emotion} type="button" className="secondary-btn" style={{ minHeight: '64px', fontSize: '1.15rem' }} onClick={() => handleManualEmotion(emotion)}>
              {emotion}
            </button>
          ))}
        </div>
        <div className="auth-message success" style={{ marginTop: '16px' }}>{message}</div>
        <div style={{ marginTop: '18px' }}>
          <h3 style={{ marginBottom: '10px' }}>Suggested activities</h3>
          <ul>
            {activities[selectedEmotion].map((activity, index) => (
              <li key={`${activity}-${index}`}>{activity}</li>
            ))}
          </ul>
        </div>
      </div>

      <EmotionCamera
        onManualSelect={() => handleManualEmotion(selectedEmotion)}
        selectedEmotion={selectedEmotion}
      />
    </div>
  );
}
