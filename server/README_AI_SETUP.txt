# Quick Start: AI Doll Image Generation

1. Get your Gemini API key from https://aistudio.google.com/app/apikey and paste it in .env as GEMINI_API_KEY.
2. (Optional) Get your OpenAI API key from https://platform.openai.com/api-keys and add as OPENAI_API_KEY=sk-... for DALL-E 3 support.
3. Run:
   cd server
   npm install openai
4. Start the server:
   node server.js

- By default, Pollinations.ai is used for free AI images.
- Toggle DALL-E 3 in the UI for premium images if you have an OpenAI key.
- All image URLs are direct and do not require /public in the path.
- Dolls are saved in Mysql and can be reloaded.
