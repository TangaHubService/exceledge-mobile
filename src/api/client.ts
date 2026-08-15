import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4500/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  // Bypasses the ngrok free-tier interstitial page when API_URL is a *.ngrok-free.dev tunnel.
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
