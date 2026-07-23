import apiClient from './client';
import type { Inscripcion, InscripcionCreate } from '../types';

export const inscripcionesApi = {
  async getAll(skip = 0, limit = 100): Promise<Inscripcion[]> {
    const response = await apiClient.get<Inscripcion[]>('/inscripciones', {
      params: { skip, limit },
    });
    return response.data;
  },

  async getById(id: number): Promise<Inscripcion> {
    const response = await apiClient.get<Inscripcion>(`/inscripciones/${id}`);
    return response.data;
  },

  async create(inscripcion: InscripcionCreate): Promise<Inscripcion> {
    const response = await apiClient.post<Inscripcion>('/inscripciones', inscripcion);
    return response.data;
  },

  async update(id: number, inscripcion: Partial<InscripcionCreate>): Promise<Inscripcion> {
    const response = await apiClient.put<Inscripcion>(`/inscripciones/${id}`, inscripcion);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/inscripciones/${id}`);
  },

  async getByAlumnoId(alumnoId: number): Promise<Inscripcion[]> {
    const response = await apiClient.get<Inscripcion[]>('/inscripciones', {
      params: { alumno_id: alumnoId },
    });
    return response.data;
  },

  async getByCicloId(cicloId: number): Promise<Inscripcion[]> {
    const response = await apiClient.get<Inscripcion[]>('/inscripciones', {
      params: { ciclo_id: cicloId },
    });
    return response.data;
  },
};
