import { apiClient } from '@/lib/api-client';
import { Batch, CreateBatchInput, UpdateBatchInput } from '@/types';

export const batchesService = {
  async getAll(courseId?: string): Promise<Batch[]> {
    const params = courseId ? { courseId } : undefined;
    const res = await apiClient.get<Batch[]>('/batches', { params });
    return res.data;
  },

  async getById(id: string): Promise<Batch> {
    const res = await apiClient.get<Batch>(`/batches/${id}`);
    return res.data;
  },

  async create(data: CreateBatchInput): Promise<Batch> {
    const res = await apiClient.post<Batch>('/batches', data);
    return res.data;
  },

  async update(id: string, data: UpdateBatchInput): Promise<Batch> {
    const res = await apiClient.patch<Batch>(`/batches/${id}`, data);
    return res.data;
  },
};
