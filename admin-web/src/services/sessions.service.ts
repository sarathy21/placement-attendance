import { apiClient } from '@/lib/api-client';

export interface ClassSessionSummary {
  id: string;
  sessionCode: string;
  topic: string;
  scheduledDate: string;
  status: string;
  subject?: {
    code: string;
    title: string;
  };
  venue?: {
    name: string;
  };
}

export interface SessionsListResponse {
  data: ClassSessionSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const sessionsService = {
  async getAll(params?: { page?: number; limit?: number }): Promise<SessionsListResponse> {
    const res = await apiClient.get<SessionsListResponse>('/sessions', { params });
    return res.data;
  },
};
