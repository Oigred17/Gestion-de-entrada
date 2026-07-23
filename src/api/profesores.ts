import apiClient from './client';
import type { Profesor, ProfesorCreate } from '../types';

export const profesoresApi = {
  async getAll(skip = 0, limit = 100): Promise<Profesor[]> {
    const response = await apiClient.get<Profesor[]>('/profesores', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<Profesor> {
    const response = await apiClient.get<Profesor>(`/profesores/${id}`);
    return response.data;
  },

  async create(profesor: ProfesorCreate): Promise<Profesor> {
    const response = await apiClient.post<Profesor>('/profesores', profesor);
    return response.data;
  },

  async update(id: number, profesor: Partial<ProfesorCreate>): Promise<Profesor> {
    const response = await apiClient.put<Profesor>(`/profesores/${id}`, profesor);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/profesores/${id}`);
  },
};
