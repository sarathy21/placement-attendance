import axios, { AxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/proxy',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = window.location.origin + '/login?expired=1';
      }
    }

    const message = error.response?.data?.message;
    const errorMessage = Array.isArray(message)
      ? message.join(', ')
      : message || error.response?.data?.error || error.message || 'An unexpected error occurred';

    return Promise.reject(new Error(errorMessage));
  }
);
