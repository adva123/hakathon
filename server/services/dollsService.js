// import OpenAI from "openai";
// import dotenv from 'dotenv';
// dotenv.config();

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export const generateDallEImage = async (description) => {
//   try {
//     const response = await openai.images.generate({
//       model: "dall-e-3", // או dall-e-2 לחיסכון בעלויות
//       prompt: `A cute 3D pixar-style character of a child. Details: ${description}`,
//       n: 1,
//       size: "1024x1024",
//       response_format: "b64_json", // בקשת התמונה כפורמט בינארי (Base64)
//     });

//     const base64Image = response.data[0].b64_json;
//     return `data:image/png;base64,${base64Image}`;
//   } catch (error) {
//     console.error("DALL-E Error:", error);
//     throw error;
//   }
// };

// const generateDoll = async (userId, dollDescription, privacySettings, useDALLE = false) => {
//   if (!userDolls[userId]) userDolls[userId] = [];
  
//   // Safety check
//   const isUnsafe = dollDescription.toLowerCase().includes("קללה") || 
//     privacySettings?.isPhonePublic ||
//     privacySettings?.isAddressPublic;
    
//   if (isUnsafe) {
//     const unsafeDoll = {
//       id: `doll_${Date.now()}`,
//       name: "⚠️ Blocked Content",
//       description: "Content blocked for safety reasons.",
//       imageUrl: "https://via.placeholder.com/500/ff0000/ffffff?text=BLOCKED",
//       blur: true,
//       privacyApproved: false,
//       createdAt: new Date()
//     };
//     userDolls[userId].push(unsafeDoll);
//     return { 
//       success: true, 
//       isUnsafe: true, 
//       doll: unsafeDoll, 
//       message: "⚠️ Content blocked due to safety concerns." 
//     };
//   }

//   // Step 1: Gemini - Generate doll details (זה ממשיך לעבוד!)
//   const geminiPrompt = `Create a whimsical, child-friendly name and a short cute description (max 25 words) for a doll based on this request: "${dollDescription}". Return ONLY valid JSON in this exact format:\n{"name": "Doll Name", "description": "Short cute description"}`;
  
//   let dollDetails = { 
//     name: `${dollDescription.substring(0, 20)} Doll`, 
//     description: "A unique and special doll!" 
//   };
  
//   try {
//     const result = await model.generateContent(geminiPrompt);
//     const response = await result.response;
//     const text = response.text();
//     const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
//     dollDetails = JSON.parse(cleanText);
//     console.log('✅ Gemini generated details:', dollDetails);
//   } catch (geminiError) {
//     console.error('❌ Gemini text generation error:', geminiError);
//   }


//   // Step 2: Gemini - Generate image (base64 only, no OpenAI)
//   let imageUrl = null;
//   let generationMethod = 'Gemini';
//   try {
//     const prompt = `A cute, whimsical 3D Pixar-style toy doll character. ${dollDescription}. Colorful, high quality, detailed, professional toy photography, soft studio lighting, white background, child-friendly design.`;
//     const result = await model.generateContent([
//       { text: prompt }
//     ]);
//     const candidates = result.response.candidates;
//     if (candidates && candidates.length > 0) {
//       const parts = candidates[0].content.parts;
//       if (parts && parts.length > 0) {
//         const imagePart = parts.find(p => p.inlineData && p.inlineData.data);
//         if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
//           const base64Image = imagePart.inlineData.data;
//           const mimeType = imagePart.inlineData.mimeType || 'image/png';
//           imageUrl = `data:${mimeType};base64,${base64Image}`;
//           generationMethod = 'Gemini';
//         } else {
//           generationMethod = 'Gemini (error)';
//         }
//       } else {
//         generationMethod = 'Gemini (error)';
//       }
//     } else {
//       generationMethod = 'Gemini (error)';
//     }
//   } catch (err) {
//     console.error('❌ Gemini image generation failed:', err);
//     imageUrl = null;
//     generationMethod = 'Gemini (error)';
//   }

//   const newDoll = {
//     id: `doll_${Date.now()}`,
//     name: dollDetails.name,
//     description: dollDetails.description,
//     imageUrl: imageUrl || '',
//     imagePrompt: dollDescription,
//     generationMethod: generationMethod,
//     blur: false,
//     privacyApproved: true,
//     isGood: true,
//     quality: 'good',
//     createdAt: new Date()
//   };
//   console.log('🎉 Final doll object:', newDoll);
//   userDolls[userId].push(newDoll);
//   return {
//     success: true,
//     isUnsafe: false,
//     doll: newDoll,
//     message: `✨ Doll created with ${generationMethod}!`
//   };
// };

// const getUserDolls = async (userId) => {
//   return userDolls[userId] || [];
// };

// export default {
//   generateDoll,
//   getUserDolls,
// };
import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

// אתחול OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// אובייקט זמני לשמירת בובות (במקום DB)
const userDolls = {};

/**
 * פונקציה ייעודית ליצירת תמונה ב-DALL-E והחזרת Base64
 */
export const generateDallEImage = async (description) => {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3", // ניתן להשתמש ב-dall-e-2 לחיסכון בעלויות
      prompt: `A cute 3D Pixar-style toy doll character. ${description}. Colorful, high quality, professional toy photography, white background.`,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json", 
    });

    const base64Image = response.data[0].b64_json;
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error("❌ DALL-E Error:", error.message);
    throw error;
  }
};

/**
 * הפונקציה המרכזית ליצירת בובה
 */
const generateDoll = async (userId, dollDescription, privacySettings) => {
  if (!userDolls[userId]) userDolls[userId] = [];
  
  // בדיקת בטיחות בסיסית
  const isUnsafe = dollDescription.toLowerCase().includes("קללה") || 
                   privacySettings?.isPhonePublic ||
                   privacySettings?.isAddressPublic;
    
  if (isUnsafe) {
    const unsafeDoll = {
      id: `doll_${Date.now()}`,
      name: "⚠️ תוכן חסום",
      description: "התוכן נחסם מטעמי בטיחות.",
      imageUrl: "",
      blur: true,
      privacyApproved: false,
      createdAt: new Date()
    };
    userDolls[userId].push(unsafeDoll);
    return { success: true, isUnsafe: true, doll: unsafeDoll, message: "⚠️ התוכן נחסם." };
  }

  // שלב 1: פרטי הבובה (שמות ותיאור - יצרנו לוגיקה מקומית כדי לא להסתמך על Gemini שנופל)
  const dollDetails = { 
    name: `${dollDescription.substring(0, 15)}...`, 
    description: `בובה מיוחדת שנוצרה עבורך לפי התיאור: ${dollDescription}` 
  };

  // שלב 2: יצירת התמונה עם DALL-E (החלפנו את Gemini)
  let imageUrl = "";
  let generationMethod = 'DALL-E 3';

  try {
    console.log('🎨 Starting DALL-E image generation...');
    imageUrl = await generateDallEImage(dollDescription);
    console.log('✅ Image generated successfully (Base64 ready)');
  } catch (err) {
    console.error('❌ DALL-E generation failed:', err);
    imageUrl = "";
    generationMethod = 'Error';
  }

  const newDoll = {
    id: `doll_${Date.now()}`,
    name: dollDetails.name,
    description: dollDetails.description,
    imageUrl: imageUrl, // מחרוזת ה-Base64 הארוכה
    imagePrompt: dollDescription,
    generationMethod: generationMethod,
    blur: false,
    privacyApproved: true,
    createdAt: new Date()
  };

  userDolls[userId].push(newDoll);
  
  return {
    success: imageUrl !== "",
    isUnsafe: false,
    doll: newDoll,
    message: imageUrl !== "" ? `✨ הבובה נוצרה בהצלחה!` : "שגיאה ביצירת התמונה"
  };
};

const getUserDolls = async (userId) => {
  return userDolls[userId] || [];
};

export default {
  generateDoll,
  getUserDolls,
};