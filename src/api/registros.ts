import apiClient from './client';
import type { RegistroAcceso, RegistroAccesoCreate } from '../types';

export const registrosApi = {
  async getAll(skip = 0, limit = 100): Promise<RegistroAcceso[]> {
    const response = await apiClient.get<RegistroAcceso[]>('/registros-acceso', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<RegistroAcceso> {
    const response = await apiClient.get<RegistroAcceso>(`/registros-acceso/${id}`);
    return response.data;
  },

  async create(registro: RegistroAccesoCreate): Promise<RegistroAcceso> {
    const response = await apiClient.post<RegistroAcceso>('/registros-acceso', registro);
    return response.data;
  },

  async update(id: number, registro: Partial<RegistroAccesoCreate>): Promise<RegistroAcceso> {
    const response = await apiClient.put<RegistroAcceso>(`/registros-acceso/${id}`, registro);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/registros-acceso/${id}`);
  },

  async getByAlumnoId(alumnoId: number): Promise<RegistroAcceso[]> {
    const response = await apiClient.get<RegistroAcceso[]>('/registros-acceso', {
      params: { alumno_id: alumnoId },
    });
    return response.data;
  },

  async getByDateRange(startDate: string, endDate: string): Promise<RegistroAcceso[]> {
    const response = await apiClient.get<RegistroAcceso[]>('/registros-acceso', {
      params: { fecha_inicio: startDate, fecha_fin: endDate },
    });
    return response.data;
  },
};
