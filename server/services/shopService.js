import { robotCatalog } from '../models/robotModel.js';

const userInventory = {};

const buyItem = async (userId, itemId) => {
  if (!userInventory[userId]) userInventory[userId] = { coins: 100, owned: [] };
  const item = robotCatalog.find(r => r.id === itemId);
  if (!item) throw new Error('Item not found');
  if (userInventory[userId].coins < item.price) throw new Error('Not enough coins');
  userInventory[userId].coins -= item.price;
  userInventory[userId].owned.push(itemId);
  return { success: true, owned: userInventory[userId].owned, coins: userInventory[userId].coins };
};

const getCatalog = async () => {
  return robotCatalog;
};

export default {
  buyItem,
  getCatalog,
};
