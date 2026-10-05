import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

const emotionSuggestions = {
  happy: 'Great! Try a drawing or movement activity.',
  sad: 'Would you like to try a calming breathing break?',
  angry: 'Let’s take three slow breaths and then try a quiet task.',
  neutral: 'Would you like to try a short learning task?',
};

export default function EmotionCamera({ onManualSelect, selectedEmotion }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionState, setPermissionState] = useState('idle');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Camera permission is needed for this activity.');
  const [lastResult, setLastResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const stopCamera = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
    setStatus('Camera stopped.');
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const sendFrameToBackend = async () => {
    if (!videoRef.current || isProcessing) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob) {
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      const response = await api.post('/api/emotion/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response?.data || {};
      setLastResult(result);

      if (!result.face_detected) {
        setStatus(result.message || 'No face detected. Please look toward the camera.');
      } else if (result.multiple_faces) {
        setStatus('Please make sure only one person is in the camera view.');
      } else if (result.expression) {
        setStatus(result.message || 'Estimated facial expression available.');
      }
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.response?.data?.message || 'We could not process the image. Please try again.';
      setError(detail);
      setStatus('Camera is available but the analysis could not run.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    setError('');
    setPermissionState('requesting');
    setStatus('Camera permission is needed for this activity.');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setPermissionState('granted');
      setStatus('Look toward the camera.');

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        sendFrameToBackend();
      }, 1200);
    } catch (error) {
      console.error('Camera error:', error);
      setPermissionState('denied');
      setCameraReady(false);
      setError("Camera access isn't available.");
      setStatus('Select an emotion manually instead.');
    }
  };

  return (
    <section className="mood-mirror" aria-labelledby="mood-mirror-title">
      <div className="mood-mirror-intro">
        <div>
          <span className="mood-mirror-kicker">MOOD MIRROR</span>
          <h2 id="mood-mirror-title">Let’s check in together</h2>
          <p>Look at the camera for a moment. We’ll make a gentle estimate of your facial expression and suggest a helpful next step.</p>
        </div>
        <div className={`mood-scan-orb ${cameraReady ? 'is-scanning' : ''}`} aria-hidden="true">
          <span>✦</span>
        </div>
      </div>

      {permissionState !== 'granted' && !cameraReady && (
        <div className="mood-permission">
          <div className="mood-permission-icon">📷</div>
          <div>
            <strong>Ready when you are</strong>
            <span>Camera access stays on this device and no video is saved.</span>
          </div>
          <div className="mood-actions">
            <button type="button" className="primary-btn" onClick={startCamera}>Start mood check</button>
            <button type="button" className="ghost-btn" onClick={onManualSelect}>Choose feelings instead</button>
          </div>
        </div>
      )}

      {error && (
        <div className="auth-message error mood-error" style={{ marginBottom: '14px' }}>{error}</div>
      )}

      <div className="mood-mirror-grid">
        <div>
          <div className={`mood-camera-stage ${cameraReady ? 'is-live' : ''}`}>
            <div className="mood-stage-label"><span className="mood-live-dot" /> {cameraReady ? 'Live check-in' : 'Camera preview'}</div>
            <video ref={videoRef} autoPlay muted playsInline className="mood-video" style={{ display: cameraReady ? 'block' : 'none' }} />
            {!cameraReady && (
              <div className="mood-camera-placeholder">
                <div className="mood-face-guide">◡</div>
                <strong>Your calm space starts here</strong>
                <span>Position your face inside the guide</span>
              </div>
            )}
            {cameraReady && <div className="mood-face-frame" aria-hidden="true" />}
          </div>

          <div className="mood-camera-controls">
            {!cameraReady ? (
              <button type="button" className="primary-btn" onClick={startCamera}>📷 Start camera</button>
            ) : (
              <button type="button" className="secondary-btn" onClick={stopCamera}>🛑 Stop check-in</button>
            )}
            <button type="button" className="ghost-btn" onClick={onManualSelect}>Use feelings cards</button>
          </div>
        </div>

        <div className="mood-result-panel">
          <div className="mood-result-heading">
            <span>YOUR CHECK-IN</span>
            {isProcessing && <span className="mood-processing">Reading...</span>}
          </div>
          <div className="auth-message success mood-status">{status}</div>
          {lastResult && lastResult.expression ? (
            <div className="mood-result-content">
              <div className="mood-expression">
                <span className="mood-expression-emoji">
                  {lastResult.expression === 'happy' && '😊'}
                  {lastResult.expression === 'sad' && '😢'}
                  {lastResult.expression === 'angry' && '😠'}
                  {lastResult.expression === 'neutral' && '😐'}
                </span>
                <div><small>Estimated expression</small><strong>{lastResult.expression}</strong></div>
              </div>
              <div className="mood-confidence"><span>Confidence</span><strong>{Math.round((lastResult.confidence || 0) * 100)}%</strong><i><b style={{ width: `${Math.round((lastResult.confidence || 0) * 100)}%` }} /></i></div>
              <p className="mood-suggestion">{emotionSuggestions[lastResult.expression] || 'Would you like to try a learning activity?'}</p>
            </div>
          ) : (
            <div className="mood-result-empty"><span>✦</span><strong>Your mood note will appear here</strong><small>A facial expression is only a gentle estimate. You can always choose a feeling yourself.</small></div>
          )}
          {lastResult && !lastResult.expression && lastResult.message && <div className="auth-message error mood-error">{lastResult.message}</div>}
          {selectedEmotion && <div className="mood-manual-note">Manual choice: <strong>{selectedEmotion}</strong></div>}
        </div>
      </div>
    </section>
  );
}
