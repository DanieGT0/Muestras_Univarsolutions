export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  COMMERCIAL = 'COMMERCIAL'
}

export enum UnidadMedida {
  KG = 'kg',
  G = 'g',
  MG = 'mg'
}

export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA'
}

export enum EstadoTransfer {
  ENVIADO = 'ENVIADO',
  COMPLETADO = 'COMPLETADO',
  RECHAZADO = 'RECHAZADO'
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
  hashed_password: string;
  created_at: Date;
  updated_at: Date;
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
}

export interface Warehouse {
  id: number;
  cod: string;
  name: string;
}

export interface Location {
  id: number;
  cod: string;
  name: string;
}

export interface Supplier {
  id: number;
  cod: string;
  name: string;
}

export interface Responsible {
  id: number;
  cod: string;
  name: string;
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
  fecha_vencimiento?: Date;
  comentarios?: string;
  fecha_registro: Date;
  pais_id: number;
  categoria_id: number;
  proveedor_id: number;
  bodega_id: number;
  ubicacion_id: number;
  responsable_id: number;
}

export interface Movement {
  id: number;
  sample_id: number;
  tipo_movimiento: TipoMovimiento;
  cantidad_movida: number;
  cantidad_anterior: number;
  cantidad_nueva: number;
  motivo: string;
  comentarios?: string;
  fecha_movimiento: Date;
  usuario_id: string;
}

export interface Transfer {
  id: number;
  muestra_origen_id: number;
  muestra_destino_id?: number;
  cantidad_trasladada: number;
  pais_destino_id: number;
  codigo_generado: string;
  motivo: string;
  comentarios_traslado?: string;
  estado: EstadoTransfer;
  fecha_envio: Date;
  fecha_recepcion?: Date;
  usuario_origen_id: string;
  usuario_destino_id?: string;
}