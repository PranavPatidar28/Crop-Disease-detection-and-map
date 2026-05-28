import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'onboarding.skipped.v1';

export const onboardingStorage = {
  async getSkipped(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEY)) === '1';
    } catch {
      return false;
    }
  },
  async setSkipped(value: boolean): Promise<void> {
    try {
      if (value) {
        await AsyncStorage.setItem(KEY, '1');
      } else {
        await AsyncStorage.removeItem(KEY);
      }
    } catch {
      /* ignore */
    }
  },
};
