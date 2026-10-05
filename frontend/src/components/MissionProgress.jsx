export default function MissionProgress({ current, total, label = 'Mission progress' }) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className="mission-progress" aria-label={`${label}: ${current} of ${total}`}>
      <div className="mission-progress-label">
        <span>{label}</span>
        <strong>{current}/{total}</strong>
      </div>
      <div className="mission-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax={total} aria-valuenow={current}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
