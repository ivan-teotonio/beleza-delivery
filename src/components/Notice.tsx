import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme';

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

const TONS: Record<NoticeTone, { fundo: string; borda: string; texto: string; icone: keyof typeof Ionicons.glyphMap }> = {
  info: { fundo: colors.infoBg, borda: colors.infoBorder, texto: colors.info, icone: 'information-circle-outline' },
  warning: { fundo: colors.warningBg, borda: colors.warningBorder, texto: colors.warning, icone: 'alert-circle-outline' },
  danger: { fundo: colors.dangerBg, borda: colors.dangerBorder, texto: colors.danger, icone: 'warning-outline' },
  success: { fundo: colors.successBg, borda: colors.successBorder, texto: colors.success, icone: 'checkmark-circle-outline' },
};

export interface NoticeProps {
  tone?: NoticeTone;
  message: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Notice({ tone = 'info', message, title, actionLabel, onAction, style }: NoticeProps) {
  const cores = TONS[tone];
  return (
    <View
      style={[styles.notice, { backgroundColor: cores.fundo, borderColor: cores.borda }, style]}
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={cores.icone} size={20} color={cores.texto} style={styles.icone} />
      <View style={styles.conteudo}>
        {title ? (
          <AppText variant="label" color={cores.texto}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="caption" color={cores.texto} style={styles.mensagem}>
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={6}
            style={styles.acao}
          >
            <AppText variant="label" color={cores.texto} style={styles.acaoTexto}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icone: { marginTop: 1 },
  conteudo: { flex: 1 },
  mensagem: { marginTop: 2 },
  acao: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  acaoTexto: { textDecorationLine: 'underline' },
});
