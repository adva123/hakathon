import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת ה-env מהתיקייה שמעל (server)
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

console.log("--- DB Connection Test ---");
console.log("Checking DB_HOST:", process.env.DB_HOST || "❌ Not Found");
console.log("Checking DB_USER:", process.env.DB_USER || "❌ Not Found");
console.log("--------------------------");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

export default pool;