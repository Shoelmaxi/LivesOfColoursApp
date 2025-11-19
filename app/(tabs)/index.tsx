import { AddProductModal } from '@/components/add-product-modal';
import { DailyTotalHeader } from '@/components/daily-total-header';
import { EditProductModal } from '@/components/edit-product-modal';
import { ExportExcelModal } from '@/components/export-excel-modal';
import { FabMenu } from '@/components/fab-menu';
import { ImportExcelModal } from '@/components/import-excel-modal';
import { SalesModal } from '@/components/sales-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TurnoModal } from '@/components/turno-modal'; // ← NUEVO MODAL
import { UberSalesModal } from '@/components/uber-sales-modal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addMovimiento, addProducto, deleteProducto, generarId, getEstadoTurno, getProductos, updateProducto } from '@/services/storage';
import { Categoria, Movimiento, Producto } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function InventoryScreen() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<Categoria | 'todas'>('todas');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState<'merma' | 'abastecimiento' | 'ocupado_ramo'>('merma');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [notas, setNotas] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [salesModalVisible, setSalesModalVisible] = useState(false);
  const [uberSalesModalVisible, setUberSalesModalVisible] = useState(false);
  const [turnoModalVisible, setTurnoModalVisible] = useState(false);
  const [turnoAbierto, setTurnoAbierto] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    loadProductos();
    loadEstadoTurno();
  }, []);

  // Recargar estado del turno cada vez que la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      loadEstadoTurno();
    }, [])
  );

  const loadProductos = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    }
  };

  const loadEstadoTurno = async () => {
    try {
      const estado = await getEstadoTurno();
      setTurnoAbierto(estado.turnoAbierto);
    } catch (error) {
      console.error('Error al cargar estado del turno:', error);
    }
  };

  const productosFiltrados = productos.filter(p => 
    filtroCategoria === 'todas' ? true : p.categoria === filtroCategoria
  );

  const abrirModal = (producto: Producto, tipo: 'merma' | 'abastecimiento' | 'ocupado_ramo') => {
    setProductoSeleccionado(producto);
    setModalTipo(tipo);
    setCantidad('');
    setNotas('');
    setModalVisible(true);
  };

  const abrirEditarModal = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setEditModalVisible(true);
  };

  const guardarMovimiento = async () => {
    if (!productoSeleccionado || !cantidad || parseInt(cantidad) <= 0) {
      Alert.alert('Error', 'Por favor ingresa una cantidad válida');
      return;
    }

    const cantidadNum = parseInt(cantidad);
    
    if ((modalTipo === 'merma' || modalTipo === 'ocupado_ramo') && cantidadNum > productoSeleccionado.stock) {
      Alert.alert('Error', `No puedes registrar más ${modalTipo === 'merma' ? 'merma' : 'flores usadas'} que el stock disponible`);
      return;
    }

    try {
      // Actualizar stock
      const nuevoStock = modalTipo === 'abastecimiento'
        ? productoSeleccionado.stock + cantidadNum
        : productoSeleccionado.stock - cantidadNum;

      await updateProducto(productoSeleccionado.id, { stock: nuevoStock });

      // Registrar movimiento
      const movimiento: Movimiento = {
        id: generarId(),
        tipo: modalTipo,
        productoId: productoSeleccionado.id,
        productoNombre: productoSeleccionado.nombre,
        cantidad: cantidadNum,
        fecha: new Date(),
        notas: notas || undefined,
      };

      await addMovimiento(movimiento);
      await loadProductos();
      setModalVisible(false);

      const mensajes = {
        merma: 'Merma',
        abastecimiento: 'Abastecimiento',
        ocupado_ramo: 'Flores usadas en ramo',
      };

      Alert.alert('Éxito', `${mensajes[modalTipo]} registrado correctamente`);
    } catch (error) {
      console.error('Error al guardar movimiento:', error);
      Alert.alert('Error', 'Hubo un problema al registrar el movimiento. Por favor intenta nuevamente.');
    }
  };

  const handleSaveNewProduct = async (producto: Producto) => {
    try {
      await addProducto(producto);
      await loadProductos();
      Alert.alert('Éxito', 'Producto agregado correctamente');
    } catch (error) {
      console.error('Error al agregar producto:', error);
      Alert.alert('Error', 'No se pudo agregar el producto');
    }
  };

  const handleUpdateProduct = async (producto: Producto) => {
    try {
      await updateProducto(producto.id, producto);
      await loadProductos();
      Alert.alert('Éxito', 'Producto actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      Alert.alert('Error', 'No se pudo actualizar el producto');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteProducto(id);
      await loadProductos();
      Alert.alert('Éxito', 'Producto eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      Alert.alert('Error', 'No se pudo eliminar el producto');
    }
  };

  const handleTurnoSuccess = async () => {
    // Recargar productos y estado del turno
    await loadProductos();
    await loadEstadoTurno();
  };

  const getTituloModal = () => {
    switch (modalTipo) {
      case 'merma':
        return '🗑️ Registrar Merma';
      case 'abastecimiento':
        return '📦 Abastecimiento';
      case 'ocupado_ramo':
        return '💐 Flores Usadas en Ramo';
      default:
        return '';
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header con total del día */}
      <DailyTotalHeader />

      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#e0e0e0' },
            filtroCategoria === 'todas' && styles.filtroBtnActivo
          ]}
          onPress={() => setFiltroCategoria('todas')}>
          <ThemedText style={[
            styles.filtroBtnText,
            filtroCategoria === 'todas' && { color: '#fff' }
          ]}>Todas</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#e0e0e0' },
            filtroCategoria === 'ramos' && styles.filtroBtnActivo
          ]}
          onPress={() => setFiltroCategoria('ramos')}>
          <ThemedText style={[
            styles.filtroBtnText,
            filtroCategoria === 'ramos' && { color: '#fff' }
          ]}>Ramos</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#e0e0e0' },
            filtroCategoria === 'flores_sueltas' && styles.filtroBtnActivo
          ]}
          onPress={() => setFiltroCategoria('flores_sueltas')}>
          <ThemedText style={[
            styles.filtroBtnText,
            filtroCategoria === 'flores_sueltas' && { color: '#fff' }
          ]}>Flores Sueltas</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Lista de productos */}
      <ScrollView style={styles.scrollView}>
        {productosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No hay productos. Agrega uno desde el botón +
            </ThemedText>
          </View>
        ) : (
          productosFiltrados.map(producto => (
            <View 
              key={producto.id} 
              style={[
                styles.card,
                { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#ffffff' }
              ]}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onLongPress={() => abrirEditarModal(producto)}
                activeOpacity={0.7}>
                {producto.foto ? (
                  <Image source={{ uri: producto.foto }} style={styles.productImage} />
                ) : (
                  <View style={[
                    styles.placeholderImage,
                    { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }
                  ]}>
                    <ThemedText style={styles.placeholderText}>📷</ThemedText>
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <ThemedText type="defaultSemiBold">{producto.nombre}</ThemedText>
                    <TouchableOpacity 
                      onPress={() => abrirEditarModal(producto)}
                      style={styles.editIcon}>
                      <ThemedText style={styles.editIconText}>✏️</ThemedText>
                    </TouchableOpacity>
                  </View>
                  <ThemedText style={styles.stockText}>
                    Stock: {producto.stock} {producto.unidad}
                  </ThemedText>
                  {producto.stock <= producto.stockMinimo && (
                    <ThemedText style={styles.warningText}>⚠️ Stock bajo</ThemedText>
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.mermaBtn]}
                  onPress={() => abrirModal(producto, 'merma')}>
                  <ThemedText style={styles.actionBtnText}>➖ Merma</ThemedText>
                </TouchableOpacity>
                {producto.categoria === 'flores_sueltas' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.ramoBtn]}
                    onPress={() => abrirModal(producto, 'ocupado_ramo')}>
                    <ThemedText style={styles.actionBtnText}>💐 Ramo</ThemedText>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.abastBtn]}
                  onPress={() => abrirModal(producto, 'abastecimiento')}>
                  <ThemedText style={styles.actionBtnText}>➕ Abastecer</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Botón flotante con menú desplegable */}
      <FabMenu
        items={[
          {
            label: 'Agregar Producto',
            icon: '📦',
            color: '#0a7ea4',
            onPress: () => setAddModalVisible(true),
          },
          {
            label: 'Registrar Venta',
            icon: '💰',
            color: '#51cf66',
            onPress: () => setSalesModalVisible(true),
          },
          {
            label: 'Venta Uber',
            icon: '🚗',
            color: '#ffa94d',
            onPress: () => setUberSalesModalVisible(true),
          },
          {
            label: 'Exportar Excel',  // NUEVO
            icon: '📤',
            color: '#22c55e',
            onPress: () => setExportModalVisible(true),
          },
          {
            label: 'Importar Excel',  // NUEVO
            icon: '📥',
            color: '#845ef7',
            onPress: () => setImportModalVisible(true),
          },
          {
            label: turnoAbierto ? 'Cerrar Turno' : 'Iniciar Turno',
            icon: turnoAbierto ? '🌙' : '🌅',
            color: turnoAbierto ? '#f97316' : '#10b981',
            onPress: () => setTurnoModalVisible(true),
          },
        ]}
      />

      {/* Modal de exportar excel */}
      <ExportExcelModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />

      {/* Modal de importar excel */}
      <ImportExcelModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSuccess={loadProductos}
      />
      {/* Modal de agregar producto */}
      <AddProductModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleSaveNewProduct}
      />

      {/* Modal de editar producto */}
      <EditProductModal
        visible={editModalVisible}
        producto={productoSeleccionado}
        onClose={() => {
          setEditModalVisible(false);
          setProductoSeleccionado(null);
        }}
        onSave={handleUpdateProduct}
        onDelete={handleDeleteProduct}
      />

      {/* Modal de ventas */}
      <SalesModal
        visible={salesModalVisible}
        onClose={() => setSalesModalVisible(false)}
        onSuccess={loadProductos}
      />

      {/* Modal de ventas Uber */}
      <UberSalesModal
        visible={uberSalesModalVisible}
        onClose={() => setUberSalesModalVisible(false)}
        onSuccess={loadProductos}
      />

      {/* Modal de turno (dinámico: inicio o cierre) */}
      <TurnoModal
        visible={turnoModalVisible}
        onClose={() => setTurnoModalVisible(false)}
        onSuccess={handleTurnoSuccess}
      />

      {/* Modal de merma/abastecimiento/ramo */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff' }
          ]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {getTituloModal()}
            </ThemedText>
            
            <ThemedText style={styles.modalProductName}>
              {productoSeleccionado?.nombre}
            </ThemedText>

            <View style={styles.inputContainer}>
              <ThemedText>Cantidad:</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { 
                    color: colorScheme === 'dark' ? '#fff' : '#000',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ccc'
                  }
                ]}
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText>Notas:</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { 
                    color: colorScheme === 'dark' ? '#fff' : '#000',
                    borderColor: colorScheme === 'dark' ? '#555' : '#ccc'
                  }
                ]}
                value={notas}
                onChangeText={setNotas}
                placeholder="Opcional"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}>
                <ThemedText style={styles.modalBtnText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={guardarMovimiento}>
                <ThemedText style={styles.modalBtnText}>Guardar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtrosContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filtroBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  filtroBtnActivo: {
    backgroundColor: '#0a7ea4',
  },
  filtroBtnText: {
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeholderText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editIcon: {
    padding: 4,
  },
  editIconText: {
    fontSize: 18,
  },
  stockText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  mermaBtn: {
    backgroundColor: '#ff6b6b',
  },
  ramoBtn: {
    backgroundColor: '#9775fa',
  },
  abastBtn: {
    backgroundColor: '#51cf66',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalProductName: {
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 20,
    opacity: 0.8,
  },
  inputContainer: {
    marginBottom: 16,
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#999',
  },
  saveBtn: {
    backgroundColor: '#0a7ea4',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});