import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '../../src/providers/SessionProvider';
import { rotaInicial } from '../../src/lib/routes';

export default function AppIndex() {
  const { tipo, precisaOnboarding } = useSession();
  return <Redirect href={rotaInicial(tipo, precisaOnboarding)} />;
}
