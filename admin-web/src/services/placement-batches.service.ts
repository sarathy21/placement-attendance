import { apiClient } from '@/lib/api-client';
import { PlacementBatch, CreatePlacementBatchInput, UpdatePlacementBatchInput } from '@/types';

export const placementBatchesService = {
  async getAll(): Promise<PlacementBatch[]> {
    const res = await apiClient.get<PlacementBatch[]>('/placement-batches');
    return res.data;
  },

  async getById(id: string): Promise<PlacementBatch> {
    const res = await apiClient.get<PlacementBatch>(`/placement-batches/${id}`);
    return res.data;
  },

  async create(data: CreatePlacementBatchInput): Promise<PlacementBatch> {
    const res = await apiClient.post<PlacementBatch>('/placement-batches', data);
    return res.data;
  },

  async update(id: string, data: UpdatePlacementBatchInput): Promise<PlacementBatch> {
    const res = await apiClient.patch<PlacementBatch>(`/placement-batches/${id}`, data);
    return res.data;
  },

  async delete(id: string): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/placement-batches/${id}`);
    return res.data;
  },
};
