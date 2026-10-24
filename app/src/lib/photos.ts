import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Decode at the upload resolution to avoid loading a 36 MP camera photo in full.
export async function preparePhoto(uri: string, journal = false) {
  const context = ImageManipulator.manipulate(uri, { maxWidth: journal ? 640 : 2048, maxHeight: journal ? 640 : 2048 });
  try {
    const image = await context.renderAsync();
    try {
      return await image.saveAsync({ format: SaveFormat.JPEG, compress: journal ? 0.8 : 0.85, base64: journal });
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
