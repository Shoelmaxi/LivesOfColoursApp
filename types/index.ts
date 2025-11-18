export type Categoria = 'ramos' | 'flores_sueltas';
export type MetodoPago = 'efectivo' | 'transferencia' | 'debito';

export interface Producto {
  id: string;
  nombre: string;
  categoria: Categoria;
  stock: number;
  stockMinimo: number;
  stockApertura?: number;
  unidad: string;
  foto?: string;
  fechaCreacion: Date;
}

export type TipoMovimiento = 'merma' | 'abastecimiento' | 'ocupado_ramo';

export interface Movimiento {
  id: string;
  tipo: TipoMovimiento;
  productoId: string;
  productoNombre: string;
  cantidad: number;
  fecha: Date;
  notas?: string;
}

export interface ProductoVenta {
  productoId: string;
  productoNombre: string;
  cantidad: number;
}

export interface Venta {
  id: string;
  fecha: Date;
  productos: ProductoVenta[];
  total: number;
  metodoPago?: MetodoPago;
  esUber?: boolean;
  notas?: string;
}