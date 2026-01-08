import API from './axiosInstance';

export const generateDoll = (data) => API.post('/doll/generate', data);
export const getUserDolls = (userId) => API.get(`/doll/history/${userId}`);
