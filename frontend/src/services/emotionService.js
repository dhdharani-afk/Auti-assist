import api from './api';

export const emotionService = {
  async analyzeFrame(file) {
    const formData = new FormData();
    formData.append('file', file, 'frame.jpg');

    return api.post('/api/emotion/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async saveManualEmotion(emotion, activity) {
    return api.post('/api/emotion/activity', {
      emotion,
      estimated: false,
      confidence: 0,
      activity,
    });
  },
};

export default emotionService;
