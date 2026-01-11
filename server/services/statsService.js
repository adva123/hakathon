import pool from '../../db/db.js';

const calculateNewScore = async (userId, points) => {
  const coinsBonus = Math.floor(points / 10);
  
  // עדכון ב-DB
  try {
    const [result] = await pool.execute(
      'UPDATE users SET score = score + ?, coins = coins + ? WHERE id = ?',
      [points, coinsBonus, userId]
    );
    console.log('הנתונים נשמרו בהצלחה! ID:', userId, 'Result:', result);
  } catch (error) {
    console.error('שגיאה בשמירה ל-DB:', error);
    throw error;
  }

  // שליפת הנתונים המעודכנים להחזרה ל-Frontend
  const [rows] = await pool.execute('SELECT score, coins FROM users WHERE id = ?', [userId]);
  return { 
    newScore: rows[0].score, 
    bonus: coinsBonus, 
    coins: rows[0].coins 
  };
};