import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { Loading } from '../../src/components/Loading';
import { ErrorState } from '../../src/components/ErrorState';
import { Screen } from '../../src/components/Screen';
import { useSession } from '../../src/providers/SessionProvider';
import { colors } from '../../src/theme';

export default function AppLayout() {
  const { loading, session, perfil, perfilLoading, erroPerfil, recarregarPerfil, precisaOnboarding } =
    useSession();

  if (loading || (session && perfilLoading && !perfil)) {
    return (
      <Screen scroll={false}>
        <Loading mensagem="Carregando seu perfil..." />
      </Screen>
    );
  }

  if (!session) return <Redirect href="/entrar" />;

  if (!perfil && erroPerfil) {
    return (
      <Screen scroll={false}>
        <ErrorState mensagem={erroPerfil} onRetry={() => void recarregarPerfil()} />
      </Screen>
    );
  }

  if (precisaOnboarding) return <Redirect href="/onboarding-profissional" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
