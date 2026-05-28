import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_LONGEST_EDGE = 1600;
const JPEG_QUALITY = 0.7;

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Compresses a picked image: scales the longest edge to <= 1600px and re-encodes
 * as JPEG q=0.7. Typical 4MB photo → ~400KB. Returns the new file URI.
 */
export async function compressImage(
  sourceUri: string,
  width: number,
  height: number,
): Promise<CompressedImage> {
  const longest = Math.max(width, height);
  const scale = longest > MAX_LONGEST_EDGE ? MAX_LONGEST_EDGE / longest : 1;
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const ctx = ImageManipulator.manipulate(sourceUri);
  if (scale < 1) {
    ctx.resize({ width: targetWidth, height: targetHeight });
  }
  const ref = await ctx.renderAsync();
  const result = await ref.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}
