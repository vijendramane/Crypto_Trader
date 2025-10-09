import axios from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'primetrade_token';
const REFRESH_TOKEN_KEY = 'primetrade_refresh_token';

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors and token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { tokens } = response.data.data;
          Cookies.set(TOKEN_KEY, tokens.accessToken, { expires: 1 });
          Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, { expires: 7 });

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        Cookies.remove(TOKEN_KEY);
        Cookies.remove(REFRESH_TOKEN_KEY);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  requestPasswordReset: (email) => api.post('/auth/password/reset-request', { email }),
  resetPassword: (data) => api.post('/auth/password/reset', data),
  logout: () => api.post('/auth/logout'),
};

// Strategies API
export const strategiesAPI = {
  getAll: (params) => api.get('/strategies', { params }),
  getById: (id) => api.get(`/strategies/${id}`),
  create: (data) => api.post('/strategies', data),
  update: (id, data) => api.put(`/strategies/${id}`, data),
  delete: (id) => api.delete(`/strategies/${id}`),
  getUserStrategies: (params) => api.get('/strategies/my', { params }),
  getTop: (limit = 10) => api.get('/strategies/top', { params: { limit } }),
  submitForApproval: (id) => api.post(`/strategies/${id}/submit`),
  updateStatus: (id, data) => api.put(`/strategies/${id}/status`, data),
  getPending: (params) => api.get('/strategies/pending', { params }),
};

export default api;