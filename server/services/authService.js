import pool from '../../db/db.js'; // ודאי שזה הנתיב לקובץ ה-Pool שלך

const login = async (token) => {
  const userData = await verifyGoogleToken(token);
  if (!userData) throw new Error('Invalid Google token');

  // בדיקה אם המשתמש קיים ב-DB
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [userData.email]);
  
  let user;
  if (rows.length === 0) {
    // יצירת משתמש חדש אם הוא לא קיים
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, coins, score, energy) VALUES (?, ?, ?, ?, ?)',
      [userData.name, userData.email, 100, 0, 100]
    );
    user = { id: result.insertId, name: userData.name, email: userData.email, coins: 100, score: 0, energy: 100 };
  } else {
    user = rows[0];
  }

  return { success: true, user };
};

const getProfile = async (userId) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) throw new Error('User not found');
  return rows[0];
};