import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { addMovimiento, addProducto, addVenta, getProductos, updateProducto } from '@/services/storage';
import { Movimiento, Producto, Venta } from '@/types';
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

export function ImportExcelModal({ visible, onClose, onSuccess }: ImportExcelModalProps) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    inventario: any[];
    ventas: any[];
  } | null>(null);
  const colorScheme = useColorScheme();

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

      // Leer el archivo
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Parsear el Excel
      const workbook = XLSX.read(fileContent, { type: 'base64' });

      // Procesar hoja de Inventario
      let inventarioData: any[] = [];
      if (workbook.SheetNames.includes('Inventario')) {
        const inventarioSheet = workbook.Sheets['Inventario'];
        inventarioData = XLSX.utils.sheet_to_json(inventarioSheet);
      }

      // Procesar hoja de Ventas
      let ventasData: any[] = [];
      if (workbook.SheetNames.includes('Ventas')) {
        const ventasSheet = workbook.Sheets['Ventas'];
        ventasData = XLSX.utils.sheet_to_json(ventasSheet);
      }

      // Mostrar preview
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

  const importarDatos = async () => {
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

        if (productoExistente) {
          // Actualizar producto existente
          await updateProducto(productoExistente.id, {
            stock: row['Inventario Final'] || productoExistente.stock,
            stockApertura: row['Inventario Apertura'] || productoExistente.stockApertura,
          });
          productosActualizados++;

          // Registrar movimientos si hay
          if (row['Abastecimiento'] && row['Abastecimiento'] > 0) {
            const movimiento: Movimiento = {
              id: Date.now().toString() + Math.random(),
              tipo: 'abastecimiento',
              productoId: productoExistente.id,
              productoNombre: productoExistente.nombre,
              cantidad: row['Abastecimiento'],
              fecha: new Date(),
              notas: 'Importado desde Excel',
            };
            await addMovimiento(movimiento);
          }

          if (row['Mermas'] && row['Mermas'] > 0) {
            const movimiento: Movimiento = {
              id: Date.now().toString() + Math.random(),
              tipo: 'merma',
              productoId: productoExistente.id,
              productoNombre: productoExistente.nombre,
              cantidad: row['Mermas'],
              fecha: new Date(),
              notas: 'Importado desde Excel',
            };
            await addMovimiento(movimiento);
          }
        } else {
          // Crear nuevo producto
          const nuevoProducto: Producto = {
            id: Date.now().toString() + Math.random(),
            nombre: nombreProducto,
            categoria: 'flores_sueltas',
            stock: row['Inventario Final'] || 0,
            stockMinimo: 5,
            stockApertura: row['Inventario Apertura'] || 0,
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

        // Parsear productos
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

        // Parsear precio
        const precioStr = row['Precio'] || '0';
        const esUber = precioStr === 'UBER';
        const precio = esUber ? 0 : parseInt(precioStr.replace(/[^\d]/g, '')) || 0;

        // Parsear método de pago
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

      Alert.alert(
        '✅ Importación exitosa',
        `Se importaron:\n• ${productosImportados} productos nuevos\n• ${productosActualizados} productos actualizados\n• ${ventasImportadas} ventas`,
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

  const handleClose = () => {
    setPreviewData(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
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
                Selecciona un archivo Excel exportado previamente para importar los datos de inventario y ventas.
              </ThemedText>

              <View style={styles.infoContainer}>
                <ThemedText style={styles.infoItem}>
                  • El archivo debe tener las hojas "Inventario" y "Ventas"
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Los productos existentes se actualizarán
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Los productos nuevos se agregarán
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Las ventas se agregarán al historial
                </ThemedText>
              </View>

              <View style={styles.warningBox}>
                <ThemedText style={styles.warningText}>
                  ⚠️ Esta acción modificará tu inventario actual. Asegúrate de que el archivo sea correcto.
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
          ) : (
            <>
              <ThemedText style={styles.modalDescription}>
                Vista previa de los datos a importar:
              </ThemedText>

              <ScrollView style={styles.previewContainer}>
                <View style={styles.previewSection}>
                  <ThemedText type="defaultSemiBold" style={styles.previewTitle}>
                    📦 Inventario ({previewData.inventario.length} productos)
                  </ThemedText>
                  {previewData.inventario.slice(0, 5).map((item, index) => (
                    <ThemedText key={index} style={styles.previewItem}>
                      • {item['Nombre Producto']} - Stock: {item['Inventario Final']}
                    </ThemedText>
                  ))}
                  {previewData.inventario.length > 5 && (
                    <ThemedText style={styles.previewMore}>
                      ... y {previewData.inventario.length - 5} más
                    </ThemedText>
                  )}
                </View>

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
                    onPress={handleClose}>
                    <ThemedText style={styles.modalBtnText}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.confirmBtn]}
                    onPress={importarDatos}>
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
    maxHeight: '80%',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 16,
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
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 13,
    lineHeight: 18,
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