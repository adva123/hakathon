import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import OpenAI from 'openai';
import pool from '../db/db.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));
app.use(express.json());
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
        // בדוק אם המשתמש כבר קיים
        const [existingUsers] = await pool.execute(
            'SELECT id, username, email, score, coins, energy FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            // משתמש קיים - החזר את הפרטים שלו
            const user = existingUsers[0];
            console.log('✅ Existing user found:', user.id);
            
            return res.json({
                success: true,
                user: user,
                message: 'Welcome back!'
            });
        }

        // משתמש חדש - צור אותו
        const [insertResult] = await pool.execute(
            'INSERT INTO users (username, email, score, coins, energy) VALUES (?, ?, ?, ?, ?)',
            [username, email, 0, 50, 100]
        );

        const newUserId = insertResult.insertId;
        console.log('✅ New user created:', newUserId);

        // טען את המשתמש החדש
        const [newUserRows] = await pool.execute(
            'SELECT id, username, email, score, coins, energy FROM users WHERE id = ?',
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

// Get user data by ID
app.get('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const [rows] = await pool.execute(
            'SELECT id, username, email, score, coins, energy FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        res.json({ 
            success: true, 
            user: rows[0] 
        });
        
    } catch (err) {
        console.error('❌ Error loading user:', err);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});
app.post('/api/dolls/generate', async (req, res) => {
    const { dollDescription, privacySettings, userId } = req.body;

    console.log('🎭 Generate request:', { dollDescription, userId });

    // ========================================
    // 1. SAFETY CHECK
    // ========================================
    const forbiddenPattern = /(05\d|02\d|03\d|04\d|08\d|09\d)-?\d{7}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const forbiddenWords = ['bad', 'inappropriate']; // Add your list
    
    const containsInfo = forbiddenPattern.test(dollDescription);
    const containsBadWords = forbiddenWords.some(word => dollDescription.toLowerCase().includes(word));
    const isUnsafe = containsInfo || containsBadWords || privacySettings?.isPhonePublic || privacySettings?.isAddressPublic;

    if (isUnsafe) {
        console.log('⚠️ Unsafe content detected');
        
        // Save blocked doll to DB
        try {
            const blockedImageUrl = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
            
            await pool.execute(
                'INSERT INTO dolls (user_id, name, description, image_url, is_good) VALUES (?, ?, ?, ?, ?)',
                [userId, 'Blocked Content', 'This creation was blocked for safety reasons', blockedImageUrl, 0]
            );
            
            // Penalty: -5 score, -10 energy
            await pool.execute(
                'UPDATE users SET score = score - 5, energy = energy - 10 WHERE id = ?',
                [userId]
            );
            
        } catch (dbError) {
            console.error('❌ DB error saving blocked doll:', dbError);
        }
        
        return res.json({
            success: true,
            isUnsafe: true,
            message: "⚠️ Privacy violation: Please do not share personal info!",
            doll: { 
                id: 'blocked_' + Date.now(),
                name: "Blocked Content", 
                description: "Unsafe content",
                imageUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png'
            }
        });
    }

    // ========================================
    // 2. PREPARE DOLL DETAILS
    // ========================================
    try {
        const dollName = `${dollDescription.substring(0, 20)} Doll`;
        const dollDesc = dollDescription || "A unique AI creation";
        const imagePrompt = `A cute 3D pixar-style character of a child. Details: ${dollDescription}`;

        console.log('🎨 Creating image with DALL-E...');

        // ========================================
        // 3. GENERATE IMAGE WITH DALL-E 3
        // ========================================
        let imageUrl = '';
        let generationMethod = 'DALL-E 3';
        
        try {
            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: imagePrompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json" // Base64 format
            });

            const base64Image = response.data[0].b64_json;
            imageUrl = `data:image/png;base64,${base64Image}`;
            
            console.log('✅ DALL-E image created (base64)');
            
        } catch (dalleError) {
            console.error('❌ DALL-E error:', dalleError.message);
            
            // Fallback to placeholder if DALL-E fails
            imageUrl = `https://via.placeholder.com/1024/6366f1/ffffff?text=${encodeURIComponent(dollName)}`;
            generationMethod = 'Placeholder (DALL-E failed)';
        }

        // ========================================
        // 4. SAVE TO DATABASE (dolls table)
        // ========================================
        console.log('💾 Saving doll to database...');
        
        const [dollResult] = await pool.execute(
            'INSERT INTO dolls (user_id, name, description, image_url, is_good) VALUES (?, ?, ?, ?, ?)',
            [userId, dollName, dollDesc, imageUrl, 1] // is_good = 1 (safe doll)
        );

        const newDollId = dollResult.insertId;
        console.log('✅ Doll saved to DB with ID:', newDollId);

        // ========================================
        // 5. UPDATE USER RESOURCES (users table)
        // ========================================
        console.log('💰 Updating user resources...');
        
        await pool.execute(
            'UPDATE users SET score = score + 10, coins = coins + 10 WHERE id = ?',
            [userId]
        );

        // ========================================
        // 6. FETCH UPDATED USER DATA
        // ========================================
        const [updatedUserRows] = await pool.execute(
            'SELECT id, username, email, score, coins, energy FROM users WHERE id = ?',
            [userId]
        );

        const updatedUser = updatedUserRows[0];
        console.log('✅ User resources updated:', updatedUser);

        // ========================================
        // 7. SEND RESPONSE
        // ========================================
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
            message: `✨ Doll created with ${generationMethod}! +10 points & +10 coins!`
        });

    } catch (error) {
        console.error("❌ Server error during generation:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to generate doll. Please try again.",
            error: error.message 
        });
    }
});

// ========================================
// HELPER: Get all dolls for a user
// ========================================
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

// ========================================
// HELPER: Delete a doll
// ========================================
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);
});