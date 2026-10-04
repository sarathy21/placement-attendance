import axios from 'axios';
import { User } from '@/types';

export const authService = {
  async login(credentials: Record<string, string>): Promise<{ user: User }> {
    const res = await axios.post('/api/auth/login', credentials);
    return res.data;
  },

  async logout(): Promise<void> {
    await axios.post('/api/auth/logout');
  },

  async getCurrentUser(): Promise<User> {
    const res = await axios.get('/api/auth/me');
    return res.data;
  },
};
