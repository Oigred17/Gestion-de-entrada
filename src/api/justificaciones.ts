import apiClient from './client';
import type { Justificacion, JustificacionCreate } from '../types';

export const justificacionesApi = {
  async getAll(alumno_id?: number, grupo_id?: number): Promise<Justificacion[]> {
    const params: Record<string, string | number> = {};
    if (alumno_id !== undefined) params.alumno_id = alumno_id;
    if (grupo_id !== undefined) params.grupo_id = grupo_id;
    const response = await apiClient.get<Justificacion[]>('/justificaciones', { params });
    return response.data;
  },

  async getById(id: number): Promise<Justificacion> {
    const response = await apiClient.get<Justificacion>(`/justificaciones/${id}`);
    return response.data;
  },

  async create(data: JustificacionCreate): Promise<Justificacion> {
    const response = await apiClient.post<Justificacion>('/justificaciones', data);
    return response.data;
  },

  async update(id: number, data: Partial<JustificacionCreate>): Promise<Justificacion> {
    const response = await apiClient.put<Justificacion>(`/justificaciones/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/justificaciones/${id}`);
  },
};
