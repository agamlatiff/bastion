import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, RefreshTokenResponse } from '../types/auth';

// 1. Create Base Axios Instance
export const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// 2. Request Interceptor: Automatically attach Bearer token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Variables for managing the concurrent 401 Refresh Queue
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token);
        }
    });
    failedQueue = [];
};

// 3. Response Interceptor: Silent Token Refresh & Retry
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Ignore if not 401 Unauthorized or if already retried once
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Do not attempt refresh if the failed call was the login or refresh endpoint itself
        if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error);
        }

        // If a refresh is already in flight, queue this request until refresh finishes
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            })
                .then((token) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return api(originalRequest);
                })
                .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            isRefreshing = false;
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        try {
            // Call refresh endpoint with raw axios to bypass interceptors
            const { data } = await axios.post<ApiResponse<RefreshTokenResponse>>(
                '/api/v1/auth/refresh',
                { refresh_token: refreshToken }
            );

            const newAccessToken = data.data?.access_token;
            const newRefreshToken = data.data?.refresh_token;

            if (!newAccessToken) {
                throw new Error('No access token in refresh response');
            }

            // Store new rotated tokens
            localStorage.setItem('access_token', newAccessToken);
            if (newRefreshToken) {
                localStorage.setItem('refresh_token', newRefreshToken);
            }

            // Update default auth header
            api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            // Release all queued requests with the new token
            processQueue(null, newAccessToken);
            isRefreshing = false;

            // Retry the original request
            return api(originalRequest);
        } catch (refreshErr) {
            // Refresh token expired or revoked -> force logout
            processQueue(refreshErr as AxiosError, null);
            isRefreshing = false;

            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';

            return Promise.reject(refreshErr);
        }
    }
);
