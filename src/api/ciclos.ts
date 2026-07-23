import apiClient from './client';
import type { CicloEscolar, CicloEscolarCreate } from '../types';

export const ciclosApi = {
  async getAll(skip = 0, limit = 100): Promise<CicloEscolar[]> {
    const response = await apiClient.get<CicloEscolar[]>('/ciclos-escolares', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<CicloEscolar> {
    const response = await apiClient.get<CicloEscolar>(`/ciclos-escolares/${id}`);
    return response.data;
  },

  async create(ciclo: CicloEscolarCreate): Promise<CicloEscolar> {
    const response = await apiClient.post<CicloEscolar>('/ciclos-escolares', ciclo);
    return response.data;
  },

  async update(id: number, ciclo: Partial<CicloEscolarCreate>): Promise<CicloEscolar> {
    const response = await apiClient.put<CicloEscolar>(`/ciclos-escolares/${id}`, ciclo);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/ciclos-escolares/${id}`);
  },
};
