

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

    // 1. בדיקת פרטיות
    if (privacySettings.isPhonePublic || privacySettings.isAddressPublic) {
        return res.status(400).json({ 
            success: false, 
            message: "Sharing phone or address is too risky. Doll creation failed!" 
        });
    }

    try {
        // 2. קריאה ל-Gemini API
        const prompt = `Create a whimsical and child-friendly name and a short, cute description (max 20 words) for a doll based on this request: "${dollDescription}". Format: {"name": "Doll Name", "description": "Doll Description"}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // נסה לנתח את הטקסט ל-JSON (Gemini לא תמיד מחזירה JSON מושלם)
        let dollDetails;
        try {
            dollDetails = JSON.parse(text.replace(/```json|```/g, '').trim());
        } catch (parseError) {
            console.error("Failed to parse Gemini response:", text, parseError);
            dollDetails = { name: `${dollDescription} Doll`, description: "A unique doll!" };
        }

        // 3. שמירת הבובה (imageUrl ריק או תמונת placeholder)
        const newDoll = {
            id: `doll_${Date.now()}`,
            name: dollDetails.name,
            description: dollDetails.description,
            imageUrl: `/dolls/${Math.floor(Math.random() * 5) + 1}.png`,
            privacyApproved: true,
            createdAt: new Date()
        };
        userData.generatedDolls.push(newDoll);

        // 4. החזרת תשובה חיובית
        res.json({ success: true, doll: newDoll, message: "Doll created successfully!" });

    } catch (error) {
        console.error("Gemini API or server error:", error);
        res.status(500).json({ success: false, message: "Failed to generate doll. Try again later." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
