import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Push remoto via Expo Push (RNF14).
 *
 * Em Expo Go no Android o push remoto não é suportado; o app continua
 * funcional com notificações locais enquanto estiver aberto.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function prepararNotificacoes(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('agendamentos', {
        name: 'Agendamentos',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6B2148',
      });
    }

    if (!Device.isDevice) return null;

    const permissaoAtual = await Notifications.getPermissionsAsync();
    let status = permissaoAtual.status;
    if (status !== 'granted') {
      const pedida = await Notifications.requestPermissionsAsync();
      status = pedida.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
        ?.projectId ?? Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    // Expo Go/emulador sem push remoto: segue com fallback local.
    return null;
  }
}

export async function notificarLocal(
  titulo: string,
  corpo: string,
  dados?: Record<string, unknown>,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        data: dados ?? {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch {
    // Notificação é best-effort; nunca interrompe o fluxo principal.
  }
}
