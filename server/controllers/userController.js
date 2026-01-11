const getOwnedRobots = async (req, res) => {
  try {
    const { userId } = req.params;
    const robots = await userService.getOwnedRobots(userId);
    res.json({ success: true, robots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addOwnedRobot = async (req, res) => {
  try {
    const { userId } = req.params;
    const { robotId } = req.body;
    const robots = await userService.addOwnedRobot(userId, robotId);
    res.json({ success: true, robots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
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
  getOwnedRobots,
  addOwnedRobot,
};
