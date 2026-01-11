import pool from '../../db/db.js';


export const createUser = async (username, email) => {
  const [result] = await pool.query(
    'INSERT INTO users (username, email, owned_robots) VALUES (?, ?, ?)',
    [username, email, JSON.stringify([])]
  );
  return result.insertId;
};


export const getUserById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  if (rows[0] && rows[0].owned_robots) {
    rows[0].ownedRobots = JSON.parse(rows[0].owned_robots);
  } else if (rows[0]) {
    rows[0].ownedRobots = [];
  }
  return rows[0];
};
// Update owned robots for a user
export const updateUserOwnedRobots = async (id, ownedRobots) => {
  await pool.query(
    'UPDATE users SET owned_robots = ? WHERE id = ?',
    [JSON.stringify(ownedRobots), id]
  );
};

export const updateUserPointsAndCoins = async (id, coins, score) => {
  await pool.query(
    'UPDATE users SET coins = ?, score = ? WHERE id = ?',
    [coins, score, id]
  );
};
