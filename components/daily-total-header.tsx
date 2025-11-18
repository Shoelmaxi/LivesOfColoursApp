import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getVentas } from '@/services/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

export function DailyTotalHeader() {
  const [totalDelDia, setTotalDelDia] = useState(0);
  const [cantidadVentas, setCantidadVentas] = useState(0);
  const colorScheme = useColorScheme();

  const loadTotalDelDia = useCallback(async () => {
    const ventas = await getVentas();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const ventasHoy = ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      fechaVenta.setHours(0, 0, 0, 0);
      return fechaVenta.getTime() === hoy.getTime() && !v.esUber; // Excluir ventas Uber
    });

    const total = ventasHoy.reduce((sum, v) => sum + v.total, 0);
    setTotalDelDia(total);
    setCantidadVentas(ventasHoy.length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTotalDelDia();
    }, [loadTotalDelDia])
  );

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? '#1a5f7a' : '#e3f2fd' }
    ]}>
      <View style={styles.content}>
        <ThemedText style={styles.label}>💰 Total del día</ThemedText>
        <ThemedText style={[
          styles.amount,
          { color: colorScheme === 'dark' ? '#fff' : '#0a7ea4' }
        ]}>
          ${totalDelDia.toLocaleString('es-CL')}
        </ThemedText>
        <ThemedText style={styles.subtext}>
          {cantidadVentas} {cantidadVentas === 1 ? 'venta' : 'ventas'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
});