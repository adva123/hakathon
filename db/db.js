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
console.log("Checking DB_PASSWORD:", process.env.DB_PASSWORD ? "✅ SET" : "❌ Not Found");
console.log("Checking DB_NAME:", process.env.DB_NAME || "❌ Not Found");
console.log("--------------------------");

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
};

console.log("Creating pool with config:", {
  ...poolConfig,
  password: poolConfig.password ? `****${poolConfig.password.slice(-4)}` : 'MISSING'
});

const pool = mysql.createPool(poolConfig);

export default pool;