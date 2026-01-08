
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const userDolls = {};

const generateDoll = async (userId, dollDescription, privacySettings, useDALLE = false) => {
  if (!userDolls[userId]) userDolls[userId] = [];
  // Safety check
  const isUnsafe = dollDescription.toLowerCase().includes("קללה") || 
    privacySettings?.isPhonePublic ||
    privacySettings?.isAddressPublic;
  if (isUnsafe) {
    const unsafeDoll = {
      id: `doll_${Date.now()}`,
      name: "⚠️ Blocked Content",
      description: "Content blocked for safety reasons.",
      imageUrl: "https://via.placeholder.com/500/ff0000/ffffff?text=BLOCKED",
      blur: true,
      privacyApproved: false,
      createdAt: new Date()
    };
    userDolls[userId].push(unsafeDoll);
    return { success: true, isUnsafe: true, doll: unsafeDoll, message: "⚠️ Content blocked due to safety concerns." };
  }

  // Step 1: Gemini - Generate doll details
  const geminiPrompt = `Create a whimsical, child-friendly name and a short cute description (max 25 words) for a doll based on this request: "${dollDescription}". \n\nReturn ONLY valid JSON in this exact format:\n{"name": "Doll Name", "description": "Short cute description"}`;
  let dollDetails = { name: `${dollDescription.substring(0, 20)} Doll`, description: "A unique and special doll!" };
  try {
    const result = await model.generateContent(geminiPrompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
    dollDetails = JSON.parse(cleanText);
  } catch (geminiError) {
    // fallback
  }

  // Step 2: Generate image prompt
  const imagePromptRequest = `Based on this doll description: "${dollDescription}", create a detailed image generation prompt for a cute toy doll. \n\nThe prompt should be:\n- Child-friendly and whimsical\n- Describe physical appearance clearly\n- Mention "toy doll", "cute", "colorful"\n- Keep it under 60 words\n\nReturn ONLY the prompt text, nothing else.`;
  let imagePrompt = `cute colorful toy doll, ${dollDescription}, friendly design, isolated on white background, high quality`;
  try {
    const result = await model.generateContent(imagePromptRequest);
    const response = await result.response;
    imagePrompt = response.text().trim();
  } catch (err) {
    // fallback
  }

  let imageUrl;
  let generationMethod;
  if (useDALLE && openai) {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid"
      });
      imageUrl = response.data[0].url;
      generationMethod = 'DALL-E 3';
    } catch (dalleError) {
      const encodedPrompt = encodeURIComponent(imagePrompt);
      imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;
      generationMethod = 'Pollinations (fallback)';
    }
  } else {
    const encodedPrompt = encodeURIComponent(imagePrompt);
    imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;
    generationMethod = 'Pollinations';
  }

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
  userDolls[userId].push(newDoll);
  return { success: true, isUnsafe: false, doll: newDoll, message: `✨ Doll created with ${generationMethod || 'Pollinations'}!` };
};

const getUserDolls = async (userId) => {
  return userDolls[userId] || [];
};

export default {
  generateDoll,
  getUserDolls,
};
