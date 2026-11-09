import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

export function Loading({ mensagem = 'Carregando...' }: { mensagem?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={mensagem}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="body" color={colors.textMuted} center style={styles.texto}>
        {mensagem}
      </AppText>
    </View>
  );
}

export function LoadingInline({ mensagem }: { mensagem?: string }) {
  return (
    <View style={styles.inline}>
      <ActivityIndicator color={colors.primary} />
      {mensagem ? <AppText variant="caption">{mensagem}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  texto: { marginTop: spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
});
