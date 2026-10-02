import { apiClient } from '@/lib/api-client';
import { Department, CreateDepartmentInput, UpdateDepartmentInput } from '@/types';

export const departmentsService = {
  async getAll(): Promise<Department[]> {
    const res = await apiClient.get<Department[]>('/departments');
    return res.data;
  },

  async getById(id: string): Promise<Department> {
    const res = await apiClient.get<Department>(`/departments/${id}`);
    return res.data;
  },

  async create(data: CreateDepartmentInput): Promise<Department> {
    const res = await apiClient.post<Department>('/departments', data);
    return res.data;
  },

  async update(id: string, data: UpdateDepartmentInput): Promise<Department> {
    const res = await apiClient.patch<Department>(`/departments/${id}`, data);
    return res.data;
  },
};
