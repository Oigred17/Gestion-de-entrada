import apiClient from './client';
import type { LoginRequest, LoginResponse, User, RecoveryResponse, ResetPasswordRequest } from '../types';

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async requestRecoveryCode(username: string): Promise<RecoveryResponse> {
    const response = await apiClient.post<RecoveryResponse>('/auth/recover/request', { username });
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<RecoveryResponse> {
    const response = await apiClient.post<RecoveryResponse>('/auth/recover/reset', data);
    return response.data;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};
