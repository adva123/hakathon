import API from './axiosInstance';

export const buyItem = (userId, itemId) => API.post('/shop/buy', { userId, itemId });
export const getCatalog = () => API.get('/shop/catalog');
