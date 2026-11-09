import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AccessibilityProvider } from '../src/providers/AccessibilityProvider';
import { NetworkProvider } from '../src/providers/NetworkProvider';
import { SessionProvider } from '../src/providers/SessionProvider';
import { SyncProvider } from '../src/providers/SyncProvider';
import { ToastProvider } from '../src/providers/ToastProvider';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AccessibilityProvider>
        <NetworkProvider>
          <SessionProvider>
            <SyncProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.bg },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(app)" />
                  <Stack.Screen
                    name="onboarding-profissional"
                    options={{ gestureEnabled: false, animation: 'fade' }}
                  />
                  <Stack.Screen name="redefinir-senha" />
                </Stack>
              </ToastProvider>
            </SyncProvider>
          </SessionProvider>
        </NetworkProvider>
      </AccessibilityProvider>
    </SafeAreaProvider>
  );
}
