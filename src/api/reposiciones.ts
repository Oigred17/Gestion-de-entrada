import apiClient from './client';
import type { Reposicion, ReposicionCreate } from '../types';

export const reposicionesApi = {
  async getAll(alumno_id?: number): Promise<Reposicion[]> {
    const params: Record<string, string | number> = {};
    if (alumno_id !== undefined) params.alumno_id = alumno_id;
    const response = await apiClient.get<Reposicion[]>('/reposiciones', { params });
    return response.data;
  },

  async getById(id: number): Promise<Reposicion> {
    const response = await apiClient.get<Reposicion>(`/reposiciones/${id}`);
    return response.data;
  },

  async create(data: ReposicionCreate): Promise<Reposicion> {
    const response = await apiClient.post<Reposicion>('/reposiciones', data);
    return response.data;
  },

  async update(id: number, data: Partial<ReposicionCreate>): Promise<Reposicion> {
    const response = await apiClient.put<Reposicion>(`/reposiciones/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/reposiciones/${id}`);
  },
};
