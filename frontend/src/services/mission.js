import api from './api';

export async function getTodayMission() {
  const response = await api.get('/api/mission/today');
  return response.data;
}

export async function completeMission(missionKey) {
  const response = await api.post('/api/mission/complete', { mission_key: missionKey });
  return response.data;
}
