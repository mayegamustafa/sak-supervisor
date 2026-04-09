import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

const SERVER = 'com.sak.supervision';

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
      reason: 'Login to SAK Supervision',
      title: 'Biometric Login',
      subtitle: 'Verify your identity to sign in',
      useFallback: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Save login credentials securely in device keychain/keystore */
export async function saveCredentials(username: string, password: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    await NativeBiometric.setCredentials({ server: SERVER, username, password });
    return true;
  } catch {
    return false;
  }
}

/** Retrieve saved credentials after biometric verification */
export async function getCredentials(): Promise<{ username: string; password: string } | null> {
  if (!isNative()) return null;
  try {
    const creds = await NativeBiometric.getCredentials({ server: SERVER });
    if (creds.username && creds.password) return creds;
    return null;
  } catch {
    return null;
  }
}

/** Delete saved credentials */
export async function deleteCredentials(): Promise<void> {
  if (!isNative()) return;
  try {
    await NativeBiometric.deleteCredentials({ server: SERVER });
  } catch { /* ignore if nothing stored */ }
}

/** Check if credentials are stored */
export async function hasStoredCredentials(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const creds = await NativeBiometric.getCredentials({ server: SERVER });
    return !!(creds.username && creds.password);
  } catch {
    return false;
  }
}
