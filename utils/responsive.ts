// utils/responsive.ts - VERSIÓN MEJORADA
import { useEffect, useState } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensiones base para el diseño (iPhone 11 Pro)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Escala el tamaño basado en el ancho de la pantalla
 */
export const scale = (size: number): number => {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  return size * ratio;
};

/**
 * Escala vertical basado en la altura de la pantalla
 */
export const verticalScale = (size: number): number => {
  const ratio = SCREEN_HEIGHT / BASE_HEIGHT;
  return size * ratio;
};

/**
 * Escala moderada - combina escala horizontal con un factor
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Escala de fuente - asegura que el texto sea legible
 */
export const fontScale = (size: number): number => {
  const scaled = moderateScale(size, 0.3);
  const rounded = Math.round(PixelRatio.roundToNearestPixel(scaled));
  // Asegurar tamaño mínimo de fuente
  return Math.max(rounded, size * 0.85);
};

/**
 * Obtiene el ancho y alto actuales de la pantalla
 */
export const getDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
});

/**
 * Verifica si es una pantalla pequeña
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

/**
 * Verifica si es una pantalla grande (tablet)
 */
export const isTablet = (): boolean => {
  return SCREEN_WIDTH >= 768;
};

/**
 * Obtiene padding seguro para diferentes dispositivos
 */
export const getSafePadding = () => ({
  horizontal: isSmallDevice() ? scale(12) : scale(16),
  vertical: isSmallDevice() ? verticalScale(8) : verticalScale(12),
});

/**
 * Obtiene tamaños de fuente responsivos
 */
export const getFontSizes = () => ({
  tiny: fontScale(10),
  small: fontScale(12),
  medium: fontScale(14),
  regular: fontScale(16),
  large: fontScale(18),
  xlarge: fontScale(20),
  xxlarge: fontScale(24),
  huge: fontScale(28),
  massive: fontScale(32),
  giant: fontScale(42),
});

/**
 * Obtiene espaciado responsivo uniforme
 */
export const getSpacing = () => ({
  tiny: moderateScale(4),
  small: moderateScale(8),
  medium: moderateScale(12),
  regular: moderateScale(16),
  large: moderateScale(20),
  xlarge: moderateScale(24),
  xxlarge: moderateScale(32),
  xxxlarge: moderateScale(40),
});

/**
 * Obtiene tamaños de iconos responsivos
 */
export const getIconSizes = () => ({
  tiny: scale(12),
  small: scale(16),
  medium: scale(20),
  regular: scale(24),
  large: scale(28),
  xlarge: scale(32),
});

/**
 * Obtiene tamaños de botones responsivos
 */
export const getButtonSizes = () => ({
  small: {
    height: verticalScale(36),
    paddingHorizontal: scale(12),
    fontSize: fontScale(13),
  },
  medium: {
    height: verticalScale(44),
    paddingHorizontal: scale(16),
    fontSize: fontScale(15),
  },
  large: {
    height: verticalScale(52),
    paddingHorizontal: scale(20),
    fontSize: fontScale(17),
  },
});

/**
 * Obtiene anchos de modales responsivos
 */
export const getModalWidth = (percentage: number = 0.9): number => {
  const maxWidth = isTablet() ? 600 : SCREEN_WIDTH * percentage;
  return Math.min(SCREEN_WIDTH * percentage, maxWidth);
};

/**
 * Calcula el espaciado del FAB menu
 */
export const getFabSpacing = () => {
  const baseSpacing = verticalScale(80);
  return {
    itemSpacing: baseSpacing,
    bottomOffset: verticalScale(20),
    rightOffset: scale(20),
  };
};

/**
 * Obtiene configuración responsive para cards
 */
export const getCardConfig = () => ({
  padding: getSpacing().regular,
  borderRadius: moderateScale(12),
  margin: getSpacing().medium,
  imageSize: scale(60),
  gap: getSpacing().small,
});

/**
 * Hook para dimensiones responsivas con actualizaciones
 */
export const useResponsiveDimensions = () => {
  const [dimensions, setDimensions] = useState(getDimensions());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

/**
 * Obtiene configuración para headers
 */
export const getHeaderConfig = () => ({
  height: verticalScale(Platform.OS === 'ios' ? 100 : 80),
  paddingHorizontal: getSpacing().regular,
  paddingVertical: verticalScale(12),
  titleSize: getFontSizes().xlarge,
  subtitleSize: getFontSizes().small,
});

/**
 * Obtiene configuración para el tab bar
 */
export const getTabBarConfig = () => ({
  height: verticalScale(60),
  iconSize: scale(28),
  labelSize: fontScale(12),
  padding: getSpacing().small,
});

/**
 * Limita el texto para evitar desbordamiento
 */
export const getMaxTextWidth = (containerWidth: number, padding: number = 0) => {
  return containerWidth - (padding * 2);
};

/**
 * Obtiene configuración para inputs
 */
export const getInputConfig = () => ({
  height: verticalScale(44),
  fontSize: fontScale(16),
  padding: moderateScale(12),
  borderRadius: moderateScale(8),
  borderWidth: 1,
});