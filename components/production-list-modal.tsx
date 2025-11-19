import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getProductos } from '@/services/storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

interface ProductionListModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProductionListModal({ visible, onClose }: ProductionListModalProps) {
  const [loading, setLoading] = useState(false);
  const [floresBajoStock, setFloresBajoStock] = useState<any[]>([]);
  const [ramosBajoStock, setRamosBajoStock] = useState<any[]>([]);
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (visible) {
      cargarProductosBajoStock();
    }
  }, [visible]);

  const cargarProductosBajoStock = async () => {
    setLoading(true);
    try {
      const productos = await getProductos();
      
      // Filtrar productos con stock <= stockMinimo
      const bajoStock = productos.filter(p => p.stock <= p.stockMinimo);
      
      // Separar por categoría
      const flores = bajoStock
        .filter(p => p.categoria === 'flores_sueltas')
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      const ramos = bajoStock
        .filter(p => p.categoria === 'ramos')
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      
      setFloresBajoStock(flores);
      setRamosBajoStock(ramos);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const generarTextoListaProduccion = () => {
    const fecha = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    let texto = `📋 *LISTA DE PRODUCCIÓN*\n`;
    texto += `📅 ${fecha}\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Sección de Flores Sueltas (Para Abastecer)
    texto += `🌸 *PARA ABASTECER/COMPRAR*\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (floresBajoStock.length === 0) {
      texto += `✅ Todas las flores están bien abastecidas\n\n`;
    } else {
      texto += `⚠️ ${floresBajoStock.length} producto${floresBajoStock.length !== 1 ? 's' : ''} por comprar:\n\n`;
      
      floresBajoStock.forEach((producto, index) => {
        const deficit = producto.stockMinimo - producto.stock;
        texto += `${index + 1}. *${producto.nombre}*\n`;
        texto += `   Stock actual: ${producto.stock} ${producto.unidad}\n`;
        texto += `   Stock mínimo: ${producto.stockMinimo} ${producto.unidad}\n`;
        if (deficit > 0) {
          texto += `   📦 Comprar: ${deficit} ${producto.unidad}\n`;
        }
        texto += `\n`;
      });
    }
    
    // Sección de Ramos (Para Producir)
    texto += `━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `💐 *PARA PRODUCIR/ARMAR*\n`;
    texto += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (ramosBajoStock.length === 0) {
      texto += `✅ Todos los ramos están bien abastecidos\n\n`;
    } else {
      texto += `⚠️ ${ramosBajoStock.length} ramo${ramosBajoStock.length !== 1 ? 's' : ''} por producir:\n\n`;
      
      ramosBajoStock.forEach((producto, index) => {
        const deficit = producto.stockMinimo - producto.stock;
        texto += `${index + 1}. *${producto.nombre}*\n`;
        texto += `   Stock actual: ${producto.stock} ${producto.unidad}\n`;
        texto += `   Stock mínimo: ${producto.stockMinimo} ${producto.unidad}\n`;
        if (deficit > 0) {
          texto += `   🌺 Producir: ${deficit} ${producto.unidad}\n`;
        }
        texto += `\n`;
      });
    }
    
    // Resumen final
    texto += `━━━━━━━━━━━━━━━━━━━━\n`;
    texto += `📊 *RESUMEN*\n`;
    texto += `🌸 Flores por abastecer: ${floresBajoStock.length}\n`;
    texto += `💐 Ramos por producir: ${ramosBajoStock.length}\n`;
    texto += `📦 Total: ${floresBajoStock.length + ramosBajoStock.length} productos`;

    return texto;
  };

  const compartirLista = async () => {
    try {
      const texto = generarTextoListaProduccion();

      if (Platform.OS === 'web') {
        // En web, copiar al portapapeles
        await navigator.clipboard.writeText(texto);
        Alert.alert('✅ Copiado', 'La lista se copió al portapapeles');
      } else {
        // En móvil, compartir
        await Share.share({
          message: texto,
          title: 'Lista de Producción',
        });
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error al compartir:', error);
      Alert.alert('Error', `No se pudo compartir: ${error.message}`);
    }
  };

  const totalProductos = floresBajoStock.length + ramosBajoStock.length;

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
            📋 Lista de Producción
          </ThemedText>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a7ea4" />
              <ThemedText style={styles.loadingText}>Cargando productos...</ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                  <ThemedText style={styles.summaryNumber}>{floresBajoStock.length}</ThemedText>
                  <ThemedText style={styles.summaryLabel}>🌸 Para Abastecer</ThemedText>
                </View>
                <View style={styles.summaryCard}>
                  <ThemedText style={styles.summaryNumber}>{ramosBajoStock.length}</ThemedText>
                  <ThemedText style={styles.summaryLabel}>💐 Para Producir</ThemedText>
                </View>
              </View>

              <ScrollView style={styles.productosContainer}>
                {/* Sección Flores Sueltas */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      🌸 PARA ABASTECER/COMPRAR
                    </ThemedText>
                  </View>
                  
                  {floresBajoStock.length > 0 ? (
                    floresBajoStock.map((producto, index) => {
                      const deficit = producto.stockMinimo - producto.stock;
                      return (
                        <View
                          key={producto.id}
                          style={[
                            styles.productoCard,
                            { 
                              backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#f0fdf4',
                              borderColor: '#10b981'
                            }
                          ]}>
                          <View style={styles.productoHeader}>
                            <ThemedText type="defaultSemiBold" style={styles.productoNombre}>
                              {index + 1}. {producto.nombre}
                            </ThemedText>
                          </View>
                          <View style={styles.productoDetails}>
                            <View style={styles.detailRow}>
                              <ThemedText style={styles.detailLabel}>Stock actual:</ThemedText>
                              <ThemedText style={[styles.detailValue, { color: '#dc2626' }]}>
                                {producto.stock} {producto.unidad}
                              </ThemedText>
                            </View>
                            <View style={styles.detailRow}>
                              <ThemedText style={styles.detailLabel}>Stock mínimo:</ThemedText>
                              <ThemedText style={styles.detailValue}>
                                {producto.stockMinimo} {producto.unidad}
                              </ThemedText>
                            </View>
                            {deficit > 0 && (
                              <View style={[styles.deficitBadge, { backgroundColor: '#d1fae5' }]}>
                                <ThemedText style={[styles.deficitText, { color: '#065f46' }]}>
                                  📦 Comprar: {deficit} {producto.unidad}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptySection}>
                      <ThemedText style={styles.emptyText}>
                        ✅ Todas las flores bien abastecidas
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Sección Ramos */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      💐 PARA PRODUCIR/ARMAR
                    </ThemedText>
                  </View>
                  
                  {ramosBajoStock.length > 0 ? (
                    ramosBajoStock.map((producto, index) => {
                      const deficit = producto.stockMinimo - producto.stock;
                      return (
                        <View
                          key={producto.id}
                          style={[
                            styles.productoCard,
                            { 
                              backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fef3f2',
                              borderColor: '#f59e0b'
                            }
                          ]}>
                          <View style={styles.productoHeader}>
                            <ThemedText type="defaultSemiBold" style={styles.productoNombre}>
                              {index + 1}. {producto.nombre}
                            </ThemedText>
                          </View>
                          <View style={styles.productoDetails}>
                            <View style={styles.detailRow}>
                              <ThemedText style={styles.detailLabel}>Stock actual:</ThemedText>
                              <ThemedText style={[styles.detailValue, { color: '#dc2626' }]}>
                                {producto.stock} {producto.unidad}
                              </ThemedText>
                            </View>
                            <View style={styles.detailRow}>
                              <ThemedText style={styles.detailLabel}>Stock mínimo:</ThemedText>
                              <ThemedText style={styles.detailValue}>
                                {producto.stockMinimo} {producto.unidad}
                              </ThemedText>
                            </View>
                            {deficit > 0 && (
                              <View style={[styles.deficitBadge, { backgroundColor: '#fed7aa' }]}>
                                <ThemedText style={[styles.deficitText, { color: '#7c2d12' }]}>
                                  🌺 Producir: {deficit} {producto.unidad}
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptySection}>
                      <ThemedText style={styles.emptyText}>
                        ✅ Todos los ramos bien abastecidos
                      </ThemedText>
                    </View>
                  )}
                </View>

                {totalProductos === 0 && (
                  <View style={styles.allGoodContainer}>
                    <ThemedText style={styles.allGoodText}>
                      🎉 ¡Perfecto! Todo está bien abastecido
                    </ThemedText>
                  </View>
                )}
              </ScrollView>

              <View style={styles.infoBox}>
                <ThemedText style={styles.infoText}>
                  💡 Esta lista se puede compartir por WhatsApp, correo o cualquier app de mensajería
                </ThemedText>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={onClose}>
                  <ThemedText style={styles.modalBtnText}>Cerrar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    styles.shareBtn,
                    totalProductos === 0 && styles.btnDisabled
                  ]}
                  onPress={compartirLista}
                  disabled={totalProductos === 0}>
                  <ThemedText style={styles.modalBtnText}>
                    📤 Compartir Lista
                  </ThemedText>
                </TouchableOpacity>
              </View>
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
    marginBottom: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  productosContainer: {
    maxHeight: 400,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#1f2937',
  },
  productoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  productoHeader: {
    marginBottom: 12,
  },
  productoNombre: {
    fontSize: 16,
  },
  productoDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  deficitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  deficitText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptySection: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
  allGoodContainer: {
    padding: 40,
    alignItems: 'center',
  },
  allGoodText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  infoText: {
    color: '#1e40af',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
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
  shareBtn: {
    backgroundColor: '#8b5cf6',
  },
  btnDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});