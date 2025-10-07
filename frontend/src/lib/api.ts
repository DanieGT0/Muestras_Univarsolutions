import axios from 'axios';
import type { AuthResponse, SamplesResponse, Sample, CreateSampleData, User, CreateUserData, UpdateUserData, UserStats, Country, KardexResponse, TransfersResponse, Transfer, CreateTransferData, EstadoTransfer } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, full_name?: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', { email, password, full_name });
    return response.data;
  },
};

// Samples endpoints
export const samplesAPI = {
  getSamples: async (page = 1, limit = 10, search = ''): Promise<SamplesResponse> => {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }
    const response = await api.get('/samples', { params });

    // Transform response to match expected format
    return {
      data: response.data?.data || [],
      count: response.data?.count || 0,
      page,
      pages: Math.ceil((response.data?.count || 0) / limit),
    };
  },

  getSamplesStats: async (): Promise<{ totalMuestras: number; totalUnidades: number; totalPeso: number }> => {
    const response = await api.get('/samples/stats');
    return response.data;
  },

  getSample: async (id: number): Promise<Sample> => {
    const response = await api.get(`/samples/${id}`);
    return response.data;
  },

  createSample: async (data: CreateSampleData): Promise<Sample> => {
    const response = await api.post('/samples', data);
    return response.data;
  },

  updateSample: async (id: number, data: Partial<CreateSampleData>): Promise<Sample> => {
    const response = await api.put(`/samples/${id}`, data);
    return response.data;
  },

  deleteSample: async (id: number): Promise<void> => {
    await api.delete(`/samples/${id}`);
  },

  getAllForExport: async (): Promise<{ data: Sample[] }> => {
    const response = await api.get('/samples/export');
    return { data: response.data?.data || [] };
  },
};

// Users endpoints
export const usersAPI = {
  getUsers: async (page = 1, limit = 10): Promise<{ data: User[], count: number, page: number, pages: number }> => {
    const response = await api.get(`/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  getUserStats: async (): Promise<UserStats> => {
    const response = await api.get('/users/stats');
    return response.data;
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data.user;
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await api.put(`/users/${id}`, data);
    return response.data.user;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  changePassword: async (id: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.put(`/users/${id}/change-password`, { newPassword });
    return response.data;
  },
};

// Countries endpoints
export const countriesAPI = {
  getCountries: async (): Promise<{ data: Country[], count: number }> => {
    const response = await api.get('/countries');
    return response.data;
  },

  // Get all countries for transfer destinations (unrestricted)
  getAllCountriesForTransfers: async (): Promise<{ data: Country[], count: number }> => {
    const response = await api.get('/countries/transfers');
    return response.data;
  },

  createCountry: async (data: { cod: string, name: string }): Promise<Country> => {
    const response = await api.post('/countries', data);
    return response.data.data;
  },

  updateCountry: async (id: number, data: { cod?: string, name?: string }): Promise<Country> => {
    const response = await api.put(`/countries/${id}`, data);
    return response.data.data;
  },

  deleteCountry: async (id: number): Promise<void> => {
    await api.delete(`/countries/${id}`);
  },
};

// Categories endpoints
export const categoriesAPI = {
  getCategories: async (params?: { country_ids?: number[] }): Promise<{ data: any[], count: number }> => {
    let url = '/categories';
    if (params?.country_ids && params.country_ids.length > 0) {
      const queryParams = new URLSearchParams();
      params.country_ids.forEach(id => queryParams.append('country_ids', id.toString()));
      url += `?${queryParams.toString()}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  createCategory: async (data: { cod: string, name: string }): Promise<Country> => {
    const response = await api.post('/categories', data);
    return response.data.data;
  },

  updateCategory: async (id: number, data: { cod?: string, name?: string }): Promise<Country> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

// Suppliers endpoints
export const suppliersAPI = {
  getSuppliers: async (params?: { country_ids?: number[] }): Promise<{ data: any[], count: number }> => {
    let url = '/suppliers';
    if (params?.country_ids && params.country_ids.length > 0) {
      const queryParams = new URLSearchParams();
      params.country_ids.forEach(id => queryParams.append('country_ids', id.toString()));
      url += `?${queryParams.toString()}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  createSupplier: async (data: { cod: string, name: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.post('/suppliers', data);
    return response.data.data;
  },

  updateSupplier: async (id: number, data: { cod?: string, name?: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data.data;
  },

  deleteSupplier: async (id: number): Promise<void> => {
    await api.delete(`/suppliers/${id}`);
  },
};

// Locations endpoints
export const locationsAPI = {
  getLocations: async (params?: { country_ids?: number[] }): Promise<{ data: any[], count: number }> => {
    let url = '/locations';
    if (params?.country_ids && params.country_ids.length > 0) {
      const queryParams = new URLSearchParams();
      params.country_ids.forEach(id => queryParams.append('country_ids', id.toString()));
      url += `?${queryParams.toString()}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  createLocation: async (data: { cod: string, name: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.post('/locations', data);
    return response.data.data;
  },

  updateLocation: async (id: number, data: { cod?: string, name?: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.put(`/locations/${id}`, data);
    return response.data.data;
  },

  deleteLocation: async (id: number): Promise<void> => {
    await api.delete(`/locations/${id}`);
  },
};

// Warehouses endpoints
export const warehousesAPI = {
  getWarehouses: async (params?: { country_ids?: number[] }): Promise<{ data: any[], count: number }> => {
    let url = '/warehouses';
    if (params?.country_ids && params.country_ids.length > 0) {
      const queryParams = new URLSearchParams();
      params.country_ids.forEach(id => queryParams.append('country_ids', id.toString()));
      url += `?${queryParams.toString()}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  createWarehouse: async (data: { cod: string, name: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.post('/warehouses', data);
    return response.data.data;
  },

  updateWarehouse: async (id: number, data: { cod?: string, name?: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.put(`/warehouses/${id}`, data);
    return response.data.data;
  },

  deleteWarehouse: async (id: number): Promise<void> => {
    await api.delete(`/warehouses/${id}`);
  },
};

// Responsibles endpoints
export const responsiblesAPI = {
  getResponsibles: async (params?: { country_ids?: number[] }): Promise<{ data: any[], count: number }> => {
    let url = '/responsibles';
    if (params?.country_ids && params.country_ids.length > 0) {
      const queryParams = new URLSearchParams();
      params.country_ids.forEach(id => queryParams.append('country_ids', id.toString()));
      url += `?${queryParams.toString()}`;
    }
    const response = await api.get(url);
    return response.data;
  },

  createResponsible: async (data: { cod: string, name: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.post('/responsibles', data);
    return response.data.data;
  },

  updateResponsible: async (id: number, data: { cod?: string, name?: string, country_ids?: number[] }): Promise<any> => {
    const response = await api.put(`/responsibles/${id}`, data);
    return response.data.data;
  },

  deleteResponsible: async (id: number): Promise<void> => {
    await api.delete(`/responsibles/${id}`);
  },
};

// Movements endpoints
export const movementsAPI = {
  getMovements: async (page = 1, limit = 10, filters?: {
    sample_id?: number,
    tipo_movimiento?: 'ENTRADA' | 'SALIDA',
    date_from?: string,
    date_to?: string
  }): Promise<{ data: any[], count: number, page: number, pages: number }> => {
    let url = `/movements?page=${page}&limit=${limit}`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.sample_id) params.append('sample_id', filters.sample_id.toString());
      if (filters.tipo_movimiento) params.append('tipo_movimiento', filters.tipo_movimiento);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      if (params.toString()) {
        url += `&${params.toString()}`;
      }
    }

    const response = await api.get(url);

    // Transform response to match expected format
    return {
      data: response.data?.data || [],
      count: response.data?.pagination?.total || 0,
      page: response.data?.pagination?.page || page,
      pages: response.data?.pagination?.pages || 1
    };
  },

  getMovementsStats: async (): Promise<{ totalMovimientos: number; totalEntradas: number; totalSalidas: number }> => {
    const response = await api.get('/movements/stats');
    return response.data;
  },

  getMovement: async (id: number): Promise<any> => {
    const response = await api.get(`/movements/${id}`);
    return response.data;
  },

  createMovement: async (data: {
    sample_id: number,
    tipo_movimiento: 'ENTRADA' | 'SALIDA',
    cantidad_movida: number,
    motivo: string,
    comentarios?: string
  }): Promise<any> => {
    const response = await api.post('/movements', data);
    return response.data;
  },

  deleteMovement: async (id: number): Promise<void> => {
    await api.delete(`/movements/${id}`);
  },
};

// Kardex endpoints
export const kardexAPI = {
  getKardexEntries: async (page = 1, limit = 10, filters?: {
    sample_id?: number,
    tipo_movimiento?: 'ENTRADA' | 'SALIDA',
    date_from?: string,
    date_to?: string,
    material?: string,
    lote?: string
  }): Promise<KardexResponse> => {
    let url = `/kardex?page=${page}&limit=${limit}`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.sample_id) params.append('sample_id', filters.sample_id.toString());
      if (filters.tipo_movimiento) params.append('tipo_movimiento', filters.tipo_movimiento);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.material) params.append('material', filters.material);
      if (filters.lote) params.append('lote', filters.lote);

      if (params.toString()) {
        url += `&${params.toString()}`;
      }
    }

    const response = await api.get(url);

    // Transform response to match expected format
    return {
      data: response.data?.data || [],
      count: response.data?.pagination?.total || 0,
      page: response.data?.pagination?.page || page,
      pages: response.data?.pagination?.pages || 1
    };
  },

  getKardexStats: async (): Promise<{ totalMovimientos: number; totalEntradas: number; totalSalidas: number }> => {
    const response = await api.get('/kardex/stats');
    return response.data;
  },

  getKardexSummary: async (page = 1, limit = 10): Promise<{ data: any[], count: number, page: number, pages: number }> => {
    const response = await api.get(`/kardex/summary?page=${page}&limit=${limit}`);
    return response.data;
  },

  getKardexBySample: async (sampleId: number, page = 1, limit = 10): Promise<{ sample: any, kardex: KardexResponse }> => {
    const response = await api.get(`/kardex/sample/${sampleId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  exportKardex: async (filters?: {
    sample_id?: number,
    date_from?: string,
    date_to?: string
  }): Promise<{ data: any[], count: number, exported_at: string }> => {
    let url = '/kardex/export';

    if (filters) {
      const params = new URLSearchParams();
      if (filters.sample_id) params.append('sample_id', filters.sample_id.toString());
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    const response = await api.get(url);
    return response.data;
  },
};

// Transfers endpoints
export const transfersAPI = {
  getTransfers: async (page = 1, limit = 10, filters?: {
    estado?: EstadoTransfer,
    pais_destino_id?: number,
    date_from?: string,
    date_to?: string,
    codigo_generado?: string
  }): Promise<TransfersResponse> => {
    let url = `/transfers?page=${page}&limit=${limit}`;

    if (filters) {
      const params = new URLSearchParams();
      if (filters.estado) params.append('estado', filters.estado);
      if (filters.pais_destino_id) params.append('pais_destino_id', filters.pais_destino_id.toString());
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.codigo_generado) params.append('codigo_generado', filters.codigo_generado);

      if (params.toString()) {
        url += `&${params.toString()}`;
      }
    }

    const response = await api.get(url);
    return response.data;
  },

  getTransfer: async (id: number): Promise<Transfer> => {
    const response = await api.get(`/transfers/${id}`);
    return response.data;
  },

  createTransfer: async (data: CreateTransferData): Promise<Transfer> => {
    const response = await api.post('/transfers', data);
    return response.data;
  },

  updateTransfer: async (id: number, data: {
    estado?: EstadoTransfer,
    comentarios_traslado?: string
  }): Promise<Transfer> => {
    const response = await api.put(`/transfers/${id}`, data);
    return response.data;
  },

  cancelTransfer: async (id: number): Promise<void> => {
    await api.put(`/transfers/${id}/cancel`);
  },

  deleteTransfer: async (id: number): Promise<void> => {
    await api.delete(`/transfers/${id}`);
  },
};

// Security endpoints
export const securityAPI = {
  getTablesInfo: async (): Promise<{ tables: any[], summary: any }> => {
    const response = await api.get('/security/tables-info');
    return response.data;
  },

  createBackup: async (): Promise<{
    message: string,
    timestamp: string,
    backupSize: number,
    tableCount: number,
    backupSQL: string
  }> => {
    const response = await api.post('/security/backup');
    return response.data;
  },

  deleteTablesMassive: async (data: {
    tables: string[],
    password: string,
    country_id?: number
  }): Promise<{
    message: string,
    deletedTables: Array<{
      table: string,
      recordsDeleted: number,
      sequenceReset: boolean,
      countryFiltered?: boolean
    }>,
    errors?: string[]
  }> => {
    const response = await api.post('/security/delete-tables', data);
    return response.data;
  },

  changeMasterPassword: async (data: {
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  }): Promise<{ message: string }> => {
    const response = await api.post('/security/change-password', data);
    return response.data;
  },

  getSecurityHistory: async (page = 1, limit = 10): Promise<{
    data: Array<{
      id: string,
      action: string,
      timestamp: string,
      user: string,
      status: 'success' | 'error'
    }>,
    count: number,
    page: number,
    pages: number
  }> => {
    const response = await api.get(`/security/history?page=${page}&limit=${limit}`);
    return response.data;
  }
};

export default api;