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
import * as XLSX from 'xlsx';

interface ExportExcelModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ExportExcelModal({ visible, onClose }: ExportExcelModalProps) {
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

  const generarReporteInventario = async () => {
    const productos = await getProductos();
    const movimientos = await getMovimientos();
    const ventas = await getVentas();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const movimientosHoy = movimientos.filter(m => {
      const fechaMov = new Date(m.fecha);
      fechaMov.setHours(0, 0, 0, 0);
      return fechaMov.getTime() === hoy.getTime();
    });

    const ventasHoy = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      fechaVenta.setHours(0, 0, 0, 0);
      return fechaVenta.getTime() === hoy.getTime();
    });

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

      const vendidos = ventasHoy.reduce((sum, venta) => {
        const prodVenta = venta.productos.find(p => p.productoId === producto.id);
        return sum + (prodVenta?.cantidad || 0);
      }, 0);

      // Para exportación durante turno: incluimos el stock actual como "Inventario Final"
      return {
        'Nombre Producto': producto.nombre,
        'Inventario Apertura': stockApertura,
        'Abastecimiento': abastecimiento,
        'Vendidos': vendidos,
        'Ocupado en Ramo': ocupadoRamo,
        'Mermas': mermas,
        'Inventario Final': producto.stock, // ← CLAVE: Stock actual del momento
      };
    });

    return datosInventario;
  };

  const generarReporteVentas = async () => {
    const ventas = await getVentas();

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const ventasHoy = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      fechaVenta.setHours(0, 0, 0, 0);
      return fechaVenta.getTime() === hoy.getTime();
    });

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

      const metodoPagoTexto = venta.esUber 
        ? 'UBER' 
        : (venta.metodoPago 
          ? venta.metodoPago.charAt(0).toUpperCase() + venta.metodoPago.slice(1)
          : 'Efectivo');

      return {
        'Hora': hora,
        'Productos': productosTexto,
        'Precio': venta.esUber ? 'UBER' : `$${venta.total}`,
        'Método de Pago': metodoPagoTexto,
        'Notas': venta.notas || '',
      };
    });

    return datosVentas;
  };

  const exportarExcel = async () => {
    // Verificar que los módulos estén disponibles
    if (!FileSystem?.cacheDirectory || !Sharing?.shareAsync || !XLSX?.utils) {
      Alert.alert(
        'Error',
        'Las librerías necesarias no están instaladas correctamente.'
      );
      return;
    }

    setLoading(true);
    try {
      const datosInventario = await generarReporteInventario();
      const datosVentas = await generarReporteVentas();

      if (datosInventario.length === 0 && datosVentas.length === 0) {
        Alert.alert('Sin datos', 'No hay información para exportar');
        setLoading(false);
        return;
      }

      const wb = XLSX.utils.book_new();

      if (datosInventario.length > 0) {
        const wsInventario = XLSX.utils.json_to_sheet(datosInventario);
        XLSX.utils.book_append_sheet(wb, wsInventario, 'Inventario');
      }

      if (datosVentas.length > 0) {
        const wsVentas = XLSX.utils.json_to_sheet(datosVentas);
        XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');
      }

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const ahora = new Date();
      const fecha = ahora.toISOString().split('T')[0];
      const hora = ahora.toTimeString().split(' ')[0].replace(/:/g, '-');
      const fileName = `Reporte_${fecha}_${hora}.xlsx`;
      
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Exportar Reporte',
          UTI: 'com.microsoft.excel.xlsx',
        });

        Alert.alert('✅ Éxito', 'Excel exportado correctamente');
        onClose();
      } else {
        Alert.alert('Error', 'No se puede compartir archivos en este dispositivo');
      }
    } catch (error: any) {
      console.error('Error al exportar Excel:', error);
      Alert.alert('Error', `Hubo un problema: ${error.message || 'Desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = () => {
    Alert.alert(
      'Exportar Excel',
      '¿Deseas exportar el reporte actual del inventario y ventas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar',
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
            📤 Exportar Excel
          </ThemedText>

          <ThemedText style={styles.modalDescription}>
            Se generará un archivo Excel con la información actual:
          </ThemedText>

          <View style={styles.infoContainer}>
            <ThemedText style={styles.infoItem}>
              • <ThemedText type="defaultSemiBold">Inventario:</ThemedText> Stock actual y movimientos del día
            </ThemedText>
            <ThemedText style={styles.infoItem}>
              • <ThemedText type="defaultSemiBold">Ventas:</ThemedText> Todas las ventas registradas hoy
            </ThemedText>
          </View>

          <View style={styles.infoBox}>
            <ThemedText style={styles.infoBoxText}>
              💡 Este reporte incluye el stock actual del momento. Úsalo para traspasar información entre dispositivos durante el mismo turno.
            </ThemedText>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22c55e" />
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
                <ThemedText style={styles.modalBtnText}>Exportar</ThemedText>
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
  infoBox: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  infoBoxText: {
    color: '#1e40af',
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
    backgroundColor: '#22c55e',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});