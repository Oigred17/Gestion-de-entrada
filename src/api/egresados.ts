import apiClient from './client';
import type { Alumno } from '../types';

export const egresadosApi = {
  async getAll(search?: string, cicloNombre?: string): Promise<Alumno[]> {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (cicloNombre) params.ciclo_nombre = cicloNombre.toUpperCase();
    const response = await apiClient.get<Alumno[]>('/alumnos/egresados', { params });
    return response.data;
  },
};
