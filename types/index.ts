export type Categoria = 'ramos' | 'flores_sueltas';

export interface Producto {
  id: string;
  nombre: string;
  categoria: Categoria;
  stock: number;
  stockMinimo: number;
  unidad: string;
  foto?: string;
  fechaCreacion: Date;
}

export type TipoMovimiento = 'merma' | 'abastecimiento';

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
  esUber?: boolean; // Flag para identificar ventas de Uber
  notas?: string;
}