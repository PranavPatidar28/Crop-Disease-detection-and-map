import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import type { PickedImage } from '../types';

interface UseImagePickerResult {
  picked: PickedImage | null;
  setPicked: (img: PickedImage | null) => void;
  pickFromCamera: () => Promise<PickedImage | null>;
  pickFromGallery: () => Promise<PickedImage | null>;
  reset: () => void;
}

function toPickedImage(asset: ImagePicker.ImagePickerAsset): PickedImage {
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType,
    fileSize: asset.fileSize,
  };
}

export function useImagePicker(): UseImagePickerResult {
  const [picked, setPicked] = useState<PickedImage | null>(null);

  const pickFromCamera = useCallback(async (): Promise<PickedImage | null> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) return null;
    const next = toPickedImage(result.assets[0]);
    setPicked(next);
    return next;
  }, []);

  const pickFromGallery = useCallback(async (): Promise<PickedImage | null> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      exif: false,
    });
    if (result.canceled || !result.assets[0]) return null;
    const next = toPickedImage(result.assets[0]);
    setPicked(next);
    return next;
  }, []);

  const reset = useCallback(() => setPicked(null), []);

  return { picked, setPicked, pickFromCamera, pickFromGallery, reset };
}
