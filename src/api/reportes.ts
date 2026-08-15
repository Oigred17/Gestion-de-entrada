import apiClient from './client';
import type { Reporte, ReporteCreate } from '../types';

export const reportesApi = {
  async getAll(alumno_id?: number): Promise<Reporte[]> {
    const params: Record<string, string | number> = {};
    if (alumno_id !== undefined) params.alumno_id = alumno_id;
    const response = await apiClient.get<Reporte[]>('/reportes', { params });
    return response.data;
  },

  async getById(id: number): Promise<Reporte> {
    const response = await apiClient.get<Reporte>(`/reportes/${id}`);
    return response.data;
  },

  async create(data: ReporteCreate): Promise<Reporte> {
    const response = await apiClient.post<Reporte>('/reportes', data);
    return response.data;
  },

  async update(id: number, data: Partial<ReporteCreate> & { sancion_cumplida?: boolean }): Promise<Reporte> {
    const response = await apiClient.put<Reporte>(`/reportes/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/reportes/${id}`);
  },
};
