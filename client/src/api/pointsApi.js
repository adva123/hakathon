import API from './axiosInstance';

export const updateUserPointsAndCoins = (userId, score, coins) =>
  API.post(`/user/update-points-coins`, { userId, score, coins });
