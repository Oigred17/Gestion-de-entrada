import apiClient from './client';
import type { Permiso, PermisoCreate } from '../types';

export const permisosApi = {
  async getAll(params?: { alumno_id?: number; estado?: string }): Promise<Permiso[]> {
    const response = await apiClient.get<Permiso[]>('/permisos', { params });
    return response.data;
  },

  async getById(id: number): Promise<Permiso> {
    const response = await apiClient.get<Permiso>(`/permisos/${id}`);
    return response.data;
  },

  async create(data: PermisoCreate): Promise<Permiso> {
    const response = await apiClient.post<Permiso>('/permisos', data);
    return response.data;
  },

  async update(id: number, data: Partial<Permiso>): Promise<Permiso> {
    const response = await apiClient.put<Permiso>(`/permisos/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/permisos/${id}`);
  },

  async validarCodigo(codigo: string): Promise<Permiso> {
    const response = await apiClient.post<Permiso>('/permisos/validar-codigo', { codigo });
    return response.data;
  },
};
