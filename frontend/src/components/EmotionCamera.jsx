import { Component, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { emotionService } from '../services/emotionService';

const activities = [
  { label: 'Learning Activity', detail: 'Explore letters, numbers, colours, shapes, animals, and fruits.', icon: '📚', to: '/learning' },
  { label: 'Games', detail: 'Choose Memory, Colour, Shape, Number, Attention, or Puzzle games.', icon: '🎮', to: '/games' },
  { label: 'Sentence Builder', detail: 'Build a sentence with picture and word cards.', icon: '💬', to: '/communication' },
  { label: 'Colour Matching', detail: 'Play a short colour-finding activity.', icon: '🎨', to: '/activities/colour-match' },
  { label: 'Emotion Matching', detail: 'Practice matching expression pictures as a learning activity.', icon: '🙂', to: '/activities/emotion-match' },
  { label: 'My Routine', detail: 'See today’s steps and mark activities as you finish them.', icon: '🗓️', to: '/routine' },
];

const expressionActivities = {
  happy: [
    activities[3],
    activities[1],
    activities[0],
  ],
  sad: [
    activities[3],
    activities[2],
    activities[4],
  ],
  angry: [
    activities[3],
    activities[1],
    activities[5],
  ],
  calm: [
    activities[0],
    activities[1],
    activities[2],
  ],
};

const expressionLabels = {
  happy: { emoji: '😊', label: 'Happy' },
  sad: { emoji: '😢', label: 'Sad' },
  angry: { emoji: '😠', label: 'Angry' },
  calm: { emoji: '😌', label: 'Calm' },
};

const manualEmotions = [
  { key: 'happy', label: 'Happy', emoji: '😊' },
  { key: 'sad', label: 'Sad', emoji: '😢' },
  { key: 'angry', label: 'Angry', emoji: '😠' },
  { key: 'scared', label: 'Scared', emoji: '😨' },
  { key: 'calm', label: 'Calm', emoji: '😌' },
  { key: 'okay', label: 'Okay', emoji: '😐' },
];

const manualActivities = {
  happy: expressionActivities.happy,
  sad: expressionActivities.sad,
  angry: expressionActivities.angry,
  scared: [activities[4], activities[2], activities[5]],
  calm: expressionActivities.calm,
  okay: [activities[0], activities[1], activities[2]],
};

function stopMediaStream(stream) {
  if (!stream) return;
  let tracks;
  try {
    tracks = stream.getTracks();
  } catch (tracksError) {
    console.warn('Camera tracks could not be read for cleanup.', tracksError);
    return;
  }
  tracks.forEach((track) => {
    try {
      track.stop();
    } catch (stopError) {
      console.warn('A camera track could not be stopped cleanly.', stopError);
    }
  });
}

function waitForVideoReady(video, timeoutMs = 5000) {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let timeout;
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', checkReady);
      video.removeEventListener('canplay', checkReady);
      video.removeEventListener('playing', checkReady);
      video.removeEventListener('error', handleError);
    };
    const checkReady = () => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };
    const handleError = () => {
      cleanup();
      reject(new Error('The camera preview could not be loaded.'));
    };

    video.addEventListener('loadedmetadata', checkReady);
    video.addEventListener('canplay', checkReady);
    video.addEventListener('playing', checkReady);
    video.addEventListener('error', handleError);
    timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('The camera preview did not become ready in time.'));
    }, timeoutMs);
    checkReady();
  });
}

function playVideo(video, timeoutMs = 5000) {
  let timeout;
  return Promise.race([
    video.play(),
    new Promise((_, reject) => {
      timeout = window.setTimeout(() => {
        reject(new Error('The camera preview did not start in time.'));
      }, timeoutMs);
    }),
  ]).finally(() => window.clearTimeout(timeout));
}

function EmotionCameraContent() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const processingRef = useRef(false);
  const requestRef = useRef(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);
  const cameraAttemptRef = useRef(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [permissionState, setPermissionState] = useState('idle');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Camera permission is needed for this optional check-in.');
  const [faceDetected, setFaceDetected] = useState(null);
  const [expression, setExpression] = useState(null);
  const [suggestedActivity, setSuggestedActivity] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activityIndex, setActivityIndex] = useState(0);
  const [mode, setMode] = useState('camera');
  const [manualEmotion, setManualEmotion] = useState(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  const stopCamera = () => {
    cameraAttemptRef.current += 1;
    startingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    requestRef.current?.abort();
    requestRef.current = null;
    processingRef.current = false;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraStarting(false);
    setIsProcessing(false);
    setFaceDetected(null);
    setExpression(null);
    setSuggestedActivity('');
    setStatus('Camera stopped. You can still explore activities below.');
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cameraAttemptRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      requestRef.current?.abort();
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const analyzeFrame = async (readinessAttempt = 0) => {
    const video = videoRef.current;
    if (!mountedRef.current || !streamRef.current || !video || processingRef.current) return;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      if (readinessAttempt < 12 && streamRef.current) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          analyzeFrame(readinessAttempt + 1);
        }, 150);
      } else {
        if (mountedRef.current) {
          setStatus('The camera preview is still starting. Press Check again when it appears.');
        }
      }
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setStatus('Checking whether a face is visible…');
    try {
      const scale = Math.min(1, 320 / video.videoWidth, 240 / video.videoHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Camera frame could not be prepared.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.65));
      if (!blob) throw new Error('Camera frame could not be prepared.');
      if (!mountedRef.current || !streamRef.current) return;

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      const controller = new AbortController();
      requestRef.current = controller;
      const response = await api.post('/api/emotion/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
        timeout: 12000,
      });
      requestRef.current = null;

      if (!mountedRef.current) return;
      const detected = response?.data?.face_detected === true && response?.data?.multiple_faces !== true;
      const detectedExpression = expressionLabels[response?.data?.expression] ? response.data.expression : null;
      setFaceDetected(detected);
      setExpression(detected ? detectedExpression : null);
      setSuggestedActivity(detected ? response?.data?.suggested_activity || '' : '');
      setActivityIndex(0);
      setError('');
      setStatus(detected
        ? detectedExpression
          ? 'A possible visible expression was estimated. It may not match how you feel.'
          : response?.data?.message || 'Face detected. The visible expression is unclear; try again in good lighting.'
        : response?.data?.multiple_faces
          ? 'Please make sure only one person is visible.'
          : response?.data?.message || '🙂 Please look toward the camera, then check again.');
    } catch (requestError) {
      if (requestError?.name === 'CanceledError' || requestError?.name === 'AbortError') return;
      console.warn('Camera facial-expression analysis failed.', requestError);
      if (mountedRef.current) {
        const detail = requestError?.response?.status === 401
          ? 'Please sign in again to use camera detection.'
          : 'Facial-expression estimation is temporarily unavailable. The camera preview is still available.';
        setError(detail);
        setFaceDetected(null);
        setExpression(null);
        setSuggestedActivity('');
        setStatus('Could not check the camera right now.');
      }
    } finally {
      requestRef.current = null;
      processingRef.current = false;
      if (mountedRef.current) {
        setIsProcessing(false);
        if (streamRef.current) {
          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            analyzeFrame();
          }, 1000);
        }
      }
    }
  };

  const startCamera = async () => {
    if (startingRef.current || streamRef.current) return;
    startingRef.current = true;
    const attempt = cameraAttemptRef.current + 1;
    cameraAttemptRef.current = attempt;
    setError('');
    setFaceDetected(null);
    setExpression(null);
    setPermissionState('requesting');
    setCameraStarting(true);
    setStatus('Starting camera…');
    let stream;
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const unsupported = new Error('Your browser does not support camera access.');
        unsupported.name = 'CameraUnsupportedError';
        throw unsupported;
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (!mountedRef.current || cameraAttemptRef.current !== attempt) {
        stopMediaStream(stream);
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('The camera preview element is not available. Please try again.');
      video.srcObject = stream;
      await playVideo(video);
      await waitForVideoReady(video);
      if (!mountedRef.current || cameraAttemptRef.current !== attempt) return;
      setCameraReady(true);
      setPermissionState('granted');
      setCameraStarting(false);
      setStatus('Preparing facial-expression estimation…');
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        analyzeFrame();
      }, 350);
    } catch (cameraError) {
      console.warn('Camera initialization failed.', cameraError);
      stopMediaStream(stream);
      if (streamRef.current === stream) {
        streamRef.current = null;
        if (videoRef.current?.srcObject === stream) videoRef.current.srcObject = null;
      }
      startingRef.current = false;
      if (mountedRef.current && cameraAttemptRef.current === attempt) {
        setCameraStarting(false);
        setCameraReady(false);
        setFaceDetected(null);
        if (cameraError?.name === 'CameraUnsupportedError') {
          setPermissionState('unavailable');
          setError('Your browser does not support camera access.');
        } else if (cameraError?.name === 'NotAllowedError' || cameraError?.name === 'PermissionDeniedError' || cameraError?.name === 'SecurityError') {
          setPermissionState('denied');
          setError('Camera permission is required for facial-expression estimation.');
        } else {
          setPermissionState('error');
          setError('Camera could not be started. Check that your camera is available, then try again.');
        }
        setStatus('Camera check-in could not start.');
      }
    } finally {
      startingRef.current = false;
      if (mountedRef.current && cameraAttemptRef.current === attempt) {
        setCameraStarting(false);
      }
    }
  };

  const chooseManualEmotion = async (emotion) => {
    if (manualSaving) return;
    setManualSaving(true);
    setManualError('');
    try {
      await emotionService.saveManualEmotion(emotion.key, 'Child-selected emotion check-in');
      if (mountedRef.current) {
        setManualEmotion(emotion.key);
        setActivityIndex(0);
      }
    } catch (requestError) {
      console.warn('Could not save child-selected emotion.', requestError);
      if (mountedRef.current) {
        setManualError(requestError?.response?.data?.detail || 'Your choice could not be saved. Please try again.');
      }
    } finally {
      if (mountedRef.current) setManualSaving(false);
    }
  };

  const selectMode = (nextMode) => {
    if (nextMode === mode) return;
    if (nextMode === 'manual') stopCamera();
    if (nextMode === 'camera') {
      setManualError('');
      setManualEmotion(null);
    }
    setMode(nextMode);
  };

  const availableActivities = mode === 'manual' && manualEmotion
    ? manualActivities[manualEmotion]
    : expression
      ? expressionActivities[expression]
      : activities;
  const currentActivity = availableActivities[activityIndex % availableActivities.length];

  return (
    <section className="mood-mirror" aria-labelledby="mood-mirror-title">
      <div className="mood-mirror-intro">
        <div>
          <span className="mood-mirror-kicker">CAMERA CHECK-IN</span>
          <h2 id="mood-mirror-title">A quick check-in</h2>
          <p>
            The camera estimates a visible facial expression and suggests an activity. This is not a
            reliable reading of someone’s actual mood or feelings.
          </p>
        </div>
        <div className={`mood-scan-orb ${cameraReady ? 'is-scanning' : ''}`} aria-hidden="true"><span>✦</span></div>
      </div>

      <div className="mood-mode-switch" role="group" aria-label="Choose check-in mode">
        <button
          type="button"
          className={`secondary-btn ${mode === 'camera' ? 'active' : ''}`}
          onClick={() => selectMode('camera')}
          aria-pressed={mode === 'camera'}
        >
          📷 Use Camera
        </button>
        <button
          type="button"
          className={`secondary-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => selectMode('manual')}
          aria-pressed={mode === 'manual'}
        >
          ✋ Select Emotion Manually
        </button>
      </div>

      {mode === 'camera' ? (
      <div className="mood-mirror-grid">
        <div>
          <div className={`mood-camera-stage ${cameraReady ? 'is-live' : ''}`}>
            <div className="mood-stage-label"><span className="mood-live-dot" />{cameraReady ? 'Camera preview' : 'Camera off'}</div>
            <video ref={videoRef} autoPlay muted playsInline className="mood-video" style={{ display: cameraReady ? 'block' : 'none' }} />
            {!cameraReady && (
              <div className="mood-camera-placeholder">
                <div className="mood-face-guide">◡</div>
                <strong>Your camera stays optional</strong>
                <span>No photo or video is saved.</span>
              </div>
            )}
            {cameraReady && <div className="mood-face-frame" aria-hidden="true" />}
          </div>
          <div className="mood-camera-controls">
            {!cameraReady && !cameraStarting
              ? (
                <button type="button" className="primary-btn" onClick={startCamera} disabled={cameraStarting}>
                  {cameraStarting ? 'Starting camera…' : error ? 'Try Again' : '📷 Start camera'}
                </button>
              )
              : <button type="button" className="secondary-btn" onClick={stopCamera}>{cameraStarting ? 'Cancel camera' : '🛑 Stop camera'}</button>}
            {cameraReady && (
              <button type="button" className="ghost-btn" onClick={() => {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = null;
                analyzeFrame();
              }} disabled={isProcessing}>
                {isProcessing ? 'Checking…' : 'Check again'}
              </button>
            )}
          </div>
        </div>

        <div className="mood-result-panel">
          <div className="mood-result-heading"><span>CAMERA STATUS</span>{isProcessing && <span className="mood-processing">Checking…</span>}</div>
          <div className="auth-message success mood-status" aria-live="polite">{status}</div>
          {faceDetected === true ? (
            <div className="mood-expression">
              <span className="mood-expression-emoji" aria-hidden="true">
                {expression ? expressionLabels[expression].emoji : '🙂'}
              </span>
              <div>
                <small>Camera check-in</small>
                <strong>Face detected</strong>
                {expression && (
                  <span className="mood-expression-estimate">
                    {expressionLabels[expression].emoji} Estimated facial expression: {expressionLabels[expression].label}
                  </span>
                )}
              </div>
            </div>
          ) : faceDetected === false ? (
            <div className="mood-expression">
              <span className="mood-expression-emoji" aria-hidden="true">🙂</span>
              <div><small>Camera check-in</small><strong>Please look toward the camera</strong></div>
            </div>
          ) : (
            <div className="mood-result-empty">
              <span>✦</span>
              <strong>{permissionState === 'denied' ? 'Camera not available' : 'No estimated expression yet'}</strong>
              <small>Facial appearance cannot reliably tell us how a child feels. Choose an activity because it sounds enjoyable.</small>
            </div>
          )}
          {error && (
            <div className="auth-message error mood-error" role="alert">
              ⚠️ {error}
            </div>
          )}
          {suggestedActivity && <p className="mood-suggestion"><strong>Suggested activity:</strong> {suggestedActivity}</p>}
          <p className="mood-suggestion">Demo estimation only: this visual expression estimate is not a diagnosis or a measure of how you feel. Camera frames are checked briefly and not stored.</p>
        </div>
      </div>
      ) : (
        <section className="mood-manual-panel" aria-labelledby="manual-emotion-title">
          <h2 id="manual-emotion-title">Choose how you feel</h2>
          <p>There are no wrong answers. Your choice is saved as a child-selected emotion.</p>
          <div className="emotion-choice-grid mood-manual-choices">
            {manualEmotions.map((emotion) => (
              <button
                key={emotion.key}
                type="button"
                className={`emotion-choice ${manualEmotion === emotion.key ? 'selected' : ''}`}
                onClick={() => chooseManualEmotion(emotion)}
                disabled={manualSaving}
                aria-pressed={manualEmotion === emotion.key}
              >
                <span className="emotion-face" aria-hidden="true">{emotion.emoji}</span>
                <strong>{emotion.label}</strong>
              </button>
            ))}
          </div>
          {manualSaving && <p className="mood-status" role="status">Saving your choice…</p>}
          {manualError && <div className="auth-message error mood-error" role="alert">{manualError}</div>}
          {manualEmotion && (
            <div className="mood-manual-note" aria-live="polite">
              <strong>Child-selected emotion: {manualEmotions.find((item) => item.key === manualEmotion)?.label}</strong>
            </div>
          )}
        </section>
      )}

      <section className="mood-activities" aria-labelledby="mood-activities-title">
        <div className="communication-section-heading">
          <div>
            <h2 id="mood-activities-title">Activities to explore</h2>
            <p>
              {mode === 'manual' && manualEmotion
                ? 'Choose anything that sounds good to you. Manual choices are not camera estimates.'
                : expression
                  ? 'These are gentle suggestions based on a demo facial-expression estimate. Choose what feels right to you.'
                  : 'Choose anything that feels interesting to you.'}
            </p>
          </div>
        </div>
        <div className="mood-activity-card card">
          <span className="mood-activity-card-icon" aria-hidden="true">{currentActivity.icon}</span>
          <div>
            <h3>{currentActivity.label}</h3>
            <p>{currentActivity.detail}</p>
          </div>
          <Link className="primary-btn" to={currentActivity.to}>Open activity</Link>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setActivityIndex((index) => (index + 1) % activities.length)}
          aria-label="Show another activity"
        >
          ↻ Try another activity
        </button>
      </section>
    </section>
  );
}

class CameraErrorBoundary extends Component {
  state = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Facial camera page failed to render.', error, info.componentStack);
  }

  retry = () => {
    this.setState((state) => ({
      hasError: false,
      resetKey: state.resetKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="mood-mirror" aria-live="assertive">
          <h2>⚠️ Camera could not be started</h2>
          <p>The camera feature encountered a problem. The rest of AutiAssist is still available.</p>
          <button type="button" className="primary-btn" onClick={this.retry}>Try Again</button>
        </section>
      );
    }
    return <EmotionCameraContent key={this.state.resetKey} />;
  }
}

export default function EmotionCamera() {
  return <CameraErrorBoundary />;
}
