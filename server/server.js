import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import pool from '../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// ========================================
// AUTH ENDPOINTS
// ========================================

app.post('/api/auth/login', async (req, res) => {
    const { email, username } = req.body;

    console.log('🔐 Login attempt:', { email, username });

    if (!email || !username) {
        return res.status(400).json({
            success: false,
            message: 'Email and username are required'
        });
    }

    try {
        // Check if user exists
        const [existingUsers] = await pool.execute(
            'SELECT id, username, email, score, coins, energy, robot_color, owned_robots FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            // Existing user
            const user = existingUsers[0];
            console.log('✅ Existing user found:', user.id);

            return res.json({
                success: true,
                user: user,
                message: 'Welcome back!'
            });
        }

        // New user - create account
        const [insertResult] = await pool.execute(
            'INSERT INTO users (username, email, score, coins, energy, owned_robots) VALUES (?, ?, ?, ?, ?, ?)',
            [username, email, 0, 50, 100, '["default"]']
        );

        const newUserId = insertResult.insertId;
        console.log('✅ New user created:', newUserId);

        // Load new user
        const [newUserRows] = await pool.execute(
            'SELECT id, username, email, score, coins, energy, robot_color, owned_robots FROM users WHERE id = ?',
            [newUserId]
        );

        const newUser = newUserRows[0];

        res.json({
            success: true,
            user: newUser,
            message: 'Account created successfully!'
        });

    } catch (error) {
        console.error('❌ Auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during authentication',
            error: error.message
        });
    }
});

app.get('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT id, username, email, score, coins, energy, robot_color, owned_robots FROM users WHERE id = ?',
            [userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error('❌ Error loading user:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/user/update-points-coins', async (req, res) => {
    const { userId, score, coins, energy } = req.body;
    console.log('💰 Update points request:', { userId, score, coins, energy });
    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    try {
        let query, params;
        if (typeof energy !== 'undefined') {
            query = 'UPDATE users SET score = ?, coins = ?, energy = ? WHERE id = ?';
            params = [score, coins, energy, userId];
        } else {
            query = 'UPDATE users SET score = ?, coins = ? WHERE id = ?';
            params = [score, coins, userId];
        }
        const [result] = await pool.execute(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        console.log(`✅ Updated DB for user ${userId}`);
        res.json({ success: true, message: 'Updated', data: { score, coins, energy } });
    } catch (error) {
        console.error('❌ DB Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
});

// ========================================
// PASSWORDS
// ========================================

app.post('/api/passwords/check', async (req, res) => {
    const { passwordId, userAnswer } = req.body;
    try {
        const [rows] = await pool.execute('SELECT is_safe FROM passwords WHERE id = ?', [passwordId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Password not found' });
        }
        const isCorrect = rows[0].is_safe === userAnswer;
        res.json({ success: true, correct: isCorrect, actualAnswer: rows[0].is_safe });
    } catch (err) {
        console.error('❌ Error checking password:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ========================================
// DOLLS / AI GENERATION
// ========================================

app.post('/api/dolls/generate', async (req, res) => {
    const { dollDescription, privacySettings, userId } = req.body;
    console.log('🎭 Generate request:', { dollDescription, userId });

    const forbiddenPattern = /(05\d|02\d|03\d|04\d|08\d|09\d)-?\d{7}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const forbiddenWords = [
        'bad', 'inappropriate', 'קללה', 'אלימות', 'מזיק', 'פוגעני',
        'מיני', 'מיניות', 'מגונה', 'פורנוגרפיה', 'גזעני', 'שנאה',
        'טרור', 'סמים', 'אלכוהול', 'פשע', 'נשק', 'בריונות',
        'הטרדה', 'מקלל'
    ];

    const containsInfo = forbiddenPattern.test(dollDescription);
    const containsBadWords = forbiddenWords.some(word => dollDescription.toLowerCase().includes(word));
    const isUnsafe = containsInfo || containsBadWords || privacySettings?.isPhonePublic || privacySettings?.isAddressPublic;

    if (isUnsafe) {
        console.log('⚠️ Unsafe content detected');
        try {
            const blockedImageUrl = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
            await pool.execute(
                'INSERT INTO dolls (user_id, name, description, image_url, is_good) VALUES (?, ?, ?, ?, ?)',
                [userId, 'Blocked Content', 'Unsafe content', blockedImageUrl, 0]
            );
            await pool.execute(
                'UPDATE users SET score = GREATEST(0, score - 10), energy = GREATEST(0, energy - 10) WHERE id = ?',
                [userId]
            );
            const [updatedUser] = await pool.execute(
                'SELECT id, username, email, score, coins, energy FROM users WHERE id = ?',
                [userId]
            );
            return res.json({
                success: true,
                isUnsafe: true,
                doll: {
                    id: 'blocked_' + Date.now(),
                    name: "Blocked Content",
                    description: "Unsafe content",
                    imageUrl: blockedImageUrl
                },
                userData: updatedUser[0],
                message: "⚠️ הניקוד והאנרגיה ירדו בשל הפרת פרטיות או שימוש במילים אסורות."
            });
        } catch (dbError) {
            console.error('❌ DB error:', dbError);
            return res.status(500).json({ success: false, message: 'DB error', error: dbError.message });
        }
    }

    try {
        const dollName = `${dollDescription.substring(0, 20)} Doll`;
        const dollDesc = dollDescription || "A unique AI creation";
        const imagePrompt = `A cute 3D pixar-style character of a child. Details: ${dollDescription}`;
        console.log('🎨 Creating image with DALL-E...');
        let imageUrl = '';
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
            console.log('✅ DALL-E image created');
        } catch (dalleError) {
            console.error('❌ DALL-E error:', dalleError.message);
            imageUrl = `https://via.placeholder.com/1024/6366f1/ffffff?text=${encodeURIComponent(dollName)}`;
            generationMethod = 'Placeholder';
        }
        console.log('💾 Saving doll to database...');
        const [dollResult] = await pool.execute(
            'INSERT INTO dolls (user_id, name, description, image_url, is_good) VALUES (?, ?, ?, ?, ?)',
            [userId, dollName, dollDesc, imageUrl, 1]
        );
        const newDollId = dollResult.insertId;
        console.log('✅ Doll saved with ID:', newDollId);
        await pool.execute(
            'UPDATE users SET score = score + 10, coins = coins + 10 WHERE id = ?',
            [userId]
        );
        const [updatedUserRows] = await pool.execute(
            'SELECT id, username, email, score, coins, energy FROM users WHERE id = ?',
            [userId]
        );
        const updatedUser = updatedUserRows[0];
        console.log('✅ User resources updated:', updatedUser);
        res.json({
            success: true,
            isUnsafe: false,
            doll: {
                id: newDollId,
                name: dollName,
                description: dollDesc,
                imageUrl: imageUrl,
                generationMethod: generationMethod,
                createdAt: new Date()
            },
            userData: updatedUser,
            message: `✨ Doll created! +10 points & +10 coins!`
        });
    } catch (error) {
        console.error("❌ Server error:", error);
        res.status(500).json({ success: false, message: "Failed to generate doll", error: error.message });
    }
});

app.get('/api/dolls/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, description, image_url as imageUrl, is_good as isGood, created_at as createdAt FROM dolls WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        console.log(`📦 Loaded ${rows.length} dolls for user ${userId}`);
        res.json(rows);
    } catch (err) {
        console.error('❌ Error loading dolls:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/dolls/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM dolls WHERE id = ?', [id]);
        console.log(`🗑️ Deleted doll ${id}`);
        res.json({ success: true, message: "Doll deleted" });
    } catch (err) {
        console.error('❌ Error deleting doll:', err);
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// ROBOT SHOP
// ========================================

app.post('/api/shop/buy-robot', async (req, res) => {
    const { userId, robotId, price } = req.body;
    console.log('🛍️ Buy robot:', { userId, robotId, price });
    try {
        const [userRows] = await pool.execute(
            'SELECT id, coins, owned_robots FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];
        if (user.coins < price) {
            return res.json({ success: false, message: `Not enough coins! Need ${price - user.coins} more.` });
        }
        let ownedRobots = [];
        if (user.owned_robots) {
            try {
                ownedRobots = JSON.parse(user.owned_robots);
            } catch (e) {
                ownedRobots = user.owned_robots.split(',').filter(Boolean);
            }
        }
        if (ownedRobots.includes(robotId)) {
            return res.json({ success: false, message: 'You already own this robot!' });
        }
        ownedRobots.push(robotId);
        const updatedOwnedRobots = JSON.stringify(ownedRobots);
        await pool.execute(
            'UPDATE users SET coins = coins - ?, owned_robots = ? WHERE id = ?',
            [price, updatedOwnedRobots, userId]
        );
        const [updatedUserRows] = await pool.execute(
            'SELECT id, username, coins, score, energy, robot_color, owned_robots FROM users WHERE id = ?',
            [userId]
        );
        const updatedUser = updatedUserRows[0];
        console.log('✅ Robot purchased:', robotId);
        res.json({
            success: true,
            message: `Robot unlocked! -${price} coins`,
            robotId: robotId,
            userData: {
                id: updatedUser.id,
                coins: updatedUser.coins,
                score: updatedUser.score,
                energy: updatedUser.energy,
                ownedRobots: JSON.parse(updatedUser.owned_robots || '[]')
            }
        });
    } catch (error) {
        console.error('❌ Error buying robot:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

app.post('/api/shop/select-robot', async (req, res) => {
    const { userId, robotId, robotColor } = req.body;
    console.log('🎨 Select robot:', { userId, robotId, robotColor });
    try {
        const [userRows] = await pool.execute(
            'SELECT id, owned_robots FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];
        let ownedRobots = [];
        if (user.owned_robots) {
            try {
                ownedRobots = JSON.parse(user.owned_robots);
            } catch (e) {
                ownedRobots = user.owned_robots.split(',').filter(Boolean);
            }
        }
        if (!ownedRobots.includes(robotId)) {
            return res.json({ success: false, message: 'You do not own this robot!' });
        }
        await pool.execute('UPDATE users SET robot_color = ? WHERE id = ?', [robotColor, userId]);
        console.log('✅ Robot selected:', robotId);
        res.json({ success: true, message: 'Robot equipped!', robotId: robotId, robotColor: robotColor });
    } catch (error) {
        console.error('❌ Error selecting robot:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

app.get('/api/shop/robots/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const [userRows] = await pool.execute(
            'SELECT id, coins, robot_color, owned_robots FROM users WHERE id = ?',
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const user = userRows[0];
        let ownedRobots = [];
        if (user.owned_robots) {
            try {
                ownedRobots = JSON.parse(user.owned_robots);
            } catch (e) {
                ownedRobots = user.owned_robots.split(',').filter(Boolean);
            }
        }
        res.json({ success: true, coins: user.coins, robotColor: user.robot_color, ownedRobots: ownedRobots });
    } catch (error) {
        console.error('❌ Error fetching robots:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// ========================================
// START SERVER
// ========================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);
});
