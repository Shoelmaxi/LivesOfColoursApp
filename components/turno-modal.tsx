import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEstadoTurno, getProductos, setEstadoTurno, updateProducto } from '@/services/storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

interface TurnoModalProps {
  visible: boolean;
  onClose: () => void;
  onTurnoChanged: () => void;
}

export function TurnoModal({ visible, onClose, onTurnoChanged }: TurnoModalProps) {
  const [loading, setLoading] = useState(false);
  const [turnoAbierto, setTurnoAbierto] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (visible) {
      cargarEstadoTurno();
    }
  }, [visible]);

  const cargarEstadoTurno = async () => {
    const estado = await getEstadoTurno();
    setTurnoAbierto(estado.turnoAbierto);
  };

  const iniciarTurno = async () => {
    setLoading(true);
    try {
      // Obtener todos los productos
      const productos = await getProductos();

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
              onTurnoChanged();
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

  const cerrarTurno = async () => {
    setLoading(true);
    try {
      // Marcar turno como cerrado
      await setEstadoTurno({
        turnoAbierto: false,
        fechaCierre: new Date(),
      });

      Alert.alert(
        '✅ Turno Cerrado',
        'El turno se cerró correctamente. El inventario actual se guardó como cierre.',
        [
          {
            text: 'OK',
            onPress: () => {
              onTurnoChanged();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error al cerrar turno:', error);
      Alert.alert('Error', 'Hubo un problema al cerrar el turno');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = () => {
    if (turnoAbierto) {
      // Cerrar turno
      Alert.alert(
        '🌙 Cerrar Turno',
        '¿Estás seguro de que deseas cerrar el turno? El inventario actual se guardará como inventario de cierre.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar Turno',
            style: 'destructive',
            onPress: cerrarTurno,
          },
        ]
      );
    } else {
      // Iniciar turno
      Alert.alert(
        '🌅 Iniciar Turno',
        '¿Estás seguro de que deseas iniciar un nuevo turno? El inventario actual se guardará como inventario de apertura.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Iniciar Turno',
            onPress: iniciarTurno,
          },
        ]
      );
    }
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
                  • El inventario actual se guardará como <ThemedText type="defaultSemiBold">inventario de cierre</ThemedText>
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Podrás exportar el Excel con el resumen completo
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • El próximo turno empezará desde cero
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
                  • Todas las ventas, mermas y movimientos se registrarán durante este turno
                </ThemedText>
                <ThemedText style={styles.infoItem}>
                  • Al cerrar, podrás ver el resumen completo
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
                ? '⚠️ Asegúrate de haber registrado todas las operaciones del día antes de cerrar'
                : 'ℹ️ Verifica que el inventario actual sea el correcto antes de iniciar el turno'
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
                onPress={handleConfirmar}>
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
    maxWidth: 400,
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