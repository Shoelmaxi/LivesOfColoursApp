import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getVentas } from '@/services/storage';
import { Venta } from '@/types';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

export default function VentasScreen() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();

  const loadVentas = async () => {
    const data = await getVentas();
    // Ordenar por fecha descendente (más recientes primero)
    const sorted = data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    setVentas(sorted);
  };

  // Cargar al montar
  useEffect(() => {
    loadVentas();
  }, []);

  // Recargar ventas cada vez que la pantalla se enfoca
  useFocusEffect(
    useCallback(() => {
      loadVentas();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVentas();
    setRefreshing(false);
  };

  // Calcular total del día actual (excluyendo ventas Uber)
  const getTotalDelDia = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    return ventas
      .filter(v => {
        const fechaVenta = new Date(v.fecha);
        fechaVenta.setHours(0, 0, 0, 0);
        return fechaVenta.getTime() === hoy.getTime() && !v.esUber;
      })
      .reduce((sum, v) => sum + v.total, 0);
  };

  // Filtrar ventas del día
  const getVentasDelDia = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    return ventas.filter(v => {
      const fechaVenta = new Date(v.fecha);
      fechaVenta.setHours(0, 0, 0, 0);
      return fechaVenta.getTime() === hoy.getTime();
    });
  };

  const formatHora = (fecha: Date) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatFecha = (fecha: Date) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CL', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const totalDelDia = getTotalDelDia();
  const ventasDelDia = getVentasDelDia();

  return (
    <ThemedView style={styles.container}>
      {/* Header con total del día */}
      <View style={[
        styles.totalContainer,
        { backgroundColor: colorScheme === 'dark' ? '#0a7ea4' : '#0a7ea4' }
      ]}>
        <ThemedText style={styles.totalLabel}>Total del día</ThemedText>
        <ThemedText style={styles.totalAmount}>
          ${totalDelDia.toLocaleString('es-CL')}
        </ThemedText>
        <ThemedText style={styles.totalSubtext}>
          {ventasDelDia.length} {ventasDelDia.length === 1 ? 'venta' : 'ventas'}
        </ThemedText>
      </View>

      {/* Lista de ventas */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        
        {ventas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No hay ventas registradas
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Las ventas que registres aparecerán aquí
            </ThemedText>
          </View>
        ) : (
          ventas.map((venta, index) => {
            const fechaVenta = new Date(venta.fecha);
            const esHoy = fechaVenta.toDateString() === new Date().toDateString();
            
            return (
              <View 
                key={venta.id} 
                style={[
                  styles.ventaCard,
                  { backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#ffffff' }
                ]}>
                {/* Header de la venta */}
                <View style={styles.ventaHeader}>
                  <View style={styles.ventaHeaderLeft}>
                    <View style={styles.ventaFechaContainer}>
                      <ThemedText type="defaultSemiBold" style={styles.ventaFecha}>
                        {esHoy ? '🟢 Hoy' : formatFecha(fechaVenta)}
                      </ThemedText>
                      {venta.esUber && (
                        <View style={styles.uberBadge}>
                          <ThemedText style={styles.uberBadgeText}>UBER</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={styles.ventaHora}>
                      {formatHora(fechaVenta)}
                    </ThemedText>
                  </View>
                  {!venta.esUber && (
                    <ThemedText style={styles.ventaTotal}>
                      ${venta.total.toLocaleString('es-CL')}
                    </ThemedText>
                  )}
                </View>

                {/* Productos vendidos */}
                <View style={styles.productosContainer}>
                  {venta.productos.map((prod, idx) => (
                    <View key={idx} style={styles.productoItem}>
                      <ThemedText style={styles.productoNombre}>
                        • {prod.productoNombre}
                      </ThemedText>
                      <ThemedText style={styles.productoCantidad}>
                        x{prod.cantidad}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {/* Notas */}
                {venta.notas && (
                  <View style={styles.notasContainer}>
                    <ThemedText style={styles.notasText}>
                      📝 {venta.notas}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  totalContainer: {
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.6,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.5,
  },
  ventaCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ventaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ventaHeaderLeft: {
    flex: 1,
  },
  ventaFechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ventaFecha: {
    fontSize: 16,
  },
  uberBadge: {
    backgroundColor: '#ffa94d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  uberBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  ventaHora: {
    fontSize: 14,
    opacity: 0.6,
  },
  ventaTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#51cf66',
  },
  productosContainer: {
    marginBottom: 8,
  },
  productoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  productoNombre: {
    flex: 1,
    fontSize: 15,
  },
  productoCantidad: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.7,
  },
  notasContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  notasText: {
    fontSize: 13,
    opacity: 0.7,
    fontStyle: 'italic',
  },
});