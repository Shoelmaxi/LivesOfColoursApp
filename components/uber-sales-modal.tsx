import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addVenta, getProductos, updateProducto } from '@/services/storage';
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
  const [productosVendidos, setProductosVendidos] = useState<ProductoVenta[]>([]);
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
    const prods = await getProductos();
    setProductos(prods);
  };

  const resetForm = () => {
    setProductosVendidos([]);
    setPapeleria(false);
    setNotas('');
  };

  const actualizarCantidad = (productoId: string, cantidad: string) => {
    const cantidadNum = parseInt(cantidad) || 0;
    
    const existe = productosVendidos.find(p => p.productoId === productoId);
    
    if (existe) {
      if (cantidadNum === 0) {
        setProductosVendidos(productosVendidos.filter(p => p.productoId !== productoId));
      } else {
        setProductosVendidos(
          productosVendidos.map(p =>
            p.productoId === productoId ? { ...p, cantidad: cantidadNum } : p
          )
        );
      }
    } else if (cantidadNum > 0) {
      const producto = productos.find(p => p.id === productoId);
      if (producto) {
        setProductosVendidos([
          ...productosVendidos,
          {
            productoId: producto.id,
            productoNombre: producto.nombre,
            cantidad: cantidadNum,
          },
        ]);
      }
    }
  };

  const getCantidadVendida = (productoId: string): number => {
    return productosVendidos.find(p => p.productoId === productoId)?.cantidad || 0;
  };

  const guardarVentaUber = async () => {
    if (productosVendidos.length === 0 && !papeleria) {
      Alert.alert('Error', 'Debes registrar al menos un producto o papelería');
      return;
    }

    // Verificar stock disponible
    for (const prodVenta of productosVendidos) {
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
    for (const prodVenta of productosVendidos) {
      const producto = productos.find(p => p.id === prodVenta.productoId);
      if (!producto) continue;

      const nuevoStock = producto.stock - prodVenta.cantidad;
      await updateProducto(producto.id, { stock: nuevoStock });
    }

    // Agregar papelería a las notas si está marcada
    const notasFinales = papeleria
      ? `${notas ? notas + ' | ' : ''}Incluye papelería`
      : notas;

    // Guardar venta con flag de Uber y total en 0
    const nuevaVenta: Venta = {
      id: Date.now().toString(),
      fecha: new Date(),
      productos: productosVendidos,
      total: 0, // Las ventas Uber no tienen precio
      esUber: true, // Flag para identificar ventas Uber
      notas: notasFinales ? `🚗 UBER${notasFinales ? ' | ' + notasFinales : ''}` : '🚗 UBER',
    };

    await addVenta(nuevaVenta);
    
    Alert.alert('Éxito', '¡Venta Uber registrada correctamente!');
    onSuccess();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' },
        ]}>
        <View style={styles.header}>
          <View>
            <ThemedText type="title">🚗 Venta Uber</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Sin registro de precio
            </ThemedText>
          </View>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.closeBtn}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Lista de productos */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Productos Vendidos</ThemedText>
            <ThemedText style={styles.subtitle}>
              Ingresa la cantidad de cada producto vendido
            </ThemedText>

            <View style={styles.productosList}>
              {productos.map((producto) => {
                const cantidadVendida = getCantidadVendida(producto.id);
                return (
                  <View
                    key={producto.id}
                    style={[
                      styles.productoItem,
                      {
                        backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f9f9f9',
                        borderColor: cantidadVendida > 0 ? '#ffa94d' : 'transparent',
                      },
                    ]}>
                    <View style={styles.productoInfo}>
                      <ThemedText type="defaultSemiBold">
                        {producto.nombre}
                      </ThemedText>
                      <ThemedText style={styles.stockText}>
                        Stock: {producto.stock} {producto.unidad}
                      </ThemedText>
                    </View>
                    <TextInput
                      style={[
                        styles.cantidadInput,
                        {
                          color: colorScheme === 'dark' ? '#fff' : '#000',
                          borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
                        },
                      ]}
                      value={cantidadVendida > 0 ? cantidadVendida.toString() : ''}
                      onChangeText={(val) => actualizarCantidad(producto.id, val)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Papelería */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.papeleriaContainer,
                {
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f9f9f9',
                  borderColor: papeleria ? '#ffa94d' : 'transparent',
                },
              ]}
              onPress={() => setPapeleria(!papeleria)}>
              <View style={styles.checkboxContainer}>
                <View
                  style={[
                    styles.checkbox,
                    papeleria && styles.checkboxActive,
                  ]}>
                  {papeleria && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                </View>
                <View>
                  <ThemedText type="defaultSemiBold">Incluye Papelería</ThemedText>
                  <ThemedText style={styles.papeleriaSubtext}>
                    (Ramos armados con flores sueltas)
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notas */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Notas (opcional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f9f9f9',
                },
              ]}
              value={notas}
              onChangeText={setNotas}
              placeholder="Ej: Pedido especial, urgente..."
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

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={guardarVentaUber}>
            <ThemedText style={styles.saveButtonText}>Guardar Venta Uber</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
  },
  closeBtn: {
    fontSize: 32,
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 4,
    marginBottom: 12,
  },
  productosList: {
    gap: 8,
  },
  productoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  productoInfo: {
    flex: 1,
  },
  stockText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  cantidadInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  papeleriaContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#ffa94d',
    borderColor: '#ffa94d',
  },
  checkmark: {
    color: '#fff',
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
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  infoText: {
    color: '#1565c0',
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#ffa94d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});