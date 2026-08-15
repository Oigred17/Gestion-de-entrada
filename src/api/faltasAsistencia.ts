import apiClient from './client';
import type { FaltaAsistencia } from '../types';

export const faltasAsistenciaApi = {
  async getAll(params?: {
    alumno_id?: number;
    tipo?: 'FALTANTE' | 'SIN_SALIDA';
    fecha_inicio?: string;
    fecha_fin?: string;
  }): Promise<FaltaAsistencia[]> {
    const response = await apiClient.get<FaltaAsistencia[]>('/faltas-asistencia', {
      params,
    });
    return response.data;
  },

  async generar(fecha?: string): Promise<{
    fecha: string;
    es_dia_habile: boolean;
    hora_cierre?: string;
    faltantes: number;
    sin_salida: number;
    total: number;
    ya_existentes: number;
    mensaje: string;
  }> {
    const response = await apiClient.post('/faltas-asistencia/generar', {
      fecha: fecha ?? undefined,
    });
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/faltas-asistencia/${id}`);
  },
};
