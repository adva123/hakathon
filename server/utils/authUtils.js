import fetch from 'node-fetch';

export const verifyGoogleToken = async (token) => {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  if (!response.ok) return null;
  const data = await response.json();
  return {
    id: data.sub,
    name: data.name,
    email: data.email,
    picture: data.picture,
  };
};
