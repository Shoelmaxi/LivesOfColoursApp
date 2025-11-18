import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Categoria, Producto } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface AddProductModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (producto: Producto) => void;
}

export function AddProductModal({ visible, onClose, onSave }: AddProductModalProps) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('flores_sueltas');
  const [stock, setStock] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [unidad, setUnidad] = useState('piezas');
  const [foto, setFoto] = useState<string | undefined>();
  const colorScheme = useColorScheme();

  const resetForm = () => {
    setNombre('');
    setCategoria('flores_sueltas');
    setStock('');
    setStockMinimo('');
    setUnidad('piezas');
    setFoto(undefined);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleSave = () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (!stock || parseInt(stock) < 0) {
      Alert.alert('Error', 'El stock debe ser un número válido');
      return;
    }

    if (!stockMinimo || parseInt(stockMinimo) < 0) {
      Alert.alert('Error', 'El stock mínimo debe ser un número válido');
      return;
    }

    const nuevoProducto: Producto = {
      id: Date.now().toString(),
      nombre: nombre.trim(),
      categoria,
      stock: parseInt(stock),
      stockMinimo: parseInt(stockMinimo),
      unidad,
      foto,
      fechaCreacion: new Date(),
    };

    onSave(nuevoProducto);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View
        style={[
          styles.container,
          { backgroundColor: colorScheme === 'dark' ? '#151718' : '#fff' },
        ]}>
        <View style={styles.header}>
          <ThemedText type="title">Nuevo Producto</ThemedText>
          <TouchableOpacity onPress={handleClose}>
            <ThemedText style={styles.closeBtn}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Foto */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Foto (opcional)</ThemedText>
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
              {foto ? (
                <Image source={{ uri: foto }} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <ThemedText style={styles.imagePlaceholderText}>📷</ThemedText>
                  <ThemedText style={styles.imagePlaceholderSubtext}>
                    Toca para agregar foto
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Nombre */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Nombre *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f9f9f9',
                },
              ]}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej: Rosa Roja"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
            />
          </View>

          {/* Categoría */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Categoría *</ThemedText>
            <View style={styles.categoryButtons}>
              <TouchableOpacity
                style={[
                  styles.categoryBtn,
                  categoria === 'flores_sueltas' && styles.categoryBtnActive,
                ]}
                onPress={() => setCategoria('flores_sueltas')}>
                <ThemedText
                  style={[
                    styles.categoryBtnText,
                    categoria === 'flores_sueltas' && styles.categoryBtnTextActive,
                  ]}>
                  Flores Sueltas
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryBtn,
                  categoria === 'ramos' && styles.categoryBtnActive,
                ]}
                onPress={() => setCategoria('ramos')}>
                <ThemedText
                  style={[
                    styles.categoryBtnText,
                    categoria === 'ramos' && styles.categoryBtnTextActive,
                  ]}>
                  Ramos
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stock Inicial */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Stock Inicial *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f9f9f9',
                },
              ]}
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
            />
          </View>

          {/* Stock Mínimo */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Stock Mínimo (alerta) *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: colorScheme === 'dark' ? '#fff' : '#000',
                  borderColor: colorScheme === 'dark' ? '#555' : '#ccc',
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2c' : '#f9f9f9',
                },
              ]}
              value={stockMinimo}
              onChangeText={setStockMinimo}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
            />
          </View>

          {/* Unidad */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Unidad *</ThemedText>
            <View style={styles.unitButtons}>
              {['unidad', 'ramos'].map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitBtn,
                    unidad === u && styles.unitBtnActive,
                  ]}
                  onPress={() => setUnidad(u)}>
                  <ThemedText
                    style={[
                      styles.unitBtnText,
                      unidad === u && styles.unitBtnTextActive,
                    ]}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Botón Guardar */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <ThemedText style={styles.saveButtonText}>Guardar Producto</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeBtn: {
    fontSize: 32,
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  imageContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#999',
  },
  imagePlaceholderText: {
    fontSize: 48,
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    fontSize: 16,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  categoryBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  categoryBtnActive: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  categoryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryBtnTextActive: {
    color: '#fff',
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  unitBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  unitBtnActive: {
    borderColor: '#0a7ea4',
    backgroundColor: '#0a7ea4',
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  unitBtnTextActive: {
    color: '#fff',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});