import apiClient from './client';

export interface NotificationItem {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  text: string;
  time: string | null;
  unread: boolean;
}

export const notificacionesApi = {
  async getAll(): Promise<NotificationItem[]> {
    const response = await apiClient.get<NotificationItem[]>('/notificaciones');
    return response.data;
  },
};
