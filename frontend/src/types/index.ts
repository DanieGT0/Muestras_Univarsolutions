export const UserRole = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  COMMERCIAL: 'COMMERCIAL'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const UnidadMedida = {
  KG: 'kg',
  G: 'g',
  MG: 'mg'
} as const;

export type UnidadMedida = typeof UnidadMedida[keyof typeof UnidadMedida];

export const TipoMovimiento = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA'
} as const;

export type TipoMovimiento = typeof TipoMovimiento[keyof typeof TipoMovimiento];

export const EstadoTransfer = {
  ENVIADO: 'ENVIADO',
  COMPLETADO: 'COMPLETADO',
  RECHAZADO: 'RECHAZADO'
} as const;

export type EstadoTransfer = typeof EstadoTransfer[keyof typeof EstadoTransfer];

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  countries: Country[];
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  has_transactions: boolean; // Para determinar si se puede borrar o solo desactivar
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Country {
  id: number;
  cod: string;
  name: string;
}

export interface Category {
  id: number;
  cod: string;
  name: string;
  countries?: Country[];
}

export interface Warehouse {
  id: number;
  cod: string;
  name: string;
  countries?: Country[];
}

export interface Location {
  id: number;
  cod: string;
  name: string;
  countries?: Country[];
}

export interface Supplier {
  id: number;
  cod: string;
  name: string;
  countries?: Country[];
}

export interface Responsible {
  id: number;
  cod: string;
  name: string;
  countries?: Country[];
}

export interface Sample {
  id: number;
  cod: string;
  material: string;
  lote: string;
  cantidad: number;
  peso_unitario: number;
  unidad_medida: UnidadMedida;
  peso_total: number;
  fecha_vencimiento?: string;
  comentarios?: string;
  fecha_registro: string;
  pais_id: number;
  categoria_id: number;
  proveedor_id: number;
  bodega_id: number;
  ubicacion_id: number;
  responsable_id: number;
  pais?: Country;
  categoria?: Category;
  proveedor?: Supplier;
  bodega?: Warehouse;
  ubicacion?: Location;
  responsable?: Responsible;
}

export interface SamplesResponse {
  data: Sample[];
  count: number;
  page: number;
  pages: number;
}

export interface CreateSampleData {
  material: string;
  lote: string;
  cantidad: number;
  peso_unitario: number;
  unidad_medida: UnidadMedida;
  peso_total: number;
  fecha_vencimiento?: string;
  comentarios?: string;
  pais_id: number;
  categoria_id: number;
  proveedor_id: number;
  bodega_id: number;
  ubicacion_id: number;
  responsable_id: number;
}

export interface Movement {
  id: number;
  fecha_movimiento: string;
  tipo_movimiento: TipoMovimiento;
  cantidad_movida: number;
  cantidad_anterior: number;
  cantidad_nueva: number;
  motivo: string;
  comentarios?: string;
  usuario_id: number;
  sample_id: number;
  sample?: {
    id: number;
    cod: string;
    material: string;
    lote: string;
  };
  usuario?: {
    id: string;
    email: string;
    nombre: string;
  };
}

export interface CreateMovementData {
  sample_id: number;
  tipo_movimiento: TipoMovimiento;
  cantidad_movida: number;
  motivo: string;
  comentarios?: string;
}

export interface MovementsResponse {
  data: Movement[];
  count: number;
  page: number;
  pages: number;
}

export interface Transfer {
  id: number;
  muestra_origen_id: number;
  muestra_destino_id?: number;
  cantidad_trasladada: number;
  cantidad: number; // Para compatibilidad frontend
  pais_destino_id: number;
  codigo_generado: string;
  motivo: string;
  comentarios_traslado?: string;
  comentarios?: string; // Para compatibilidad frontend
  estado: EstadoTransfer;
  fecha_solicitud: string; // Frontend usa fecha_solicitud
  fecha_envio: string;
  fecha_recepcion?: string;
  usuario_origen_id: string;
  usuario_destino_id?: string;
  muestra?: {
    id: number;
    cod: string;
    material: string;
    lote: string;
  };
  muestra_origen?: {
    id: number;
    cod: string;
    material: string;
    lote: string;
  };
  muestra_destino?: {
    id: number;
    cod: string;
    material: string;
    lote: string;
  };
  bodega_origen?: {
    id: number;
    cod: string;
    name: string;
  };
  ubicacion_origen?: {
    id: number;
    cod: string;
    name: string;
  };
  bodega_destino?: {
    id: number;
    cod: string;
    name: string;
  };
  ubicacion_destino?: {
    id: number;
    cod: string;
    name: string;
  };
  pais_destino?: {
    id: number;
    cod: string;
    name: string;
  };
  usuario_origen?: {
    id: string;
    email: string;
    nombre: string;
  };
  usuario_destino?: {
    id: string;
    email: string;
    nombre: string;
  };
}

export interface CreateTransferData {
  muestra_origen_id: number;
  cantidad_trasladada: number;
  pais_destino_id: number;
  motivo: string;
  comentarios_traslado?: string;
}

export interface TransfersResponse {
  data: Transfer[];
  count: number;
  page: number;
  pages: number;
}

export interface KardexEntry {
  id: number;
  sample_id: number;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  motivo: string;
  fecha_movimiento: string;
  usuario_id: number;
  movimiento_id?: number;
  costo_unitario?: number;
  costo_total?: number;
  comentarios?: string;
  sample?: {
    id: number;
    cod: string;
    material: string;
    lote: string;
    unidad_medida: string;
    pais: string;
    categoria: string;
    proveedor: string;
    bodega: string;
    ubicacion: string;
  };
  usuario?: {
    id: number;
    email: string;
    nombre: string;
  };
  movimiento_motivo?: string;
}

export interface KardexResponse {
  data: KardexEntry[];
  count: number;
  page: number;
  pages: number;
}

// User Management Types
export interface CreateUserData {
  email: string;
  full_name: string;
  password: string;
  confirm_password: string;
  role: UserRole;
  country_ids: number[];
}

export interface UpdateUserData {
  full_name?: string;
  role?: UserRole;
  country_ids?: number[];
  is_active?: boolean;
}

export interface UsersResponse {
  data: User[];
  count: number;
  page: number;
  pages: number;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  users_by_role: {
    [key in UserRole]: number;
  };
}