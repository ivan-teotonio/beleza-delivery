import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '../../../src/providers/SessionProvider';
import { colors } from '../../../src/theme';

export default function TabsLayout() {
  const { tipo } = useSession();

  const cliente = tipo === 'cliente';
  const profissional = tipo === 'profissional';
  const admin = tipo === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarItemStyle: { minHeight: 48 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Buscar',
          href: cliente ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="agendamentos"
        options={{
          title: 'Agendamentos',
          href: cliente ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="solicitacoes"
        options={{
          title: 'Solicitações',
          href: profissional ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          href: profissional ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="servicos"
        options={{
          title: 'Serviços',
          href: profissional ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="cut-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="aprovacoes"
        options={{
          title: 'Aprovações',
          href: admin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="auditoria"
        options={{
          title: 'Auditoria',
          href: admin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
