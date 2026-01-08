import gameService from '../services/gameService.js';

const updateScore = async (req, res) => {
  try {
    const { userId, points } = req.body;
    const updatedStats = await gameService.calculateNewScore(userId, points);
    res.json(updatedStats);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await gameService.getStats(userId);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  updateScore,
  getStats,
};
