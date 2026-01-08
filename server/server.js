

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
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
app.use('/images', express.static(path.join(__dirname, 'images')));

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

let userData = {
    coins: 100,
    ownedRobots: ['default'],
    selectedRobotId: 'default',
    generatedDolls: []
};

// NEW: Endpoint ליצירת בובה

app.post('/api/dolls/generate', async (req, res) => {
    const { dollDescription, privacySettings } = req.body;

    console.log('📝 Received doll request:', dollDescription);

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
        console.log('🤖 Step 1: Calling Gemini to generate doll details...');
        
        // 2. Gemini: יוצר שם ותיאור לבובה
        const geminiPrompt = `Create a whimsical, child-friendly name and a short cute description (max 25 words) for a doll based on this request: "${dollDescription}". \n\nReturn ONLY valid JSON in this exact format:\n{"name": "Doll Name", "description": "Short cute description"}`;

        let dollDetails = { 
            name: `${dollDescription.substring(0, 20)} Doll`, 
            description: "A unique and special doll!" 
        };

        try {
            const result = await model.generateContent(geminiPrompt);
            const response = await result.response;
            const text = response.text();
            console.log('✅ Gemini response:', text);

            // Parse the JSON response
            const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
            dollDetails = JSON.parse(cleanText);
            console.log('📦 Parsed doll details:', dollDetails);
        } catch (geminiError) {
            console.error('⚠️ Gemini error (using fallback):', geminiError.message);
        }

        console.log('🎨 Step 2: Creating AI prompt for image...');

        // 3. יצירת prompt מתאים ליצירת תמונה
        // Gemini יעזור לנו ליצור prompt טוב לתמונה
        const imagePromptRequest = `Based on this doll description: "${dollDescription}", create a detailed image generation prompt for a cute toy doll. \n\nThe prompt should be:\n- Child-friendly and whimsical\n- Describe physical appearance clearly\n- Mention "toy doll", "cute", "colorful"\n- Keep it under 60 words\n\nReturn ONLY the prompt text, nothing else.`;

        let imagePrompt = `cute colorful toy doll, ${dollDescription}, friendly design, isolated on white background, high quality`;

        try {
            const result = await model.generateContent(imagePromptRequest);
            const response = await result.response;
            imagePrompt = response.text().trim();
            console.log('🖼️ Generated image prompt:', imagePrompt);
        } catch (err) {
            console.warn('⚠️ Using fallback image prompt');
        }

        // 4. 🎨 יצירת URL לתמונה מ-Pollinations.ai (חינמי!)
        // זה פשוט URL - אין צורך ב-API key!
        const encodedPrompt = encodeURIComponent(imagePrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;
        
        console.log('✅ Image URL created:', imageUrl);

        // 5. יצירת אובייקט הבובה
        const newDoll = {
            id: `doll_${Date.now()}`,
            name: dollDetails.name,
            description: dollDetails.description,
            imageUrl: imageUrl,
            imagePrompt: imagePrompt, // שמירת ה-prompt לעיון
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
            message: "✨ Doll created successfully! The AI is generating your image..." 
        });

    } catch (error) {
        console.error("❌ Server error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to generate doll. Please try again." 
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
