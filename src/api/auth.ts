import apiClient from './client';
import type { LoginRequest, LoginResponse, User, RecoveryResponse, ResetPasswordRequest, MfaSetupResponse } from '../types';

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async verifyPassword(password: string): Promise<{ valid: boolean }> {
    const response = await apiClient.post<{ valid: boolean }>('/auth/verify-password', { password });
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

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async mfaSetup(): Promise<MfaSetupResponse> {
    const response = await apiClient.post<MfaSetupResponse>('/auth/mfa/setup');
    return response.data;
  },

  async mfaEnable(code: string): Promise<{ status: string; message: string }> {
    const response = await apiClient.post('/auth/mfa/enable', { code });
    return response.data;
  },

  async mfaDisable(password: string): Promise<{ status: string; message: string }> {
    const response = await apiClient.post('/auth/mfa/disable', { password });
    return response.data;
  },

  async mfaVerify(code: string, temp_token?: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/mfa/verify', { code, temp_token });
    return response.data;
  },
};
