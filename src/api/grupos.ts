import apiClient from './client';
import type { Grupo, GrupoCreate } from '../types';

export const gruposApi = {
  async getAll(skip = 0, limit = 100): Promise<Grupo[]> {
    const response = await apiClient.get<Grupo[]>('/grupos', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<Grupo> {
    const response = await apiClient.get<Grupo>(`/grupos/${id}`);
    return response.data;
  },

  async create(grupo: GrupoCreate): Promise<Grupo> {
    const response = await apiClient.post<Grupo>('/grupos', grupo);
    return response.data;
  },

  async update(id: number, grupo: Partial<GrupoCreate>): Promise<Grupo> {
    const response = await apiClient.put<Grupo>(`/grupos/${id}`, grupo);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/grupos/${id}`);
  },
};
