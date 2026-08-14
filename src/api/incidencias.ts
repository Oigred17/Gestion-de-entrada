import apiClient from './client';
import type { Incidencia, IncidenciaCreate } from '../types';

export const incidenciasApi = {
  async getAll(params?: { alumno_id?: number; estado?: string }): Promise<Incidencia[]> {
    const response = await apiClient.get<Incidencia[]>('/incidencias', { params });
    return response.data;
  },

  async getById(id: number): Promise<Incidencia> {
    const response = await apiClient.get<Incidencia>(`/incidencias/${id}`);
    return response.data;
  },

  async create(data: IncidenciaCreate): Promise<Incidencia> {
    const response = await apiClient.post<Incidencia>('/incidencias', data);
    return response.data;
  },

  async update(id: number, data: Partial<Incidencia>): Promise<Incidencia> {
    const response = await apiClient.put<Incidencia>(`/incidencias/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/incidencias/${id}`);
  },
};
