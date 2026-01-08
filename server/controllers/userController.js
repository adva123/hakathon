import userService from '../services/userService.js';

const login = async (req, res) => {
  try {
    const { token } = req.body;
    const result = await userService.login(token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await userService.getProfile(userId);
    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  login,
  getProfile,
};
