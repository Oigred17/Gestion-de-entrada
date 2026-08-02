import apiClient from './client';

export interface CardCapturedMessage {
  type: 'card_captured';
  uid_nfc: string;
  timestamp: string;
}

export interface ScanResultMessage {
  type: 'scan_result';
  status: string;
  uid_nfc?: string;
  tipo_evento?: string;
  credencial_id?: number;
  registro_id?: number;
  alumno?: { id: number; nombre: string; matricula: string } | null;
  message?: string;
  timestamp?: string;
}

export type NFCWSMessage = CardCapturedMessage | ScanResultMessage;

export const nfcApi = {
  async sendScan(uidNfc: string): Promise<{ status: string }> {
    const response = await apiClient.post('/nfc/scan', { uid_nfc: uidNfc });
    return response.data;
  },

  async writeCard(credencialId: number, uidNfc: string): Promise<{ status: string }> {
    const response = await apiClient.post('/nfc/write', { credencial_id: credencialId, uid_nfc: uidNfc });
    return response.data;
  },

  async startCapture(): Promise<{ status: string; message: string }> {
    const response = await apiClient.post('/nfc/capture/start');
    return response.data;
  },

  async stopCapture(): Promise<{ status: string; message: string }> {
    const response = await apiClient.post('/nfc/capture/stop');
    return response.data;
  },

  async pollCapture(): Promise<{ status: string; uid_nfc?: string; timestamp?: string }> {
    const response = await apiClient.get('/nfc/capture/poll');
    return response.data;
  },

  connectWebSocket(onMessage: (msg: NFCWSMessage) => void, onOpen?: () => void, onClose?: () => void): WebSocket {
    const configured = import.meta.env.VITE_API_URL;
    let base: string;
    if (configured && /^https?:\/\//.test(configured)) {
      base = configured.replace(/\/api\/v1\/?$/, '');
    } else {
      base = window.location.origin;
    }
    const protocol = base.startsWith('https') ? 'wss:' : 'ws:';
    const host = base.replace(/^https?:\/\//, '');
    const url = `${protocol}//${host}/api/v1/nfc/ws`;

    const ws = new WebSocket(url);
    ws.onopen = () => onOpen?.();
    ws.onclose = () => onClose?.();
    ws.onerror = () => onClose?.();
    ws.onmessage = (event) => {
      try {
        const msg: NFCWSMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch {
        // ignore parse errors
      }
    };
    return ws;
  },
};
