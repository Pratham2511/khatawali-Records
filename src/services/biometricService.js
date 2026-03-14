import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

const setupKey = (userId) => `khatawali.bio.setup.${userId}`;
const enabledKey = (userId) => `khatawali.bio.enabled.${userId}`;

export const isNative = () => Capacitor.isNativePlatform();

export const getBiometricEnabled = async (userId) => {
  if (!userId || !isNative()) return false;
  const { value } = await Preferences.get({ key: enabledKey(userId) });
  if (value === null) return true;
  return value === 'true';
};

export const setBiometricEnabled = async (userId, enabled) => {
  if (!userId || !isNative()) return;
  await Preferences.set({ key: enabledKey(userId), value: String(Boolean(enabled)) });
};

export const checkBiometricAvailability = async () => {
  if (!isNative()) return { available: false, reason: 'web' };

  try {
    const info = await BiometricAuth.checkBiometry();
    return {
      available: Boolean(info.isAvailable),
      reason: info.reason || ''
    };
  } catch {
    return { available: false, reason: 'plugin-error' };
  }
};

export const ensureBiometricUnlock = async (userId) => {
  if (!userId || !isNative()) {
    return { unlocked: true, required: false, available: false };
  }

  const enabled = await getBiometricEnabled(userId);
  if (!enabled) {
    return { unlocked: true, required: false, available: false };
  }

  const availability = await checkBiometricAvailability();
  if (!availability.available) {
    return { unlocked: true, required: false, available: false };
  }

  const { value: setupDone } = await Preferences.get({ key: setupKey(userId) });

  if (setupDone !== 'done') {
    await Preferences.set({ key: setupKey(userId), value: 'done' });
    return { unlocked: true, required: false, available: true, firstRun: true };
  }

  try {
    await BiometricAuth.authenticate({
      reason: 'Unlock Khatawali',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      androidTitle: 'Biometric Login',
      androidSubtitle: 'Use fingerprint to unlock Khatawali',
      androidConfirmationRequired: false
    });
    return { unlocked: true, required: true, available: true };
  } catch (error) {
    const message = error?.message || 'Fingerprint authentication failed.';
    return { unlocked: false, required: true, available: true, message };
  }
};
