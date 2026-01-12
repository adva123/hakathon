export const cleanText = (text) => {
  // Remove special characters, trim, etc.
  return text.replace(/[^\w\s\u0590-\u05FF]/g, '').trim();
};

export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
};
