import apiClient from './client';
import type { ReporteProgramado, ReporteProgramadoCreate } from '../types';

export const reportesProgramadosApi = {
  async getAll(): Promise<ReporteProgramado[]> {
    const response = await apiClient.get<ReporteProgramado[]>('/reportes-programados');
    return response.data;
  },

  async getById(id: number): Promise<ReporteProgramado> {
    const response = await apiClient.get<ReporteProgramado>(`/reportes-programados/${id}`);
    return response.data;
  },

  async create(data: ReporteProgramadoCreate): Promise<ReporteProgramado> {
    const response = await apiClient.post<ReporteProgramado>('/reportes-programados', data);
    return response.data;
  },

  async update(id: number, data: Partial<ReporteProgramadoCreate>): Promise<ReporteProgramado> {
    const response = await apiClient.put<ReporteProgramado>(`/reportes-programados/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/reportes-programados/${id}`);
  },

  async ejecutar(id: number): Promise<{
    mensaje: string;
    ultima_generacion: string;
    proxima_generacion: string;
    enviados: { email: string; enviado: boolean }[];
    lineas: number;
  }> {
    const response = await apiClient.post(`/reportes-programados/${id}/ejecutar`);
    return response.data;
  },
};
