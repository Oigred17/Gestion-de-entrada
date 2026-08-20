import apiClient from './client';
import type { Alumno, AlumnoCreate, AlumnoUpdate } from '../types';

export const alumnosApi = {
  async getAll(skip = 0, limit = 100, estatus?: string): Promise<Alumno[]> {
    const params: Record<string, string | number> = { skip, limit };
    if (estatus) params.estatus = estatus;
    const response = await apiClient.get<Alumno[]>('/alumnos', { params });
    return response.data;
  },

  async getById(id: number): Promise<Alumno> {
    const response = await apiClient.get<Alumno>(`/alumnos/${id}`);
    return response.data;
  },

  async create(alumno: AlumnoCreate): Promise<Alumno> {
    const response = await apiClient.post<Alumno>('/alumnos', alumno);
    return response.data;
  },

  async update(id: number, alumno: AlumnoUpdate): Promise<Alumno> {
    const response = await apiClient.put<Alumno>(`/alumnos/${id}`, alumno);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/alumnos/${id}`);
  },

  async search(query: string): Promise<Alumno[]> {
    const response = await apiClient.get<Alumno[]>('/alumnos', {
      params: { search: query },
    });
    return response.data;
  },
};
