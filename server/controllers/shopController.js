import shopService from '../services/shopService.js';

const buyItem = async (req, res) => {
  try {
    const { userId, itemId } = req.body;
    const result = await shopService.buyItem(userId, itemId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCatalog = async (req, res) => {
  try {
    const catalog = await shopService.getCatalog();
    res.json({ success: true, catalog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  buyItem,
  getCatalog,
};
