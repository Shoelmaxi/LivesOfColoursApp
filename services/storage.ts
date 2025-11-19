import { EstadoTurno, Movimiento, Producto, Venta } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PRODUCTOS: '@floreria_productos',
  MOVIMIENTOS: '@floreria_movimientos',
  VENTAS: '@floreria_ventas',
  TURNO: '@floreria_turno',
};

// Generar ID único
export const generarId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Productos
export const getProductos = async (): Promise<Producto[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PRODUCTOS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return [];
  }
};

export const saveProductos = async (productos: Producto[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.PRODUCTOS, JSON.stringify(productos));
  } catch (error) {
    console.error('Error al guardar productos:', error);
    throw new Error('No se pudieron guardar los productos');
  }
};

export const addProducto = async (producto: Producto): Promise<void> => {
  try {
    const productos = await getProductos();
    productos.push(producto);
    await saveProductos(productos);
  } catch (error) {
    console.error('Error al agregar producto:', error);
    throw new Error('No se pudo agregar el producto');
  }
};

export const updateProducto = async (id: string, updates: Partial<Producto>): Promise<void> => {
  try {
    const productos = await getProductos();
    const index = productos.findIndex(p => p.id === id);
    if (index !== -1) {
      productos[index] = { ...productos[index], ...updates };
      await saveProductos(productos);
    }
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    throw new Error('No se pudo actualizar el producto');
  }
};

export const deleteProducto = async (id: string): Promise<void> => {
  try {
    const productos = await getProductos();
    const filtered = productos.filter(p => p.id !== id);
    await saveProductos(filtered);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    throw new Error('No se pudo eliminar el producto');
  }
};

// Movimientos
export const getMovimientos = async (): Promise<Movimiento[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.MOVIMIENTOS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return [];
  }
};

export const addMovimiento = async (movimiento: Movimiento): Promise<void> => {
  try {
    const movimientos = await getMovimientos();
    movimientos.push(movimiento);
    await AsyncStorage.setItem(KEYS.MOVIMIENTOS, JSON.stringify(movimientos));
  } catch (error) {
    console.error('Error al agregar movimiento:', error);
    throw new Error('No se pudo registrar el movimiento');
  }
};

// Ventas
export const getVentas = async (): Promise<Venta[]> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.VENTAS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return [];
  }
};

export const addVenta = async (venta: Venta): Promise<void> => {
  try {
    const ventas = await getVentas();
    ventas.push(venta);
    await AsyncStorage.setItem(KEYS.VENTAS, JSON.stringify(ventas));
  } catch (error) {
    console.error('Error al agregar venta:', error);
    throw new Error('No se pudo registrar la venta');
  }
};

// Estado del turno
export const getEstadoTurno = async (): Promise<EstadoTurno> => {
  try {
    const data = await AsyncStorage.getItem(KEYS.TURNO);
    return data ? JSON.parse(data) : { turnoAbierto: false };
  } catch (error) {
    console.error('Error al obtener estado del turno:', error);
    return { turnoAbierto: false };
  }
};

export const setEstadoTurno = async (estado: EstadoTurno): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.TURNO, JSON.stringify(estado));
  } catch (error) {
    console.error('Error al guardar estado del turno:', error);
    throw new Error('No se pudo actualizar el estado del turno');
  }
};