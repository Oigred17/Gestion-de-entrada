import apiClient from './client';
import type { Rol } from '../types';

export const rolesApi = {
  async getAll(skip = 0, limit = 100): Promise<Rol[]> {
    const response = await apiClient.get<Rol[]>('/roles', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<Rol> {
    const response = await apiClient.get<Rol>(`/roles/${id}`);
    return response.data;
  },
};
