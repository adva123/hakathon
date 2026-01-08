import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔑 API Keys
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 🎨 DALL-E Setup (אופציונלי - רק אם יש OpenAI API key)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ DALL-E 3 enabled');
} else {
    console.log('⚠️ No OpenAI key - using Pollinations (free)');
}

let userData = {
    coins: 100,
    ownedRobots: ['default'],
    selectedRobotId: 'default',
    generatedDolls: []
};

/**
 * 🎨 יצירת בובה עם DALL-E 3 או Pollinations
 */
app.post('/api/dolls/generate', async (req, res) => {
    const { dollDescription, privacySettings, useDALLE = false } = req.body;

    console.log('📝 Received doll request:', dollDescription);
    console.log('🎨 Using:', useDALLE && openai ? 'DALL-E 3' : 'Pollinations (FREE)');

    // 1. Safety check
    const isUnsafe = dollDescription.toLowerCase().includes("קללה") || 
                     privacySettings.isPhonePublic ||
                     privacySettings.isAddressPublic;
    
    if (isUnsafe) {
        console.log('🚫 Unsafe content detected');
        const unsafeDoll = {
            id: `doll_${Date.now()}`,
            name: "⚠️ Blocked Content",
            description: "Content blocked for safety reasons.",
            imageUrl: "https://via.placeholder.com/500/ff0000/ffffff?text=BLOCKED",
            blur: true,
            privacyApproved: false,
            createdAt: new Date()
        };
        userData.generatedDolls.push(unsafeDoll);
        return res.json({ 
            success: true, 
            isUnsafe: true, 
            doll: unsafeDoll, 
            message: "⚠️ Content blocked due to safety concerns." 
        });
    }

    try {
        console.log('🤖 Step 1: Gemini - Generate doll details...');
        
        // 2. Gemini: יוצר שם ותיאור
        const geminiPrompt = `Create a whimsical, child-friendly name and description for a doll based on: "${dollDescription}". \nReturn ONLY valid JSON: {"name": "Name", "description": "Short description (max 25 words)"}`;

        let dollDetails = { 
            name: `${dollDescription.substring(0, 20)} Doll`, 
            description: "A unique doll!" 
        };

        try {
            const result = await model.generateContent(geminiPrompt);
            const text = result.response.text().replace(/```json\n?|```\n?/g, '').trim();
            dollDetails = JSON.parse(text);
            console.log('✅ Doll details:', dollDetails);
        } catch (err) {
            console.warn('⚠️ Using fallback details');
        }

        console.log('🎨 Step 2: Generate image prompt...');

        // 3. יצירת prompt לתמונה
        const imagePromptRequest = `Create a detailed DALL-E prompt for a cute toy doll based on: "${dollDescription}". \nRequirements:\n- Child-friendly, whimsical, colorful\n- Describe appearance clearly\n- Mention "toy doll", "cute design"\n- Under 60 words\nReturn ONLY the prompt.`;

        let imagePrompt = `cute colorful toy doll, ${dollDescription}, whimsical design, white background`;

        try {
            const result = await model.generateContent(imagePromptRequest);
            imagePrompt = result.response.text().trim();
            console.log('🖼️ Image prompt:', imagePrompt);
        } catch (err) {
            console.warn('⚠️ Using fallback prompt');
        }

        let imageUrl;
        let generationMethod;

        // 4. 🎨 יצירת התמונה
        if (useDALLE && openai) {
            // DALL-E 3 (איכות גבוהה, בתשלום)
            console.log('🎨 Generating with DALL-E 3...');
            try {
                const response = await openai.images.generate({
                    model: "dall-e-3",
                    prompt: imagePrompt,
                    n: 1,
                    size: "1024x1024",
                    quality: "standard", // או "hd" לאיכות גבוהה יותר (יותר יקר)
                    style: "vivid" // או "natural"
                });
                imageUrl = response.data[0].url;
                generationMethod = 'DALL-E 3';
                console.log('✅ DALL-E image created:', imageUrl);
            } catch (dalleError) {
                console.error('❌ DALL-E error:', dalleError.message);
                // Fallback to Pollinations
                const encodedPrompt = encodeURIComponent(imagePrompt);
                imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;
                generationMethod = 'Pollinations (fallback)';
            }
        } else {
            // Pollinations (חינמי!)
            console.log('🎨 Generating with Pollinations (FREE)...');
            const encodedPrompt = encodeURIComponent(imagePrompt);
            imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;
            generationMethod = 'Pollinations';
            console.log('✅ Pollinations image created');
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
        console.log('✅ Doll created successfully!');

        res.json({ 
            success: true, 
            isUnsafe: false, 
            doll: newDoll, 
            message: `✨ Doll created with ${generationMethod}!` 
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
    console.log(`🎨 Image generation: ${openai ? 'DALL-E 3 + Pollinations' : 'Pollinations (FREE)'}`);
});
