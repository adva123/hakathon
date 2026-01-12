import API from './axiosInstance';

export const updateUserPointsAndCoins = (userId, score, coins, energy) =>
  API.post(`/user/update-points-coins`, { userId, score, coins, energy });
