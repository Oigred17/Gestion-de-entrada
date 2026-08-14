import apiClient from './client';
import type { Configuracion, ConfiguracionUpdate, Horario } from '../types';

export const configuracionApi = {
  async getAll(): Promise<Configuracion> {
    const response = await apiClient.get<Configuracion>('/configuracion');
    return response.data;
  },

  async save(data: ConfiguracionUpdate): Promise<Configuracion> {
    const response = await apiClient.put<Configuracion>('/configuracion', data);
    return response.data;
  },

  async createHorario(data: Omit<Horario, 'id'>): Promise<Horario> {
    const response = await apiClient.post<Horario>('/configuracion/horarios', data);
    return response.data;
  },

  async updateHorario(id: number, data: Partial<Omit<Horario, 'id'>>): Promise<Horario> {
    const response = await apiClient.put<Horario>(`/configuracion/horarios/${id}`, data);
    return response.data;
  },

  async deleteHorario(id: number): Promise<void> {
    await apiClient.delete(`/configuracion/horarios/${id}`);
  },
};
