import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

function isNative(): boolean {
  return typeof window !== 'undefined' &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

export async function isBiometricAvailable(): Promise<{ available: boolean; type: string }> {
  if (!isNative()) return { available: false, type: 'none' };
  try {
    const result = await NativeBiometric.isAvailable();
    const typeMap: Record<number, string> = {
      [BiometryType.FACE_ID]: 'Face ID',
      [BiometryType.TOUCH_ID]: 'Touch ID',
      [BiometryType.FINGERPRINT]: 'Fingerprint',
      [BiometryType.FACE_AUTHENTICATION]: 'Face',
      [BiometryType.IRIS_AUTHENTICATION]: 'Iris',
      [BiometryType.MULTIPLE]: 'Biometric',
    };
    return {
      available: result.isAvailable,
      type: typeMap[result.biometryType] || 'Biometric',
    };
  } catch {
    return { available: false, type: 'none' };
  }
}

export async function verifyBiometric(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock SAK Supervision',
      title: 'Authentication Required',
      subtitle: 'Verify your identity to continue',
      useFallback: true,
    });
    return true;
  } catch {
    return false;
  }
}
