import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getEstadoTurno,
  getMovimientos,
  getProductos,
  getVentas,
  setEstadoTurno,
  updateProducto
} from '@/services/storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import * as XLSX from 'xlsx';

interface TurnoModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TurnoModal({ visible, onClose, onSuccess }: TurnoModalProps) {
  const [loading, setLoading] = useState(false);
  const [turnoAbierto, setTurnoAbierto] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (visible) {
      cargarEstadoTurno();
    }
  }, [visible]);

  const cargarEstadoTurno = async () => {
    try {
      const estado = await getEstadoTurno();
      setTurnoAbierto(estado.turnoAbierto);
    } catch (error) {
      console.error('Error al cargar estado del turno:', error);
    }
  };

  const iniciarTurno = async () => {
    setLoading(true);
    try {
      const productos = await getProductos();

      if (productos.length === 0) {
        Alert.alert('Sin productos', 'Agrega productos antes de iniciar un turno');
        setLoading(false);
        return;
      }

      // Guardar el stock actual como stock de apertura
      for (const producto of productos) {
        await updateProducto(producto.id, {
          stockApertura: producto.stock,
        });
      }

      // Marcar turno como abierto
      await setEstadoTurno({
        turnoAbierto: true,
        fechaApertura: new Date(),
      });

      Alert.alert(
        '✅ Turno Iniciado',
        'El inventario actual se guardó como apertura del turno.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error al iniciar turno:', error);
      Alert.alert('Error', 'Hubo un problema al iniciar el turno');
    } finally {
      setLoading(false);
    }
  };

  const generarReporteInventario = async () => {
    const productos = await getProductos();
    const movimientos = await getMovimientos();
    const ventas = await getVentas();
    const estadoTurno = await getEstadoTurno();

    // Filtrar movimientos desde la apertura del turno
    const fechaApertura = estadoTurno.fechaApertura 
      ? new Date(estadoTurno.fechaApertura) 
      : new Date();
    fechaApertura.setHours(0, 0, 0, 0);

    const movimientosDelTurno = movimientos.filter(m => {
      const fechaMov = new Date(m.fecha);
      return fechaMov >= fechaApertura;
    });

    const ventasDelTurno = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      return fechaVenta >= fechaApertura;
    });

    const datosInventario = productos.map(producto => {
      const stockApertura = producto.stockApertura || 0;
      
      const abastecimiento = movimientosDelTurno
        .filter(m => m.productoId === producto.id && m.tipo === 'abastecimiento')
        .reduce((sum, m) => sum + m.cantidad, 0);

      const mermas = movimientosDelTurno
        .filter(m => m.productoId === producto.id && m.tipo === 'merma')
        .reduce((sum, m) => sum + m.cantidad, 0);

      const ocupadoRamo = movimientosDelTurno
        .filter(m => m.productoId === producto.id && m.tipo === 'ocupado_ramo')
        .reduce((sum, m) => sum + m.cantidad, 0);

      const vendidos = ventasDelTurno.reduce((sum, venta) => {
        const prodVenta = venta.productos.find(p => p.productoId === producto.id);
        return sum + (prodVenta?.cantidad || 0);
      }, 0);

      const inventarioCierre = producto.stock;

      return {
        'Nombre Producto': producto.nombre,
        'Inventario Apertura': stockApertura,
        'Abastecimiento': abastecimiento,
        'Vendidos': vendidos,
        'Ocupado en Ramo': ocupadoRamo,
        'Mermas': mermas,
        'Inventario Cierre': inventarioCierre,
      };
    });

    return datosInventario;
  };

  const generarReporteVentas = async () => {
    const ventas = await getVentas();
    const estadoTurno = await getEstadoTurno();

    const fechaApertura = estadoTurno.fechaApertura 
      ? new Date(estadoTurno.fechaApertura) 
      : new Date();
    fechaApertura.setHours(0, 0, 0, 0);

    const ventasDelTurno = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      return fechaVenta >= fechaApertura;
    });

    const datosVentas = ventasDelTurno.map(venta => {
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
        'Las librerías necesarias no están instaladas correctamente. Ejecuta:\nnpx expo install expo-file-system expo-sharing\nnpm install xlsx'
      );
      return;
    }

    setLoading(true);
    try {
      const datosInventario = await generarReporteInventario();
      const datosVentas = await generarReporteVentas();

      if (datosInventario.length === 0 && datosVentas.length === 0) {
        Alert.alert('Sin datos', 'No hay información para exportar del turno');
        setLoading(false);
        return;
      }

      const wb = XLSX.utils.book_new();

      if (datosInventario.length > 0) {
        const wsInventario = XLSX.utils.json_to_sheet(datosInventario);
        
        // Agregar formato de columnas
        const wscols = [
          { wch: 25 }, // Nombre Producto
          { wch: 18 }, // Inventario Apertura
          { wch: 15 }, // Abastecimiento
          { wch: 12 }, // Vendidos
          { wch: 18 }, // Ocupado en Ramo
          { wch: 12 }, // Mermas
          { wch: 18 }, // Inventario Cierre
        ];
        wsInventario['!cols'] = wscols;
        
        XLSX.utils.book_append_sheet(wb, wsInventario, 'Inventario');
      }

      if (datosVentas.length > 0) {
        const wsVentas = XLSX.utils.json_to_sheet(datosVentas);
        
        // Agregar formato de columnas
        const wscolsVentas = [
          { wch: 10 }, // Hora
          { wch: 40 }, // Productos
          { wch: 15 }, // Precio
          { wch: 18 }, // Método de Pago
          { wch: 30 }, // Notas
        ];
        wsVentas['!cols'] = wscolsVentas;
        
        XLSX.utils.book_append_sheet(wb, wsVentas, 'Ventas');
      }

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

      const estadoTurno = await getEstadoTurno();
      const fechaApertura = estadoTurno.fechaApertura 
        ? new Date(estadoTurno.fechaApertura).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      const fileName = `Cierre_Turno_${fechaApertura}.xlsx`;
      
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Exportar Cierre de Turno',
          UTI: 'com.microsoft.excel.xlsx',
        });

        // Marcar turno como cerrado
        await setEstadoTurno({
          turnoAbierto: false,
          fechaCierre: new Date(),
        });

        Alert.alert(
          '✅ Turno Cerrado', 
          'Excel exportado correctamente. El turno se ha cerrado.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onSuccess) onSuccess();
                onClose();
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'No se puede compartir archivos en este dispositivo');
      }
    } catch (error: any) {
      console.error('Error al exportar Excel:', error);
      Alert.alert('Error', `Hubo un problema al exportar: ${error.message || 'Desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarInicioTurno = () => {
    Alert.alert(
      '🌅 Iniciar Turno',
      '¿Deseas iniciar un nuevo turno? El inventario actual se guardará como inventario de apertura.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar Turno',
          style: 'default',
          onPress: iniciarTurno,
        },
      ]
    );
  };

  const handleConfirmarCierreTurno = () => {
    Alert.alert(
      '🌙 Cerrar Turno',
      '¿Estás seguro de que deseas cerrar el turno? Se exportará un Excel con el reporte completo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Turno',
          style: 'destructive',
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
            {turnoAbierto ? '🌙 Cerrar Turno' : '🌅 Iniciar Turno'}
          </ThemedText>

          <View style={styles.infoContainer}>
            {turnoAbierto ? (
              <>
                <ThemedText style={styles.infoText}>
                  Al cerrar el turno:
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Se exportará un Excel con dos hojas
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • <ThemedText type="defaultSemiBold">Inventario:</ThemedText> Mostrará apertura, movimientos y cierre
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • <ThemedText type="defaultSemiBold">Ventas:</ThemedText> Detalle de todas las ventas del turno
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • El turno se cerrará y podrás iniciar uno nuevo
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.infoText}>
                  Al iniciar el turno:
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • El inventario actual se guardará como <ThemedText type="defaultSemiBold">inventario de apertura</ThemedText>
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Todas las ventas y movimientos se registrarán durante este turno
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Al cerrar, verás el reporte completo en Excel
                </ThemedText>
              </>
            )}
          </View>

          <View style={[
            styles.warningBox,
            { 
              backgroundColor: turnoAbierto ? '#ffe4e6' : '#dbeafe',
              borderColor: turnoAbierto ? '#fca5a5' : '#93c5fd'
            }
          ]}>
            <ThemedText style={[
              styles.warningText,
              { color: turnoAbierto ? '#991b1b' : '#1e40af' }
            ]}>
              {turnoAbierto 
                ? '⚠️ Asegúrate de haber registrado todas las operaciones antes de cerrar'
                : 'ℹ️ Verifica que el inventario actual sea correcto antes de iniciar'
              }
            </ThemedText>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a7ea4" />
              <ThemedText style={styles.loadingText}>
                {turnoAbierto ? 'Cerrando turno...' : 'Iniciando turno...'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={onClose}>
                <ThemedText style={styles.modalBtnText}>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn, 
                  turnoAbierto ? styles.closeBtn : styles.openBtn
                ]}
                onPress={turnoAbierto ? handleConfirmarCierreTurno : handleConfirmarInicioTurno}>
                <ThemedText style={styles.modalBtnText}>
                  {turnoAbierto ? '🌙 Cerrar Turno' : '🌅 Iniciar Turno'}
                </ThemedText>
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
    width: '90%',
    maxWidth: 450,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  infoItem: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
  },
  warningBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
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
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#999',
  },
  openBtn: {
    backgroundColor: '#10b981',
  },
  closeBtn: {
    backgroundColor: '#f97316',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});