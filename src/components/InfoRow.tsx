import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

export interface InfoRowProps {
  label: string;
  value?: string | null;
  strong?: boolean;
  valueColor?: string;
}

export function InfoRow({ label, value, strong, valueColor }: InfoRowProps) {
  return (
    <View style={styles.linha}>
      <AppText variant={strong ? 'bodyStrong' : 'body'} color={colors.textMuted} style={styles.label}>
        {label}
      </AppText>
      <AppText
        variant={strong ? 'bodyStrong' : 'body'}
        color={valueColor ?? colors.text}
        style={styles.valor}
      >
        {value ?? '—'}
      </AppText>
    </View>
  );
}

export function Divider({ style }: { style?: object }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  label: { flexShrink: 1 },
  valor: { flexShrink: 1, textAlign: 'right', fontWeight: '600' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
});
