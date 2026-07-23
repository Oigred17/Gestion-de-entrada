import apiClient from './client';
import type { Usuario } from '../types';

export interface UsuarioCreate {
  username: string;
  password_user: string;
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  id_rol: number;
  activo?: boolean;
}

export const usuariosApi = {
  async getAll(skip = 0, limit = 100): Promise<Usuario[]> {
    const response = await apiClient.get<Usuario[]>('/usuarios', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<Usuario> {
    const response = await apiClient.get<Usuario>(`/usuarios/${id}`);
    return response.data;
  },

  async create(usuario: UsuarioCreate): Promise<Usuario> {
    const response = await apiClient.post<Usuario>('/usuarios', usuario);
    return response.data;
  },

  async update(id: number, usuario: Partial<Usuario>): Promise<Usuario> {
    const response = await apiClient.put<Usuario>(`/usuarios/${id}`, usuario);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/usuarios/${id}`);
  },
};
