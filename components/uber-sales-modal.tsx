import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addVenta, generarId, getProductos, updateProducto } from '@/services/storage';
import { Producto, ProductoVenta, Venta } from '@/types';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface UberSalesModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UberSalesModal({ visible, onClose, onSuccess }: UberSalesModalProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosEnCarrito, setProductosEnCarrito] = useState<ProductoVenta[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrandoSelector, setMostrandoSelector] = useState(true);
  const [papeleria, setPapeleria] = useState(false);
  const [notas, setNotas] = useState('');
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (visible) {
      loadProductos();
      resetForm();
    }
  }, [visible]);

  const loadProductos = async () => {
    try {
      const prods = await getProductos();
      setProductos(prods);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const resetForm = () => {
    setProductosEnCarrito([]);
    setBusqueda('');
    setMostrandoSelector(true);
    setPapeleria(false);
    setNotas('');
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarAlCarrito = (producto: Producto) => {
    const existe = productosEnCarrito.find(p => p.productoId === producto.id);
    if (!existe) {
      setProductosEnCarrito([
        ...productosEnCarrito,
        {
          productoId: producto.id,
          productoNombre: producto.nombre,
          cantidad: 1,
        },
      ]);
    }
  };

  const actualizarCantidad = (productoId: string, cantidad: string) => {
    const cantidadNum = parseInt(cantidad) || 0;
    if (cantidadNum === 0) {
      setProductosEnCarrito(productosEnCarrito.filter(p => p.productoId !== productoId));
    } else {
      setProductosEnCarrito(
        productosEnCarrito.map(p =>
          p.productoId === productoId ? { ...p, cantidad: cantidadNum } : p
        )
      );
    }
  };

  const eliminarDelCarrito = (productoId: string) => {
    setProductosEnCarrito(productosEnCarrito.filter(p => p.productoId !== productoId));
  };

  const guardarVentaUber = async () => {
    if (productosEnCarrito.length === 0 && !papeleria) {
      Alert.alert('Error', 'Debes agregar al menos un producto o papelería');
      return;
    }

    try {
      // Verificar stock disponible
      for (const prodVenta of productosEnCarrito) {
        const producto = productos.find(p => p.id === prodVenta.productoId);
        if (!producto) continue;

        if (prodVenta.cantidad > producto.stock) {
          Alert.alert(
            'Stock insuficiente',
            `${producto.nombre}: Solo hay ${producto.stock} disponibles`
          );
          return;
        }
      }

      // Actualizar stocks
      for (const prodVenta of productosEnCarrito) {
        const producto = productos.find(p => p.id === prodVenta.productoId);
        if (!producto) continue;

        const nuevoStock = producto.stock - prodVenta.cantidad;
        await updateProducto(producto.id, { stock: nuevoStock });
      }

      const notasFinales = papeleria
        ? `${notas ? notas + ' | ' : ''}Incluye papelería`
        : notas;

      const nuevaVenta: Venta = {
        id: generarId(),
        fecha: new Date(),
        productos: productosEnCarrito,
        total: 0, // Las ventas Uber no tienen precio
        esUber: true,
        notas: notasFinales || undefined,
      };

      await addVenta(nuevaVenta);
      
      Alert.alert('✅ Éxito', '¡Venta Uber registrada correctamente!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar venta Uber:', error);
      Alert.alert('Error', 'Hubo un problema al registrar la venta. Por favor intenta nuevamente.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fafafa' },
        ]}>
        <View style={[styles.header, { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff' }]}>
          <View>
            <ThemedText type="title" style={styles.headerTitle}>🚗 Venta Uber</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {productosEnCarrito.length} {productosEnCarrito.length === 1 ? 'producto' : 'productos'} • Sin precio
            </ThemedText>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <ThemedText style={styles.closeBtn}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Carrito de compras */}
          {productosEnCarrito.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>🛒 Productos seleccionados</ThemedText>
                <TouchableOpacity onPress={() => setMostrandoSelector(!mostrandoSelector)}>
                  <ThemedText style={styles.toggleBtn}>
                    {mostrandoSelector ? '▼' : '▶'} {mostrandoSelector ? 'Ocultar' : 'Agregar más'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              
              <View style={styles.carritoContainer}>
                {productosEnCarrito.map((item) => {
                  const producto = productos.find(p => p.id === item.productoId);
                  return (
                    <View
                      key={item.productoId}
                      style={[
                        styles.carritoItem,
                        { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff' },
                      ]}>
                      <View style={styles.carritoItemInfo}>
                        <ThemedText type="defaultSemiBold">{item.productoNombre}</ThemedText>
                        <ThemedText style={styles.carritoItemStock}>
                          Stock: {producto?.stock || 0} {producto?.unidad || ''}
                        </ThemedText>
                      </View>
                      <View style={styles.carritoItemActions}>
                        <TextInput
                          style={[
                            styles.cantidadInput,
                            {
                              color: colorScheme === 'dark' ? '#fff' : '#000',
                              borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                              backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f9f9f9',
                            },
                          ]}
                          value={item.cantidad.toString()}
                          onChangeText={(val) => actualizarCantidad(item.productoId, val)}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity
                          onPress={() => eliminarDelCarrito(item.productoId)}
                          style={styles.deleteBtn}>
                          <ThemedText style={styles.deleteBtnText}>🗑️</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Selector de productos */}
          {mostrandoSelector && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                🌸 Agregar productos
              </ThemedText>
              
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    color: colorScheme === 'dark' ? '#fff' : '#000',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
                  },
                ]}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="🔍 Buscar producto..."
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              />

              <ScrollView style={styles.productosSelector} nestedScrollEnabled>
                {productosFiltrados.map((producto) => {
                  const yaEnCarrito = productosEnCarrito.some(p => p.productoId === producto.id);
                  return (
                    <TouchableOpacity
                      key={producto.id}
                      style={[
                        styles.productoOption,
                        { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff' },
                        yaEnCarrito && styles.productoOptionDisabled,
                      ]}
                      onPress={() => agregarAlCarrito(producto)}
                      disabled={yaEnCarrito}>
                      <View style={styles.productoOptionInfo}>
                        <ThemedText type="defaultSemiBold">{producto.nombre}</ThemedText>
                        <ThemedText style={styles.productoOptionStock}>
                          {producto.stock} {producto.unidad}
                        </ThemedText>
                      </View>
                      {yaEnCarrito ? (
                        <View style={styles.checkIcon}>
                          <ThemedText style={styles.checkIconText}>✓</ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={styles.addIcon}>+</ThemedText>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Papelería */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.papeleriaContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
                  borderColor: papeleria ? '#ffa94d' : 'transparent',
                },
              ]}
              onPress={() => setPapeleria(!papeleria)}>
              <View style={styles.checkbox}>
                {papeleria && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </View>
              <View>
                <ThemedText type="defaultSemiBold">Incluye Papelería 🎀</ThemedText>
                <ThemedText style={styles.papeleriaSubtext}>
                  (Ramos armados con flores sueltas)
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notas */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              📝 Notas (opcional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff',
                },
              ]}
              value={notas}
              onChangeText={setNotas}
              placeholder="Cliente, pedido especial, etc..."
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              multiline
            />
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <ThemedText style={styles.infoText}>
              ℹ️ Esta venta se registrará sin precio y aparecerá marcada como "UBER" en el historial y reportes.
            </ThemedText>
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff' }]}>
          <View style={styles.footerSummary}>
            <ThemedText style={styles.footerLabel}>Venta Uber (sin precio)</ThemedText>
            <ThemedText style={styles.footerTotal}>
              {productosEnCarrito.length} items
            </ThemedText>
          </View>
          <TouchableOpacity 
            style={[styles.saveButton, productosEnCarrito.length === 0 && !papeleria && styles.saveButtonDisabled]} 
            onPress={guardarVentaUber}
            disabled={productosEnCarrito.length === 0 && !papeleria}>
            <ThemedText style={styles.saveButtonText}>
              ✨ Registrar Venta Uber
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  closeButton: {
    padding: 8,
  },
  closeBtn: {
    fontSize: 28,
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  toggleBtn: {
    color: '#ffa94d',
    fontSize: 14,
    fontWeight: '600',
  },
  carritoContainer: {
    gap: 8,
  },
  carritoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  carritoItemInfo: {
    flex: 1,
  },
  carritoItemStock: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  carritoItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cantidadInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  productosSelector: {
    maxHeight: 250,
  },
  productoOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productoOptionDisabled: {
    opacity: 0.5,
  },
  productoOptionInfo: {
    flex: 1,
  },
  productoOptionStock: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  addIcon: {
    fontSize: 28,
    color: '#ffa94d',
    fontWeight: '300',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  papeleriaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ffa94d',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffa94d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  papeleriaSubtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  infoText: {
    color: '#856404',
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 16,
    opacity: 0.7,
  },
  footerTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffa94d',
  },
  saveButton: {
    backgroundColor: '#ffa94d',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ffa94d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});