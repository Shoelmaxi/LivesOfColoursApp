import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getProductos, updateProducto } from '@/services/storage';
import { Producto } from '@/types';
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

interface ResetInventoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetInventoryModal({ visible, onClose, onSuccess }: ResetInventoryModalProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nuevosStocks, setNuevosStocks] = useState<{ [key: string]: string }>({});
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (visible) {
      loadProductos();
    }
  }, [visible]);

  const loadProductos = async () => {
    const prods = await getProductos();
    setProductos(prods);
    
    // Inicializar los nuevos stocks con los valores actuales
    const stocks: { [key: string]: string } = {};
    prods.forEach(p => {
      stocks[p.id] = p.stock.toString();
    });
    setNuevosStocks(stocks);
  };

  const actualizarStock = (productoId: string, valor: string) => {
    setNuevosStocks({
      ...nuevosStocks,
      [productoId]: valor,
    });
  };

 const resetearInventario = async () => {
    Alert.alert(
      'Confirmar Reset',
      '¿Estás seguro de que deseas actualizar todo el inventario? Esta acción guardará estos valores como stock de apertura del día.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Actualizar todos los productos
              for (const producto of productos) {
                const nuevoStock = parseInt(nuevosStocks[producto.id]) || 0;
                await updateProducto(producto.id, { 
                  stock: nuevoStock,
                  stockApertura: nuevoStock, // Guardar como stock de apertura
                });
              }

              Alert.alert('Éxito', 'Inventario actualizado correctamente');
              onSuccess();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Hubo un problema al actualizar el inventario');
            }
          },
        },
      ]
    );
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
            <ThemedText type="title">Reset Inventario</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              Actualiza el stock de todos los productos
            </ThemedText>
          </View>
          <TouchableOpacity onPress={onClose}>
            <ThemedText style={styles.closeBtn}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.warningBox}>
            <ThemedText style={styles.warningText}>
              ⚠️ Esto actualizará el stock de todos los productos. Úsalo cuando necesites
              registrar un inventario completo desde cero.
            </ThemedText>
          </View>

          <View style={styles.productosList}>
            {productos.map((producto) => (
              <View
                key={producto.id}
                style={[
                  styles.productoItem,
                  { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f9f9f9' },
                ]}>
                <View style={styles.productoInfo}>
                  <ThemedText type="defaultSemiBold">{producto.nombre}</ThemedText>
                  <ThemedText style={styles.stockActual}>
                    Stock actual: {producto.stock} {producto.unidad}
                  </ThemedText>
                  <ThemedText style={styles.categoria}>
                    {producto.categoria === 'ramos' ? '🌹 Ramos' : '🌸 Flores Sueltas'}
                  </ThemedText>
                </View>
                <View style={styles.inputContainer}>
                  <ThemedText style={styles.inputLabel}>Nuevo stock:</ThemedText>
                  <TextInput
                    style={[
                      styles.stockInput,
                      {
                        color: colorScheme === 'dark' ? '#fff' : '#000',
                        borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                        backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
                      },
                    ]}
                    value={nuevosStocks[producto.id] || ''}
                    onChangeText={(val) => actualizarStock(producto.id, val)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetearInventario}>
            <ThemedText style={styles.resetButtonText}>
              Actualizar Inventario
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
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  productosList: {
    gap: 12,
  },
  productoItem: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productoInfo: {
    marginBottom: 12,
  },
  stockActual: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  categoria: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  stockInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});