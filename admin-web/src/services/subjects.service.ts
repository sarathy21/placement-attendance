import { apiClient } from '@/lib/api-client';
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '@/types';

export const subjectsService = {
  async getAll(): Promise<Subject[]> {
    const res = await apiClient.get<Subject[]>('/subjects');
    return res.data;
  },

  async getById(id: string): Promise<Subject> {
    const res = await apiClient.get<Subject>(`/subjects/${id}`);
    return res.data;
  },

  async create(data: CreateSubjectInput): Promise<Subject> {
    const res = await apiClient.post<Subject>('/subjects', data);
    return res.data;
  },

  async update(id: string, data: UpdateSubjectInput): Promise<Subject> {
    const res = await apiClient.patch<Subject>(`/subjects/${id}`, data);
    return res.data;
  },
};
