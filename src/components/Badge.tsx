import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme';
import type { StatusAgendamento } from '../lib/types';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONS: Record<BadgeTone, { fundo: string; texto: string; borda: string }> = {
  neutral: { fundo: colors.surfaceAlt, texto: colors.textMuted, borda: colors.border },
  primary: { fundo: colors.primarySoft, texto: colors.primaryDark, borda: colors.primaryBorder },
  success: { fundo: colors.successBg, texto: colors.success, borda: colors.successBorder },
  warning: { fundo: colors.warningBg, texto: colors.warning, borda: colors.warningBorder },
  danger: { fundo: colors.dangerBg, texto: colors.danger, borda: colors.dangerBorder },
  info: { fundo: colors.infoBg, texto: colors.info, borda: colors.infoBorder },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', icon, style }: BadgeProps) {
  const cores = TONS[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cores.fundo, borderColor: cores.borda },
        style,
      ]}
      accessible
      accessibilityLabel={label}
    >
      {icon}
      <AppText variant="caption" color={cores.texto} style={styles.texto}>
        {label}
      </AppText>
    </View>
  );
}

export const STATUS_LABEL: Record<StatusAgendamento, string> = {
  pendente: 'Aguardando resposta',
  confirmado: 'Confirmado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  expirado: 'Expirado',
};

export const STATUS_TONE: Record<StatusAgendamento, BadgeTone> = {
  pendente: 'warning',
  confirmado: 'success',
  recusado: 'danger',
  cancelado: 'neutral',
  concluido: 'primary',
  expirado: 'danger',
};

export function StatusBadge({ status }: { status: StatusAgendamento }) {
  return <Badge label={STATUS_LABEL[status] ?? status} tone={STATUS_TONE[status] ?? 'neutral'} />;
}

export const STATUS_VERIFICACAO_LABEL = {
  pendente: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
} as const;

export const STATUS_VERIFICACAO_TONE = {
  pendente: 'warning',
  aprovado: 'success',
  reprovado: 'danger',
} as const;

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  texto: { fontWeight: '700' },
});
