import pool from '../../db/db.js';
import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

// אתחול OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ...existing code...

/**
 * פונקציה ייעודית ליצירת תמונה ב-DALL-E והחזרת Base64
 */
  try {
    const response = await openai.images.generate({
      model: "dall-e-3", // ניתן להשתמש ב-dall-e-2 לחיסכון בעלויות
      prompt: `A cute 3D Pixar-style toy doll character. ${description}. Colorful, high quality, professional toy photography, white background.`,
      n: 1,
      size: "1024x1024"
    });
    const base64Image = response.data[0].b64_json;
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error("❌ DALL-E Error:", error.message);
    throw error;
  }
/**
 * הפונקציה המרכזית ליצירת בובה
 */
const generateDoll = async (userId, dollDescription, privacySettings) => {
  // בדיקת בטיחות בסיסית
  const isUnsafe = dollDescription.toLowerCase().includes("קללה") || 
                   privacySettings?.isPhonePublic ||
                   privacySettings?.isAddressPublic;
  if (isUnsafe) {
    return {
      success: true,
      isUnsafe: true,
      doll: {
        id: null,
        name: "⚠️ תוכן חסום",
        description: "התוכן נחסם מטעמי בטיחות.",
        imageUrl: "",
        blur: true,
        privacyApproved: false,
        createdAt: new Date()
      },
      message: "⚠️ התוכן נחסם."
    };
  }
  try {
    const imageUrl = await generateDallEImage(dollDescription);
    const [result] = await pool.execute(
      'INSERT INTO dolls (user_id, name, description, image_url, is_good) VALUES (?, ?, ?, ?, ?)',
      [userId, dollDescription.substring(0, 15), `בובה מיוחדת שנוצרה עבורך לפי התיאור: ${dollDescription}`, imageUrl, true]
    );
    const newDoll = {
      id: result.insertId,
      name: dollDescription.substring(0, 15),
      description: `בובה מיוחדת שנוצרה עבורך לפי התיאור: ${dollDescription}`,
      imageUrl: imageUrl,
      createdAt: new Date()
    };
    return { success: true, doll: newDoll };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const getUserDolls = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM dolls WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
};

export { generateDallEImage, generateDoll, getUserDolls };
// ...existing code...