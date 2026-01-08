import dollsService from '../services/dollsService.js';

export const generateDoll = async (req, res) => {
  try {
    const { userId, dollDescription, privacySettings, useDALLE } = req.body;
    // אם אין userId, נשתמש ב-demo
    const safeUserId = userId || 'demo';
    const result = await dollsService.generateDoll(safeUserId, dollDescription, privacySettings, useDALLE);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate doll.' });
  }
};

export const getUserDolls = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });
    const dolls = await dollsService.getUserDolls(userId);
    res.json({ success: true, dolls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to get dolls.' });
  }
};
