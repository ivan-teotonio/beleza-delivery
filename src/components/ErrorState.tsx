import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, radius, spacing } from '../theme';

export interface ErrorStateProps {
  mensagem: string;
  onRetry?: () => void;
  titulo?: string;
}

export function ErrorState({ mensagem, onRetry, titulo = 'Algo deu errado' }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={34} color={colors.danger} />
      <AppText variant="subtitle" center style={styles.titulo}>
        {titulo}
      </AppText>
      <AppText variant="body" color={colors.textMuted} center>
        {mensagem}
      </AppText>
      {onRetry ? (
        <Button label="Tentar novamente" onPress={onRetry} variant="outline" fullWidth={false} style={styles.botao} />
      ) : null}
    </View>
  );
}

export function FormError({ mensagem }: { mensagem?: string | null }) {
  if (!mensagem) return null;
  return (
    <View style={styles.formError} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <AppText variant="caption" color={colors.danger} style={styles.formErrorTexto}>
        {mensagem}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  titulo: { marginTop: spacing.xs },
  botao: { marginTop: spacing.md },
  formError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formErrorTexto: { flex: 1, fontWeight: '600' },
});
