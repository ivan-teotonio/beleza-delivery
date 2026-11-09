import React from 'react';
import { Redirect } from 'expo-router';
import { Loading } from '../src/components/Loading';
import { ErrorState } from '../src/components/ErrorState';
import { useSession } from '../src/providers/SessionProvider';
import { rotaInicial } from '../src/lib/routes';
import { Screen } from '../src/components/Screen';

export default function Index() {
  const {
    session,
    loading,
    perfil,
    perfilLoading,
    erroPerfil,
    recarregarPerfil,
    precisaOnboarding,
    tipo,
  } = useSession();

  if (loading || (session && perfilLoading && !perfil)) {
    return (
      <Screen scroll={false}>
        <Loading mensagem="Preparando seu atendimento..." />
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

  return <Redirect href={rotaInicial(tipo, precisaOnboarding)} />;
}
