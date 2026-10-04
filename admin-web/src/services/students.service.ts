import { apiClient } from '@/lib/api-client';
import {
  Student,
  StudentListResponse,
  GetStudentsFilterParams,
  UpdateStudentInput,
  UpdateStudentStatusInput,
  StudentImportRow,
  ImportPreviewResponse,
} from '@/types';

export const studentsService = {
  async getAll(params?: GetStudentsFilterParams): Promise<StudentListResponse> {
    const res = await apiClient.get<StudentListResponse>('/students', { params });
    return res.data;
  },

  async getById(id: string): Promise<Student> {
    const res = await apiClient.get<Student>(`/students/${id}`);
    return res.data;
  },

  async update(id: string, data: UpdateStudentInput): Promise<Student> {
    const res = await apiClient.patch<Student>(`/students/${id}`, data);
    return res.data;
  },

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): Promise<Student> {
    const payload: UpdateStudentStatusInput = { status };
    const res = await apiClient.patch<Student>(`/students/${id}/status`, payload);
    return res.data;
  },

  async previewImport(file: File): Promise<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<ImportPreviewResponse>('/students/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async confirmImport(rows: StudentImportRow[]): Promise<{ success: boolean; count: number; message: string }> {
    const res = await apiClient.post<{ success: boolean; count: number; message: string }>(
      '/students/import/confirm',
      { rows }
    );
    return res.data;
  },
};
