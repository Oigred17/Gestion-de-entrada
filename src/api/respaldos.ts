import apiClient from './client';

export interface Respaldo {
  id: number;
  fecha: string;
  tamano: string;
  tamano_bytes: number;
  tipo: string;
  estado: string;
}

export const respaldosApi = {
  async getAll(): Promise<Respaldo[]> {
    const response = await apiClient.get<Respaldo[]>('/respaldos');
    return response.data;
  },

  async generar(): Promise<Respaldo> {
    const response = await apiClient.post<Respaldo>('/respaldos/generar');
    return response.data;
  },

  async descargar(id: number): Promise<unknown> {
    const response = await apiClient.get<unknown>(`/respaldos/${id}/descargar`);
    return response.data;
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(`/respaldos/${id}`);
  },
};
