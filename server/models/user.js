import pool from '../../db/db.js';

export const createUser = async (username, email) => {
  const [result] = await pool.query(
    'INSERT INTO users (username, email) VALUES (?, ?)',
    [username, email]
  );
  return result.insertId;
};

export const getUserById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
};

export const updateUserPointsAndCoins = async (id, coins, score) => {
  await pool.query(
    'UPDATE users SET coins = ?, score = ? WHERE id = ?',
    [coins, score, id]
  );
};
