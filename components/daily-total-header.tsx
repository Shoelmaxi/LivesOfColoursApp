// components/daily-total-header.tsx - VERSIÓN MEJORADA
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getVentas } from '@/services/storage';
import { fontScale, getSpacing, verticalScale } from '@/utils/responsive';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
      return fechaVenta.getTime() === hoy.getTime() && !v.esUber;
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
        <View style={styles.amountContainer}>
          <ThemedText 
            style={[
              styles.amount,
              { color: colorScheme === 'dark' ? '#fff' : '#0a7ea4' }
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.6}>
            ${totalDelDia.toLocaleString('es-CL')}
          </ThemedText>
        </View>
        <ThemedText style={styles.subtext}>
          {cantidadVentas} {cantidadVentas === 1 ? 'venta' : 'ventas'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: verticalScale(16),
    paddingHorizontal: getSpacing().regular,
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
    fontSize: fontScale(14),
    opacity: 0.8,
    marginBottom: verticalScale(6),
    fontWeight: '600',
  },
  amountContainer: {
    width: SCREEN_WIDTH * 0.8,
    alignItems: 'center',
    marginVertical: verticalScale(4),
  },
  amount: {
    fontSize: fontScale(32),
    fontWeight: 'bold',
    lineHeight: fontScale(40),
    textAlign: 'center',
  },
  subtext: {
    fontSize: fontScale(12),
    opacity: 0.7,
    marginTop: verticalScale(4),
  },
});