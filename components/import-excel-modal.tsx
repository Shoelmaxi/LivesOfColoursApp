import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addProducto, addVenta, getEstadoTurno, getProductos, setEstadoTurno, updateProducto } from '@/services/storage';
import { Producto, Venta } from '@/types';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

// Importaciones condicionales
let XLSX: any;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.log('Error cargando XLSX:', e);
}

interface ImportExcelModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModoImportacion = 'traspaso' | 'nuevo' | null;

export function ImportExcelModal({ visible, onClose, onSuccess }: ImportExcelModalProps) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    inventario: any[];
    ventas: any[];
  } | null>(null);
  const [modoSeleccionado, setModoSeleccionado] = useState<ModoImportacion>(null);
  const [turnoActualAbierto, setTurnoActualAbierto] = useState(false);
  const colorScheme = useColorScheme();

  const handleOpen = async () => {
    // Verificar estado del turno actual al abrir el modal
    const estado = await getEstadoTurno();
    setTurnoActualAbierto(estado.turnoAbierto);
  };

  const pickExcelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      await processExcelFile(file.uri);
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const processExcelFile = async (uri: string) => {
    setLoading(true);
    try {
      if (!XLSX) {
        Alert.alert('Error', 'La librería XLSX no está disponible');
        setLoading(false);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(fileContent, { type: 'base64' });

      let inventarioData: any[] = [];
      if (workbook.SheetNames.includes('Inventario')) {
        const inventarioSheet = workbook.Sheets['Inventario'];
        inventarioData = XLSX.utils.sheet_to_json(inventarioSheet);
      }

      let ventasData: any[] = [];
      if (workbook.SheetNames.includes('Ventas')) {
        const ventasSheet = workbook.Sheets['Ventas'];
        ventasData = XLSX.utils.sheet_to_json(ventasSheet);
      }

      setPreviewData({
        inventario: inventarioData,
        ventas: ventasData,
      });

      setLoading(false);
    } catch (error: any) {
      console.error('Error al procesar Excel:', error);
      Alert.alert('Error', `No se pudo procesar el archivo: ${error.message}`);
      setLoading(false);
    }
  };

  const importarDatosTraspaso = async () => {
    if (!previewData) return;

    setLoading(true);
    try {
      const productosActuales = await getProductos();

      // Importar inventario
      let productosImportados = 0;
      let productosActualizados = 0;

      for (const row of previewData.inventario) {
        const nombreProducto = row['Nombre Producto'];
        if (!nombreProducto) continue;

        const productoExistente = productosActuales.find(
          p => p.nombre.toLowerCase() === nombreProducto.toLowerCase()
        );

        // Usar "Inventario Final" si existe, sino "Inventario Cierre", sino "Stock Actual"
        const stockFinal = row['Inventario Final'] ?? row['Inventario Cierre'] ?? row['Stock Actual'] ?? 0;
        const stockApertura = row['Inventario Apertura'] ?? stockFinal;

        if (productoExistente) {
          // Actualizar producto existente manteniendo stockApertura original del Excel
          await updateProducto(productoExistente.id, {
            stock: stockFinal,
            stockApertura: stockApertura,
          });
          productosActualizados++;
        } else {
          // Crear nuevo producto
          const nuevoProducto: Producto = {
            id: Date.now().toString() + Math.random(),
            nombre: nombreProducto,
            categoria: 'flores_sueltas',
            stock: stockFinal,
            stockMinimo: 5,
            stockApertura: stockApertura,
            unidad: 'unidad',
            fechaCreacion: new Date(),
          };
          await addProducto(nuevoProducto);
          productosImportados++;
        }
      }

      // Importar ventas
      let ventasImportadas = 0;
      for (const row of previewData.ventas) {
        if (!row['Productos']) continue;

        const productosTexto = row['Productos'];
        const productos = productosTexto.split(',').map((p: string) => {
          const match = p.trim().match(/^(.+?)\s*\(x(\d+)\)$/);
          if (match) {
            const nombre = match[1].trim();
            const cantidad = parseInt(match[2]);
            const producto = productosActuales.find(
              prod => prod.nombre.toLowerCase() === nombre.toLowerCase()
            );
            return {
              productoId: producto?.id || 'unknown',
              productoNombre: nombre,
              cantidad,
            };
          }
          return null;
        }).filter(Boolean);

        const precioStr = row['Precio'] || '0';
        const esUber = precioStr === 'UBER';
        const precio = esUber ? 0 : parseInt(precioStr.replace(/[^\d]/g, '')) || 0;

        const metodoPagoStr = row['Método de Pago'] || 'Efectivo';
        let metodoPago: any = 'efectivo';
        if (metodoPagoStr.toLowerCase().includes('transferencia')) {
          metodoPago = 'transferencia';
        } else if (metodoPagoStr.toLowerCase().includes('debito')) {
          metodoPago = 'debito';
        }

        const venta: Venta = {
          id: Date.now().toString() + Math.random(),
          fecha: new Date(),
          productos,
          total: precio,
          metodoPago: esUber ? undefined : metodoPago,
          esUber,
          notas: row['Notas'] || 'Importado desde Excel',
        };

        await addVenta(venta);
        ventasImportadas++;
      }

      // MANTENER TURNO ABIERTO (Traspaso)
      await setEstadoTurno({
        turnoAbierto: true,
        fechaApertura: (await getEstadoTurno()).fechaApertura || new Date(),
      });

      Alert.alert(
        '✅ Traspaso exitoso',
        `Datos importados:\n• ${productosImportados} productos nuevos\n• ${productosActualizados} productos actualizados\n• ${ventasImportadas} ventas\n\n🔄 El turno continúa abierto`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al importar datos:', error);
      Alert.alert('Error', `Hubo un problema al importar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const importarDatosNuevoTurno = async () => {
    if (!previewData) return;

    setLoading(true);
    try {
      const productosActuales = await getProductos();

      // Importar inventario
      let productosImportados = 0;
      let productosActualizados = 0;

      for (const row of previewData.inventario) {
        const nombreProducto = row['Nombre Producto'];
        if (!nombreProducto) continue;

        // Para nuevo turno: usar "Inventario Cierre" del turno anterior
        const inventarioCierre = row['Inventario Cierre'] ?? row['Inventario Final'] ?? row['Stock Actual'] ?? 0;

        const productoExistente = productosActuales.find(
          p => p.nombre.toLowerCase() === nombreProducto.toLowerCase()
        );

        if (productoExistente) {
          // El cierre del turno anterior es la apertura del nuevo
          await updateProducto(productoExistente.id, {
            stock: inventarioCierre,
            stockApertura: inventarioCierre,
          });
          productosActualizados++;
        } else {
          const nuevoProducto: Producto = {
            id: Date.now().toString() + Math.random(),
            nombre: nombreProducto,
            categoria: 'flores_sueltas',
            stock: inventarioCierre,
            stockMinimo: 5,
            stockApertura: inventarioCierre,
            unidad: 'unidad',
            fechaCreacion: new Date(),
          };
          await addProducto(nuevoProducto);
          productosImportados++;
        }
      }

      // NO importar ventas (ya pertenecen al turno anterior)

      // INICIAR NUEVO TURNO
      await setEstadoTurno({
        turnoAbierto: true,
        fechaApertura: new Date(),
      });

      Alert.alert(
        '✅ Nuevo turno iniciado',
        `Inventario importado:\n• ${productosImportados} productos nuevos\n• ${productosActualizados} productos actualizados\n\n🌅 Nuevo turno iniciado con el inventario del cierre anterior`,
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al importar datos:', error);
      Alert.alert('Error', `Hubo un problema al importar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportar = () => {
    if (modoSeleccionado === 'traspaso') {
      importarDatosTraspaso();
    } else if (modoSeleccionado === 'nuevo') {
      importarDatosNuevoTurno();
    }
  };

  const handleClose = () => {
    setPreviewData(null);
    setModoSeleccionado(null);
    onClose();
  };

  const handleModalOpen = () => {
    handleOpen();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      onShow={handleModalOpen}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff' },
          ]}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            📥 Importar Excel
          </ThemedText>

          {!previewData ? (
            <>
              <ThemedText style={styles.modalDescription}>
                Selecciona un archivo Excel exportado previamente para importar los datos.
              </ThemedText>

              {turnoActualAbierto && (
                <View style={[styles.warningBox, { backgroundColor: '#fff3cd', borderColor: '#ffc107' }]}>
                  <ThemedText style={[styles.warningText, { color: '#856404' }]}>
                    ⚠️ Tienes un turno abierto. Al importar, puedes elegir continuar el turno o iniciar uno nuevo.
                  </ThemedText>
                </View>
              )}

              <View style={styles.infoContainer}>
                <ThemedText style={styles.infoItem}>
                  • El archivo debe tener las hojas "Inventario" y "Ventas"
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Elige el modo de importación que necesites
                </ThemedText>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0a7ea4" />
                  <ThemedText style={styles.loadingText}>Procesando archivo...</ThemedText>
                </View>
              ) : (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={handleClose}>
                    <ThemedText style={styles.modalBtnText}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.confirmBtn]}
                    onPress={pickExcelFile}>
                    <ThemedText style={styles.modalBtnText}>Seleccionar archivo</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : !modoSeleccionado ? (
            <>
              <ThemedText style={styles.modalDescription}>
                Selecciona cómo deseas importar los datos:
              </ThemedText>

              {/* Opción Traspaso */}
              <TouchableOpacity
                style={[
                  styles.modoCard,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f0f9ff',
                    borderColor: '#3b82f6'
                  }
                ]}
                onPress={() => setModoSeleccionado('traspaso')}>
                <View style={styles.modoHeader}>
                  <ThemedText type="defaultSemiBold" style={[styles.modoTitle, { color: '#3b82f6' }]}>
                    🔄 Traspaso de Turno
                  </ThemedText>
                </View>
                <ThemedText style={styles.modoDescription}>
                  Continúa el mismo turno en este dispositivo
                </ThemedText>
                <View style={styles.modoDetails}>
                  <ThemedText style={styles.modoDetailItem}>✓ Mantiene inventario de apertura</ThemedText>
                  <ThemedText style={styles.modoDetailItem}>✓ Importa todas las ventas</ThemedText>
                  <ThemedText style={styles.modoDetailItem}>✓ El turno sigue abierto</ThemedText>
                </View>
                <View style={[styles.modoBadge, { backgroundColor: '#3b82f6' }]}>
                  <ThemedText style={styles.modoBadgeText}>👥 Cambio de dispositivo</ThemedText>
                </View>
              </TouchableOpacity>

              {/* Opción Nuevo Turno */}
              <TouchableOpacity
                style={[
                  styles.modoCard,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f0fdf4',
                    borderColor: '#10b981'
                  }
                ]}
                onPress={() => setModoSeleccionado('nuevo')}>
                <View style={styles.modoHeader}>
                  <ThemedText type="defaultSemiBold" style={[styles.modoTitle, { color: '#10b981' }]}>
                    🌅 Nuevo Turno
                  </ThemedText>
                </View>
                <ThemedText style={styles.modoDescription}>
                  Inicia un nuevo turno con el inventario del cierre anterior
                </ThemedText>
                <View style={styles.modoDetails}>
                  <ThemedText style={styles.modoDetailItem}>✓ Cierre anterior = Apertura nueva</ThemedText>
                  <ThemedText style={styles.modoDetailItem}>✓ NO importa ventas antiguas</ThemedText>
                  <ThemedText style={styles.modoDetailItem}>✓ Inicia turno fresco</ThemedText>
                </View>
                <View style={[styles.modoBadge, { backgroundColor: '#10b981' }]}>
                  <ThemedText style={styles.modoBadgeText}>📅 Cambio de día/turno</ThemedText>
                </View>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setPreviewData(null)}>
                  <ThemedText style={styles.modalBtnText}>← Atrás</ThemedText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ThemedText style={styles.modalDescription}>
                Vista previa - Modo: {modoSeleccionado === 'traspaso' ? '🔄 Traspaso' : '🌅 Nuevo Turno'}
              </ThemedText>

              <ScrollView style={styles.previewContainer}>
                <View style={styles.previewSection}>
                  <ThemedText type="defaultSemiBold" style={styles.previewTitle}>
                    📦 Inventario ({previewData.inventario.length} productos)
                  </ThemedText>
                  {previewData.inventario.slice(0, 5).map((item, index) => {
                    const stockFinal = item['Inventario Final'] ?? item['Inventario Cierre'] ?? item['Stock Actual'];
                    const stockApertura = item['Inventario Apertura'];
                    return (
                      <ThemedText key={index} style={styles.previewItem}>
                        • {item['Nombre Producto']} - Apertura: {stockApertura} → Final: {stockFinal}
                      </ThemedText>
                    );
                  })}
                  {previewData.inventario.length > 5 && (
                    <ThemedText style={styles.previewMore}>
                      ... y {previewData.inventario.length - 5} más
                    </ThemedText>
                  )}
                </View>

                {modoSeleccionado === 'traspaso' && (
                  <View style={styles.previewSection}>
                    <ThemedText type="defaultSemiBold" style={styles.previewTitle}>
                      💰 Ventas ({previewData.ventas.length} registros)
                    </ThemedText>
                    {previewData.ventas.slice(0, 5).map((item, index) => (
                      <ThemedText key={index} style={styles.previewItem}>
                        • {item['Hora']} - {item['Precio']}
                      </ThemedText>
                    ))}
                    {previewData.ventas.length > 5 && (
                      <ThemedText style={styles.previewMore}>
                        ... y {previewData.ventas.length - 5} más
                      </ThemedText>
                    )}
                  </View>
                )}

                {modoSeleccionado === 'nuevo' && (
                  <View style={[styles.infoBox, { backgroundColor: '#dbeafe', borderColor: '#93c5fd' }]}>
                    <ThemedText style={[styles.infoBoxText, { color: '#1e40af' }]}>
                      ℹ️ Las ventas NO se importarán. Solo el inventario de cierre se usará como apertura del nuevo turno.
                    </ThemedText>
                  </View>
                )}
              </ScrollView>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0a7ea4" />
                  <ThemedText style={styles.loadingText}>Importando datos...</ThemedText>
                </View>
              ) : (
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.cancelBtn]}
                    onPress={() => setModoSeleccionado(null)}>
                    <ThemedText style={styles.modalBtnText}>← Cambiar modo</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.confirmBtn]}
                    onPress={handleImportar}>
                    <ThemedText style={styles.modalBtnText}>Importar</ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  infoContainer: {
    marginBottom: 16,
    gap: 8,
  },
  infoItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  modoHeader: {
    marginBottom: 8,
  },
  modoTitle: {
    fontSize: 18,
  },
  modoDescription: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  modoDetails: {
    gap: 6,
    marginBottom: 12,
  },
  modoDetailItem: {
    fontSize: 13,
    opacity: 0.7,
  },
  modoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  previewContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  previewItem: {
    fontSize: 13,
    opacity: 0.8,
    marginLeft: 8,
    marginBottom: 4,
  },
  previewMore: {
    fontSize: 13,
    opacity: 0.6,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
  },
  infoBoxText: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
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
  confirmBtn: {
    backgroundColor: '#0a7ea4',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});