import API from './axiosInstance';

export const addScore = (userId, points) => API.post('/game/add-score', { userId, points });
export const getStats = (userId) => API.get(`/game/stats/${userId}`);
