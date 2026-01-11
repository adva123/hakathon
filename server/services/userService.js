
import { verifyGoogleToken } from '../utils/authUtils.js';
import * as userModel from '../models/user.js';

const login = async (token) => {
  const userData = await verifyGoogleToken(token);
  if (!userData) throw new Error('Invalid Google token');

  // Check if user exists in DB
  let user = await userModel.getUserById(userData.id);
  if (!user) {
    // Create user in DB with default coins and score
    const newUserId = await userModel.createUser(userData.name, userData.email);
    user = await userModel.getUserById(newUserId);
  }
  // Return user info including coins and score
  return { success: true, user };
};

const getProfile = async (userId) => {
  const user = await userModel.getUserById(userId);
  if (!user) throw new Error('User not found');
  return user;
};

export default {
  login,
  getProfile,
};
