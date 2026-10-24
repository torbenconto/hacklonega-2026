import { Image, type ColorValue } from 'react-native';

// A single stroke weight and optical size across navigation and actions.
export type IconName = 'camera' | 'book' | 'journal' | 'search' | 'arrow' | 'fish';
export function Icon({ name, color = '#285B48', size = 24 }: { name: IconName; color?: ColorValue; size?: number }) {
  // Embedded PNGs render consistently on native and web, without a font load.
  return <Image source={icons[name]} style={{ width: size, height: size, tintColor: color }} accessibilityIgnoresInvertColors />;
}
const icons = {
  camera: require('../../assets/icons/camera.png'),
  book: require('../../assets/icons/book.png'),
  journal: require('../../assets/icons/journal.png'),
  search: require('../../assets/icons/search.png'),
  arrow: require('../../assets/icons/arrow.png'),
  fish: require('../../assets/icons/fish.png'),
};
