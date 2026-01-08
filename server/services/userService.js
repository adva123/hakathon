import { verifyGoogleToken } from '../utils/authUtils.js';

const users = {};

const login = async (token) => {
  const userData = await verifyGoogleToken(token);
  if (!userData) throw new Error('Invalid Google token');
  // שמור משתמש בזיכרון (או DB)
  users[userData.id] = {
    id: userData.id,
    name: userData.name,
    avatar: userData.picture,
    email: userData.email,
  };
  return { success: true, user: users[userData.id] };
};

const getProfile = async (userId) => {
  if (!users[userId]) throw new Error('User not found');
  return users[userId];
};

export default {
  login,
  getProfile,
};
