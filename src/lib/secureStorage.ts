import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Adaptador de storage para o Supabase Auth.
 *
 * O SecureStore tem limite de tamanho por item; a sessão JWT pode ultrapassar.
 * Por isso o valor é dividido em blocos. Na web, usamos localStorage.
 * Em ambientes sem SecureStore (ex.: Expo Go), falhas são ignoradas e a
 * sessão fica apenas em memória.
 */

const CHUNK_SIZE = 1800;
const COUNT_SUFFIX = '.__n';

const webStorage = {
  async getItem(key: string) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },
};

const nativeStorage = {
  async getItem(key: string) {
    try {
      const count = await SecureStore.getItemAsync(`${key}${COUNT_SUFFIX}`);
      if (!count) {
        return await SecureStore.getItemAsync(key);
      }
      const total = Number.parseInt(count, 10);
      if (!Number.isFinite(total) || total <= 0) return null;
      let valor = '';
      for (let i = 0; i < total; i += 1) {
        const parte = await SecureStore.getItemAsync(`${key}.${i}`);
        if (parte === null) return null;
        valor += parte;
      }
      return valor;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string) {
    try {
      const total = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
      for (let i = 0; i < total; i += 1) {
        await SecureStore.setItemAsync(
          `${key}.${i}`,
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        );
      }
      await SecureStore.setItemAsync(`${key}${COUNT_SUFFIX}`, String(total));
    } catch {
      // Ignora falhas de storage: a sessão continua em memória.
    }
  },
  async removeItem(key: string) {
    try {
      const count = await SecureStore.getItemAsync(`${key}${COUNT_SUFFIX}`).catch(() => null);
      if (count) {
        const total = Number.parseInt(count, 10);
        for (let i = 0; i < total; i += 1) {
          await SecureStore.deleteItemAsync(`${key}.${i}`).catch(() => undefined);
        }
        await SecureStore.deleteItemAsync(`${key}${COUNT_SUFFIX}`).catch(() => undefined);
      }
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
    } catch {
      // Ignora falhas de storage.
    }
  },
};

export const authStorage = Platform.OS === 'web' ? webStorage : nativeStorage;
