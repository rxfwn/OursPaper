import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// On web, expo-image-picker returns a blob: URI that only lives for the
// current page session — it 404s the moment the app reloads and the
// value is read back from storage. Requesting base64 lets us persist a
// self-contained data: URI instead. Native platforms keep the normal
// (already-persistent) file URI.
function resultToPersistent(result) {
  if (result.canceled || !result.assets?.length) {
    return { granted: true, canceled: true };
  }
  const asset = result.assets[0];
  const uri =
    Platform.OS === 'web' && asset.base64
      ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
      : asset.uri;
  return { granted: true, canceled: false, asset, uri };
}

export async function pickPersistentImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { granted: false };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    base64: Platform.OS === 'web',
  });
  return resultToPersistent(result);
}

// Mobile browsers expose the camera through the same file-input "capture"
// mechanism ImagePicker already uses on web, so this works there too — just
// not on a desktop browser without a camera, which is a real limitation
// worth telling the user about rather than failing silently.
export async function capturePersistentPhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { granted: false };
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    base64: Platform.OS === 'web',
  });
  return resultToPersistent(result);
}
