import { ThemedText } from '@/components/themed-text';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

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
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setIsOpen(!isOpen);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.container}>
      {/* Overlay oscuro */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}

      {/* Botones del menú */}
      {isOpen &&
        items.map((item, index) => {
          const itemAnim = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          });

          const translateY = fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, -(90 + index * 80)],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.menuItem,
                {
                  opacity: itemAnim,
                  transform: [{ translateY }],
                },
              ]}>
              <View style={styles.menuItemContent}>
                <View style={styles.labelContainer}>
                  <ThemedText style={styles.label}>{item.label}</ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.menuButton, { backgroundColor: item.color }]}
                  onPress={() => {
                    item.onPress();
                    toggleMenu();
                  }}>
                  <ThemedText style={styles.menuIcon}>{item.icon}</ThemedText>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        })}

      {/* Botón principal */}
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        <TouchableOpacity
          style={[styles.fab, isOpen && styles.fabOpen]}
          onPress={toggleMenu}>
          <ThemedText style={styles.fabText}>+</ThemedText>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
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
    zIndex: 3,
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
    bottom: 0,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 140,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  menuButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
  },
});