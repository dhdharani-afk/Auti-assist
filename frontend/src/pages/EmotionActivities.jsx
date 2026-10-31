import EmotionCamera from '../components/EmotionCamera';

export default function EmotionActivities() {
  return (
    <div className="emotion-activities-page">
      <div className="topbar">
        <div>
          <h1 className="page-title">Facial Mood Recognition</h1>
          <p className="subtle">
            An optional estimate of visible facial expression with activity suggestions. A face cannot reliably tell us how you feel inside.
          </p>
        </div>
      </div>

      <EmotionCamera />
    </div>
  );
}
