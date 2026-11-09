import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppText } from './AppText';
import { colors, minTouchTarget, spacing } from '../theme';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Exibe a seta de voltar (padrão: true). */
  back?: boolean;
  right?: React.ReactNode;
}

/** Cabeçalho padrão das telas internas, com alvo de toque acessível. */
export function PageHeader({ title, subtitle, back = true, right }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/perfil'))}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={6}
          style={styles.voltar}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
      ) : null}
      <View style={styles.textos}>
        <AppText variant="title" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.subtitulo}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View style={styles.direita}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  voltar: {
    width: minTouchTarget,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  textos: { flex: 1, paddingTop: spacing.xs },
  subtitulo: { marginTop: 2 },
  direita: { alignSelf: 'center' },
});
