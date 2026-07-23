import apiClient from './client';
import type { Retardo, RetardoCreate } from '../types';

export const retardosApi = {
  async getAll(skip = 0, limit = 100): Promise<Retardo[]> {
    const response = await apiClient.get<Retardo[]>('/retardos', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<Retardo> {
    const response = await apiClient.get<Retardo>(`/retardos/${id}`);
    return response.data;
  },

  async create(retardo: RetardoCreate): Promise<Retardo> {
    const response = await apiClient.post<Retardo>('/retardos', retardo);
    return response.data;
  },

  async update(id: number, retardo: Partial<RetardoCreate>): Promise<Retardo> {
    const response = await apiClient.put<Retardo>(`/retardos/${id}`, retardo);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/retardos/${id}`);
  },

  async getByAlumnoId(alumnoId: number): Promise<Retardo[]> {
    const response = await apiClient.get<Retardo[]>('/retardos', {
      params: { alumno_id: alumnoId },
    });
    return response.data;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<Retardo[]> {
    const response = await apiClient.get<Retardo[]>('/retardos', {
      params: { fecha_inicio: startDate, fecha_fin: endDate },
    });
    return response.data;
  },
};
