import { Dimensions, PixelRatio } from 'react-native';

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
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
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
 * Obtiene espaciado responsivo
 */
export const getSpacing = () => ({
  tiny: scale(4),
  small: scale(8),
  medium: scale(12),
  regular: scale(16),
  large: scale(20),
  xlarge: scale(24),
  xxlarge: scale(32),
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
 * Listener para cambios de orientación
 */
export const useResponsiveDimensions = () => {
  const [dimensions, setDimensions] = React.useState(getDimensions());

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

// Importar React para el hook
import * as React from 'react';
