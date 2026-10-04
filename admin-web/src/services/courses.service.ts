import { apiClient } from '@/lib/api-client';
import { Course, CreateCourseInput, UpdateCourseInput } from '@/types';

export const coursesService = {
  async getAll(departmentId?: string): Promise<Course[]> {
    const params = departmentId ? { departmentId } : undefined;
    const res = await apiClient.get<Course[]>('/courses', { params });
    return res.data;
  },

  async getById(id: string): Promise<Course> {
    const res = await apiClient.get<Course>(`/courses/${id}`);
    return res.data;
  },

  async create(data: CreateCourseInput): Promise<Course> {
    const res = await apiClient.post<Course>('/courses', data);
    return res.data;
  },

  async update(id: string, data: UpdateCourseInput): Promise<Course> {
    const res = await apiClient.patch<Course>(`/courses/${id}`, data);
    return res.data;
  },
};
