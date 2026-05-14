/**
 * FILE: src/lib/axios.ts
 * PURPOSE: Tạo Axios instance dùng chung toàn app.
 *
 * GIẢI THÍCH VỀ AXIOS INTERCEPTORS:
 * - Request interceptor: tự động đính kèm JWT token vào mọi request.
 * - Response interceptor: xử lý lỗi tập trung (401 → redirect login, etc.).
 * - Không cần copy-paste header Authorization vào từng API call nữa.
 *
 * BEST PRACTICE:
 * - Chỉ tạo 1 axios instance duy nhất (singleton pattern).
 * - Tập trung error handling thay vì try/catch rải khắp nơi.
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/constants';

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── REQUEST INTERCEPTOR ─────────────────────────────────────────
// Chạy TRƯỚC khi request gửi đi — thêm token vào header
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lấy token từ localStorage (hoặc từ Zustand store)
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ── RESPONSE INTERCEPTOR ────────────────────────────────────────
// Chạy SAU khi nhận response — xử lý lỗi tập trung
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Response thành công → trả về nguyên
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token hết hạn → xóa token và redirect login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }

    // Trả lỗi để React Query hoặc component xử lý tiếp
    return Promise.reject(error);
  }
);

export default axiosInstance;
