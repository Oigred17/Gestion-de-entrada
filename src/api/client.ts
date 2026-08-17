import axios, {
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api/v1`;

const CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 500;

interface CachedResponse extends AxiosResponse {
  _fromCache: true;
}

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

const getCache: Map<string, CacheEntry> = new Map();

function getToken(): string {
  return localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token') ?? '';
}

function normalizeParams(params?: unknown): string {
  if (!params || typeof params !== 'object') return '';
  return JSON.stringify(
    Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function cacheKey(method: string, url: string | undefined, params?: unknown): string {
  return `${getToken()}|${method}|${url ?? ''}|${normalizeParams(params)}`;
}

function isCacheable(method?: string): boolean {
  return (method ?? 'get').toLowerCase() === 'get';
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (isCacheable(config.method)) {
    const key = cacheKey(config.method ?? 'get', config.url, config.params);
    const hit = getCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      const cachedData = hit.data;
      config.adapter = (async (cfg: InternalAxiosRequestConfig): Promise<CachedResponse> => ({
        data: cachedData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: cfg,
        request: {},
        _fromCache: true,
      })) as AxiosAdapter;
    }
  } else {
    getCache.clear();
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (isCacheable(response.config.method) && !(response as CachedResponse)._fromCache) {
      if (getCache.size >= MAX_CACHE_ENTRIES) {
        getCache.clear();
      }
      getCache.set(cacheKey(response.config.method ?? 'get', response.config.url, response.config.params), {
        data: response.data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      getCache.clear();
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
