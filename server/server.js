import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import OpenAI from 'openai';
import pool from '../db/db.js';


const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// 1. נתיב לעדכון ניקוד (יפתור את ה-404 בתמונה baa3dc)
app.post('/api/users/update-score', async (req, res) => {
    const { userId, scoreToAdd } = req.body;
    // בדיקה למניעת שגיאת "undefined" בפרמטרים
    if (!userId || scoreToAdd === undefined) {
        return res.status(400).json({ error: "Missing userId or scoreToAdd in request body" });
    }
    try {
        await pool.execute(
            'UPDATE users SET score = score + ? WHERE id = ?',
            [scoreToAdd, userId]
        );
        const [rows] = await pool.execute('SELECT id, score, coins FROM users WHERE id = ?', [userId]);
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. נתיב למחיקת בובה (בדיקת DELETE בפוסטמן)
app.delete('/api/dolls/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM dolls WHERE id = ?', [id]);
        res.json({ success: true, message: "Doll deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// שליפת 10 סיסמאות אקראיות מה-DB
app.get('/api/passwords/random', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT password_text AS password, is_strong AS isStrong FROM passwords ORDER BY RAND() LIMIT 10'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// שמירת בובה חדשה ב-DB
app.post('/api/dolls/save', async (req, res) => {
    // הוספת ערכי ברירת מחדל (0) למניעת undefined
    const {
        userId,
        name,
        description,
        imageUrl,
        isGood,
        pointsDelta = 0,
        energyDelta = 0
    } = req.body;

    try {
        // 1. שמירת הבובה
        await pool.execute(
            'INSERT INTO dolls (user_id, name, description, image_url, is_good) VALUES (?, ?, ?, ?, ?)',
            [userId, name, description, imageUrl, isGood]
        );

        // 2. בניית שאילתת עדכון המשתמש
        let updateFields = [];
        let updateValues = [];

        if (isGood) {
            updateFields.push('coins = coins + 10');
        }

        // שימוש ב-score כפי שמופיע ב-DB שלך
        updateFields.push('score = score + ?');
        updateValues.push(pointsDelta);

        updateFields.push('energy = energy + ?');
        updateValues.push(energyDelta);

        // ביצוע העדכון
        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            [...updateValues, userId]
        );

        // שליפת הנתונים המעודכנים להצגה
        const [userRows] = await pool.execute(
            'SELECT id, coins, score, energy FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: "Success! Everything saved to DB.",
            user: userRows[0]
        });

    } catch (err) {
        console.error("❌ DB Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// שליפת כל הבובות של משתמש
app.get('/api/dolls/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.execute('SELECT * FROM dolls WHERE user_id = ?', [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DALL-E Setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let userData = {
    coins: 100,
    ownedRobots: ['default'],
    selectedRobotId: 'default',
    generatedDolls: []
};

// נתיב להתחברות/יצירת משתמש (מה שחיפשת בפוסטמן)
app.post('/api/auth/login', async (req, res) => {
    const { email, username } = req.body; // בבדיקה ידנית נשלח אימייל
    try {
        // בודק אם המשתמש קיים ב-DB
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length > 0) {
            return res.json({ success: true, user: rows[0] });
        }

        // אם לא קיים - יוצר משתמש חדש
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, coins, points, energy) VALUES (?, ?, ?, ?, ?)',
            [username || 'New Player', email, 100, 0, 100]
        );
        
        res.json({ success: true, user: { id: result.insertId, email, username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * 🎨 יצירת בובה עם DALL-E 3
 */
app.post('/api/dolls/generate', async (req, res) => {
    const { dollDescription, privacySettings } = req.body;

    console.log('📝 Received doll request:', dollDescription);

    // 1. Safety check
    const forbiddenWords = ['כתובת', 'רחוב', 'עיר', 'מילה_רעה1', 'טלפון', 'email', 'מספר', 'דוא"ל'];
    const isUnsafe = forbiddenWords.some(word => dollDescription.includes(word)) ||
                     privacySettings?.isPhonePublic ||
                     privacySettings?.isAddressPublic;
    if (isUnsafe) {
        console.log('🚫 Unsafe content detected');
        // Virus image with red X (SVG data URL)
        const virusSvg = encodeURIComponent(`
            <svg width='256' height='256' xmlns='http://www.w3.org/2000/svg'>
              <rect width='256' height='256' fill='#fff'/>
              <circle cx='128' cy='128' r='80' fill='#ff3333' stroke='#b20000' stroke-width='8'/>
              <text x='50%' y='50%' text-anchor='middle' dy='.3em' font-size='80' font-family='Arial' fill='#fff'>🦠</text>
              <line x1='60' y1='60' x2='196' y2='196' stroke='#fff' stroke-width='18' stroke-linecap='round'/>
              <line x1='196' y1='60' x2='60' y2='196' stroke='#fff' stroke-width='18' stroke-linecap='round'/>
            </svg>
        `);
        const unsafeDoll = {
            id: `doll_${Date.now()}`,
            name: "❌ Virus Detected",
            description: "Blocked due to unsafe content.",
            imageUrl: `data:image/svg+xml,${virusSvg}`,
            blur: true,
            privacyApproved: false,
            createdAt: new Date()
        };
        // Do NOT add unsafe doll to userData.generatedDolls
        // הורד אנרגיה למשתמש (נניח energy קיים, אם לא - הוסף)
        if (typeof userData.energy !== 'number') userData.energy = 100;
        userData.energy = Math.max(0, userData.energy - 10);
        return res.json({ 
            success: true, 
            isUnsafe: true, 
            doll: unsafeDoll, 
            message: "❌ Unsafe content detected! Energy decreased.",
            userData
        });
    }

    try {
        // 2. יצירת שם ותיאור (פשוט)
        let dollDetails = { 
            name: `${dollDescription.substring(0, 20)} Doll`, 
            description: "A unique and special doll!" 
        };

        // 3. יצירת prompt לתמונה
        const imagePrompt = `A cute 3D pixar-style character of a child. Details: ${dollDescription}`;

        // 4. יצירת התמונה עם DALL-E 3 (base64)
        let imageUrl;
        let generationMethod = 'DALL-E 3';
        try {
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: imagePrompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            });
            const base64Image = response.data[0].b64_json;
            imageUrl = `data:image/png;base64,${base64Image}`;
            console.log('✅ DALL-E image created (base64)');
        } catch (dalleError) {
            console.error('❌ DALL-E error:', dalleError.message);
            imageUrl = '';
            generationMethod = 'DALL-E (error)';
        }

        // 5. יצירת אובייקט הבובה
        const newDoll = {
            id: `doll_${Date.now()}`,
            name: dollDetails.name,
            description: dollDetails.description,
            imageUrl: imageUrl,
            imagePrompt: imagePrompt,
            generationMethod: generationMethod,
            blur: false,
            privacyApproved: true,
            createdAt: new Date()
        };
        userData.generatedDolls.push(newDoll);
        // הוסף למשתמש 10 נקודות ו-10 כסף
        if (typeof userData.points !== 'number') userData.points = 0;
        if (typeof userData.coins !== 'number') userData.coins = 0;
        userData.points += 10;
        userData.coins += 10;
        console.log('✅ Doll created successfully!');

        res.json({ 
            success: true, 
            isUnsafe: false, 
            doll: newDoll, 
            message: `✨ Doll created with ${generationMethod}! +10 נקודות +10 כסף`,
            userData
        });

    } catch (error) {
        console.error("❌ Server error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to generate doll. Please try again." 
        });
    }
});

/**
 * 📋 Get all dolls
 */
app.get('/api/dolls', (req, res) => {
    res.json({ 
        success: true, 
        dolls: userData.generatedDolls,
        count: userData.generatedDolls.length
    });
});

/**
 * 🗑️ Delete a doll
 */
app.delete('/api/dolls/:id', (req, res) => {
    const { id } = req.params;
    const index = userData.generatedDolls.findIndex(d => d.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Doll not found' });
    }
    userData.generatedDolls.splice(index, 1);
    res.json({ success: true, message: 'Doll deleted' });
});

/**
 * ❤️ Health check
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        dolls: userData.generatedDolls.length,
        dalleEnabled: !!openai,
        message: '🎭 Doll Factory is running!' 
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🎨 Image generation: DALL-E 3 (base64)`);
});
