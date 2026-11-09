import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { useNetwork } from '../providers/NetworkProvider';
import { useSync } from '../providers/SyncProvider';
import { colors, radius, spacing } from '../theme';

/** Faixa no topo quando o aparelho está sem conexão (RNF07/RNF10). */
export function OfflineBanner({ inline = false }: { inline?: boolean }) {
  const { online, verificado } = useNetwork();
  const { pendentes } = useSync();
  const insets = useSafeAreaInsets();

  if (!verificado || online) return null;

  return (
    <View
      style={[
        styles.banner,
        inline ? styles.bannerInline : { paddingTop: insets.top + spacing.xs },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
      <AppText variant="caption" color={colors.white} style={styles.texto}>
        Sem conexão. Você pode consultar os dados salvos; ações críticas ficam bloqueadas.
        {pendentes > 0 ? ` ${pendentes} mensagem(ns) aguardando envio.` : ''}
      </AppText>
    </View>
  );
}

/** Aviso para telas que estão exibindo cache local (RNF07). */
export function StaleNotice({ mensagem }: { mensagem?: string }) {
  return (
    <View style={styles.stale} accessibilityLiveRegion="polite">
      <Ionicons name="time-outline" size={16} color={colors.warning} />
      <AppText variant="caption" color={colors.warning} style={styles.texto}>
        {mensagem ?? 'Dados salvos neste aparelho podem estar desatualizados.'}
      </AppText>
      <View style={styles.espaco} />
    </View>
  );
}

export function PressableBanner({
  titulo,
  mensagem,
  onPress,
  icon = 'information-circle-outline',
}: {
  titulo: string;
  mensagem: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${mensagem}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.cardTexto}>
        <AppText variant="label">{titulo}</AppText>
        <AppText variant="caption">{mensagem}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  texto: { flex: 1, color: colors.white },
  bannerInline: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  stale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  espaco: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTexto: { flex: 1 },
});
