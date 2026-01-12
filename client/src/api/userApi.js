import API from './axiosInstance';


export const login = (token) => API.post('/user/login', { token });
export const getProfile = (userId) => API.get(`/user/profile/${userId}`);
export const getOwnedRobots = (userId) => API.get(`/user/${userId}/robots`);
export const addOwnedRobot = (userId, robotId) => API.post(`/user/${userId}/robots`, { robotId });
