import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getMovimientos, getProductos, getVentas } from '@/services/storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { utils, write } from 'xlsx';

interface CierreTurnoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CierreTurnoModal({ visible, onClose }: CierreTurnoModalProps) {
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

  const generarReporteInventario = async () => {
    const productos = await getProductos();
    const movimientos = await getMovimientos();
    const ventas = await getVentas();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Filtrar movimientos del día
    const movimientosHoy = movimientos.filter(m => {
      const fechaMov = new Date(m.fecha);
      fechaMov.setHours(0, 0, 0, 0);
      return fechaMov.getTime() === hoy.getTime();
    });

    // Filtrar ventas del día
    const ventasHoy = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      fechaVenta.setHours(0, 0, 0, 0);
      return fechaVenta.getTime() === hoy.getTime();
    });

    // Calcular datos por producto
    const datosInventario = productos.map(producto => {
      const stockApertura = producto.stockApertura || producto.stock;
      
      const abastecimiento = movimientosHoy
        .filter(m => m.productoId === producto.id && m.tipo === 'abastecimiento')
        .reduce((sum, m) => sum + m.cantidad, 0);

      const mermas = movimientosHoy
        .filter(m => m.productoId === producto.id && m.tipo === 'merma')
        .reduce((sum, m) => sum + m.cantidad, 0);

      const ocupadoRamo = movimientosHoy
        .filter(m => m.productoId === producto.id && m.tipo === 'ocupado_ramo')
        .reduce((sum, m) => sum + m.cantidad, 0);

      // Calcular vendidos
      const vendidos = ventasHoy.reduce((sum, venta) => {
        const prodVenta = venta.productos.find(p => p.productoId === producto.id);
        return sum + (prodVenta?.cantidad || 0);
      }, 0);

      const inventarioFinal = producto.stock;

      return {
        'Nombre Producto': producto.nombre,
        'Inventario Apertura': stockApertura,
        'Abastecimiento': abastecimiento,
        'Vendidos': vendidos,
        'Ocupado en Ramo': ocupadoRamo,
        'Mermas': mermas,
        'Inventario Final': inventarioFinal,
      };
    });

    return datosInventario;
  };

  const generarReporteVentas = async () => {
    const ventas = await getVentas();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Filtrar ventas del día
    const ventasHoy = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      fechaVenta.setHours(0, 0, 0, 0);
      return fechaVenta.getTime() === hoy.getTime();
    });

    // Crear una fila por cada venta
    const datosVentas = ventasHoy.map(venta => {
      const fecha = new Date(venta.fecha);
      const hora = fecha.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });

      const productosTexto = venta.productos
        .map(p => `${p.productoNombre} (x${p.cantidad})`)
        .join(', ');

      return {
        'Productos': productosTexto,
        'Precio': venta.esUber ? 'UBER' : `$${venta.total}`,
        'Hora': hora,
        'Notas': venta.notas || '',
      };
    });

    return datosVentas;
  };

  const exportarExcel = async () => {
    setLoading(true);
    try {
      // Generar datos
      const datosInventario = await generarReporteInventario();
      const datosVentas = await generarReporteVentas();

      if (datosInventario.length === 0 && datosVentas.length === 0) {
        Alert.alert('Sin datos', 'No hay información para exportar del día de hoy');
        setLoading(false);
        return;
      }

      // Crear workbook
      const wb = utils.book_new();

      // Agregar hoja de inventario
      if (datosInventario.length > 0) {
        const wsInventario = utils.json_to_sheet(datosInventario);
        utils.book_append_sheet(wb, wsInventario, 'Inventario');
      }

      // Agregar hoja de ventas
      if (datosVentas.length > 0) {
        const wsVentas = utils.json_to_sheet(datosVentas);
        utils.book_append_sheet(wb, wsVentas, 'Ventas');
      }

      // Generar archivo
      const wbout = write(wb, { type: 'base64', bookType: 'xlsx' });

      // Guardar archivo
      const fecha = new Date().toISOString().split('T')[0];
      const fileName = `Cierre_Turno_${fecha}.xlsx`;
      
      // Usar cacheDirectory en lugar de documentDirectory
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Compartir archivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Exportar Cierre de Turno',
          UTI: 'com.microsoft.excel.xlsx',
        });

        Alert.alert('Éxito', 'Excel exportado correctamente');
        onClose();
      } else {
        Alert.alert('Error', 'No se puede compartir archivos en este dispositivo');
      }
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      Alert.alert('Error', 'Hubo un problema al exportar el archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = () => {
    Alert.alert(
      'Confirmar Cierre de Turno',
      '¿Estás seguro de que deseas realizar el cierre de turno? Se exportará un archivo Excel con toda la información del día.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: exportarExcel,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#fff' },
          ]}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            📊 Cierre de Turno
          </ThemedText>

          <ThemedText style={styles.modalDescription}>
            Se generará un archivo Excel con dos hojas:
          </ThemedText>

          <View style={styles.infoContainer}>
            <ThemedText style={styles.infoItem}>
              • <ThemedText type="defaultSemiBold">Inventario:</ThemedText> Reporte
              completo de movimientos
            </ThemedText>
            <ThemedText style={styles.infoItem}>
              • <ThemedText type="defaultSemiBold">Ventas:</ThemedText> Detalle de todas
              las ventas del día
            </ThemedText>
          </View>

          <View style={styles.warningBox}>
            <ThemedText style={styles.warningText}>
              ⚠️ Asegúrate de haber registrado todas las operaciones del día antes de
              continuar
            </ThemedText>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a7ea4" />
              <ThemedText style={styles.loadingText}>Generando Excel...</ThemedText>
            </View>
          ) : (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={onClose}>
                <ThemedText style={styles.modalBtnText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleConfirmar}>
                <ThemedText style={styles.modalBtnText}>Exportar Excel</ThemedText>
              </TouchableOpacity>
            </View>
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
    width: '85%',
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