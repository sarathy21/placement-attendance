import { apiClient } from '@/lib/api-client';
import {
  PlacementDrive,
  DriveRound,
  PlacementDriveListResponse,
  GetPlacementDrivesFilterParams,
  CreatePlacementDriveInput,
  UpdatePlacementDriveInput,
  PlacementDriveStatus,
  CreateDriveRoundInput,
  UpdateDriveRoundInput,
} from '@/types';

export const placementDrivesService = {
  async getAll(params?: GetPlacementDrivesFilterParams): Promise<PlacementDriveListResponse> {
    const res = await apiClient.get<PlacementDriveListResponse>('/placement-drives', { params });
    return res.data;
  },

  async getById(id: string): Promise<PlacementDrive> {
    const res = await apiClient.get<PlacementDrive>(`/placement-drives/${id}`);
    return res.data;
  },

  async create(data: CreatePlacementDriveInput): Promise<PlacementDrive> {
    const res = await apiClient.post<PlacementDrive>('/placement-drives', data);
    return res.data;
  },

  async update(id: string, data: UpdatePlacementDriveInput): Promise<PlacementDrive> {
    const res = await apiClient.patch<PlacementDrive>(`/placement-drives/${id}`, data);
    return res.data;
  },

  async updateStatus(id: string, status: PlacementDriveStatus): Promise<PlacementDrive> {
    const res = await apiClient.patch<PlacementDrive>(`/placement-drives/${id}/status`, { status });
    return res.data;
  },

  async createRound(driveId: string, data: CreateDriveRoundInput): Promise<DriveRound> {
    const res = await apiClient.post<DriveRound>(`/placement-drives/${driveId}/rounds`, data);
    return res.data;
  },

  async updateRound(driveId: string, roundId: string, data: UpdateDriveRoundInput): Promise<DriveRound> {
    const res = await apiClient.patch<DriveRound>(`/placement-drives/${driveId}/rounds/${roundId}`, data);
    return res.data;
  },

  async deleteRound(driveId: string, roundId: string): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/placement-drives/${driveId}/rounds/${roundId}`);
    return res.data;
  },
};
