import apiClient from './client';
import type { Credencial, CredencialCreate } from '../types';

export const credencialesApi = {
  async getAll(skip = 0, limit = 100): Promise<Credencial[]> {
    const response = await apiClient.get<Credencial[]>('/credenciales', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<Credencial> {
    const response = await apiClient.get<Credencial>(`/credenciales/${id}`);
    return response.data;
  },

  async create(credencial: CredencialCreate): Promise<Credencial> {
    const response = await apiClient.post<Credencial>('/credenciales', credencial);
    return response.data;
  },

  async update(id: number, credencial: Partial<CredencialCreate>): Promise<Credencial> {
    const response = await apiClient.put<Credencial>(`/credenciales/${id}`, credencial);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/credenciales/${id}`);
  },

  async getByAlumnoId(alumnoId: number): Promise<Credencial[]> {
    const response = await apiClient.get<Credencial[]>('/credenciales', {
      params: { alumno_id: alumnoId },
    });
    return response.data;
  },

  async getByUid(uidNfc: string): Promise<Credencial> {
    // Query param: los UID con ":" fallan en path detras de Cloudflare/tuneles.
    const response = await apiClient.get<Credencial>('/credenciales/by-uid', {
      params: { uid_nfc: uidNfc },
    });
    return response.data;
  },
};
