import axios from 'axios';

import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue = [];

async function refreshSession() {
  const { refreshToken, setSession, clearSession, user } = useAuthStore.getState();
  if (!refreshToken) {
    clearSession();
    throw new Error('Missing refresh token');
  }
  try {
    const response = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const { access_token: newAccess, refresh_token: newRefresh } = response.data;
    setSession({
      user,
      accessToken: newAccess,
      refreshToken: newRefresh || refreshToken,
    });
    return newAccess;
  } catch (error) {
    clearSession();
    throw error;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject, originalRequest });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const newAccess = await refreshSession();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        refreshQueue.forEach(({ resolve }) => {
          resolve(api(originalRequest));
        });
        refreshQueue = [];
        return api(originalRequest);
      } catch (refreshError) {
        refreshQueue.forEach(({ reject }) => reject(refreshError));
        refreshQueue = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
