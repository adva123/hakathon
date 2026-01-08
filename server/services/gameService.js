const userStats = {};

const calculateNewScore = async (userId, points) => {
  if (!userStats[userId]) userStats[userId] = { score: 0, coins: 0 };
  userStats[userId].score += points;
  const coinsBonus = Math.floor(points / 10);
  userStats[userId].coins += coinsBonus;
  return { newScore: userStats[userId].score, bonus: coinsBonus, coins: userStats[userId].coins };
};

const getStats = async (userId) => {
  if (!userStats[userId]) return { score: 0, coins: 0 };
  return userStats[userId];
};

export default {
  calculateNewScore,
  getStats,
};
