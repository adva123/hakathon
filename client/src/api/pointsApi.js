import API from './axiosInstance';

export const updateUserPointsAndCoins = (userId, coins, score) =>
  API.post(`/user/update-points-coins`, { userId, coins, score });
