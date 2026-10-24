import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Decode at the upload resolution to avoid loading a 36 MP camera photo in full.
export async function preparePhoto(uri: string) {
  const context = ImageManipulator.manipulate(uri, { maxWidth: 2048, maxHeight: 2048 });
  try {
    const image = await context.renderAsync();
    try {
      return await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
