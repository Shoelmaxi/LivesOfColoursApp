import { ThemedText } from '@/components/themed-text';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface FabMenuItem {
  label: string;
  icon: string;
  onPress: () => void;
  color: string;
}

interface FabMenuProps {
  items: FabMenuItem[];
}

export function FabMenu({ items }: FabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.container}>
      {/* Overlay oscuro cuando está abierto */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}

      {/* Botones del menú */}
      {isOpen &&
        items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.menuItem,
              { bottom: 80 + index * 70 },
            ]}>
            <View style={styles.menuItemContent}>
              <View style={styles.labelContainer}>
                <ThemedText style={styles.label}>{item.label}</ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.menuButton, { backgroundColor: item.color }]}
                onPress={() => {
                  item.onPress();
                  setIsOpen(false);
                }}>
                <ThemedText style={styles.menuIcon}>{item.icon}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}

      {/* Botón principal */}
      <TouchableOpacity
        style={[styles.fab, isOpen && styles.fabOpen]}
        onPress={toggleMenu}>
        <ThemedText style={styles.fabText}>{isOpen ? '✕' : '+'}</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  overlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabOpen: {
    backgroundColor: '#ff6b6b',
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  menuItem: {
    position: 'absolute',
    right: 0,
    alignItems: 'flex-end',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  menuButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
  },
});