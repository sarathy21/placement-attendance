import { apiClient } from '@/lib/api-client';
import { Venue, CreateVenueInput, UpdateVenueInput } from '@/types';

export const venuesService = {
  async getAll(): Promise<Venue[]> {
    const res = await apiClient.get<Venue[]>('/venues');
    return res.data;
  },

  async getById(id: string): Promise<Venue> {
    const res = await apiClient.get<Venue>(`/venues/${id}`);
    return res.data;
  },

  async create(data: CreateVenueInput): Promise<Venue> {
    const res = await apiClient.post<Venue>('/venues', data);
    return res.data;
  },

  async update(id: string, data: UpdateVenueInput): Promise<Venue> {
    const res = await apiClient.patch<Venue>(`/venues/${id}`, data);
    return res.data;
  },
};
