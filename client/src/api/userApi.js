import API from './axiosInstance';

export const login = (token) => API.post('/user/login', { token });
export const getProfile = (userId) => API.get(`/user/profile/${userId}`);
