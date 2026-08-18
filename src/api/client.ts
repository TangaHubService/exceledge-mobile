import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4500/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  // Bypasses the ngrok free-tier interstitial page when API_URL is a *.ngrok-free.dev tunnel.
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

// This client deliberately has no auth interceptors. Using it for refresh
// avoids an infinite interceptor loop if the refresh token itself is invalid.
const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'ngrok-skip-browser-warning': 'true' },
});

let refreshPromise: Promise<string> | null = null;

function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false;
  return [
    '/auth/login',
    '/auth/signup',
    '/auth/refresh',
    '/auth/request-password-reset',
    '/auth/verify-password-reset-code',
    '/auth/reset-password',
  ].some((path) => url.includes(path));
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error('No refresh token is available.');

  const { data } = await refreshClient.post<RefreshResponse>('/auth/refresh', { refreshToken });
  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error('The server returned an invalid refresh response.');
  }

  // Do not restore an old session if the user logged out or signed into a new
  // account while this refresh request was in flight.
  if (useAuthStore.getState().refreshToken !== refreshToken) {
    throw new Error('The authentication session changed during refresh.');
  }

  await useAuthStore.getState().updateTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequestConfig | undefined;
    const state = useAuthStore.getState();
    const authorization = request?.headers?.Authorization;
    const requestAccessToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : null;
    const belongsToCurrentSession = !requestAccessToken || requestAccessToken === state.accessToken;
    const isProtectedAuthFailure =
      error.response?.status === 401 &&
      !!request &&
      !isPublicAuthRequest(request.url) &&
      belongsToCurrentSession;
    const canRefresh =
      isProtectedAuthFailure &&
      !request._retry &&
      !!state.refreshToken;

    if (!canRefresh) {
      // No refresh token means there is no recoverable session. A 401 after a
      // refresh retry also confirms that the renewed session is unusable.
      if (isProtectedAuthFailure && (!state.refreshToken || request._retry)) {
        await useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }

    request._retry = true;

    try {
      // All requests that fail together wait for the same refresh. This is
      // required because the backend rotates and invalidates refresh tokens.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      return apiClient(request);
    } catch (refreshError) {
      const refreshStatus = (refreshError as AxiosError)?.response?.status;
      const tokenWasRejected = refreshStatus === 400 || refreshStatus === 401 || refreshStatus === 403;

      // Keep the stored session during network/server outages so the user can
      // retry later. Clear it only when the backend confirms it is invalid.
      if (tokenWasRejected && useAuthStore.getState().refreshToken === state.refreshToken) {
        await useAuthStore.getState().logout();
      }
      return Promise.reject(refreshError);
    }
  }
);
