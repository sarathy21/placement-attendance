import { apiClient } from '@/lib/api-client';
import {
  Staff,
  StaffListResponse,
  GetStaffFilterParams,
  CreateStaffInput,
  UpdateStaffInput,
  UpdateStaffStatusInput,
  ResetStaffPasswordInput,
} from '@/types';

export const staffService = {
  async getAll(params?: GetStaffFilterParams): Promise<StaffListResponse> {
    const res = await apiClient.get<StaffListResponse>('/staff', { params });
    return res.data;
  },

  async getById(id: string): Promise<Staff> {
    const res = await apiClient.get<Staff>(`/staff/${id}`);
    return res.data;
  },

  async create(data: CreateStaffInput): Promise<Staff> {
    const res = await apiClient.post<Staff>('/staff', data);
    return res.data;
  },

  async update(id: string, data: UpdateStaffInput): Promise<Staff> {
    const res = await apiClient.patch<Staff>(`/staff/${id}`, data);
    return res.data;
  },

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<Staff> {
    const payload: UpdateStaffStatusInput = { status };
    const res = await apiClient.patch<Staff>(`/staff/${id}/status`, payload);
    return res.data;
  },

  async resetPassword(id: string, password: string): Promise<{ message: string }> {
    const payload: ResetStaffPasswordInput = { password };
    const res = await apiClient.post<{ message: string }>(`/staff/${id}/reset-password`, payload);
    return res.data;
  },
};
