import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { OfflineBanner } from './OfflineBanner';

export interface ScreenProps {
  children: React.ReactNode;
  /** Conteúdo rolável (padrão: true). */
  scroll?: boolean;
  /** Aplica padding horizontal/padrão. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
  /** Habilita "pull to refresh". */
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Rodapé fixo (ex.: botão de ação principal). */
  footer?: React.ReactNode;
  keyboard?: boolean;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  contentContainerStyle,
  edges = ['top', 'left', 'right'],
  refreshing = false,
  onRefresh,
  footer,
  keyboard = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const inner = (
    <View style={[styles.flex, padded && styles.padded, contentContainerStyle]}>{children}</View>
  );

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, footer ? styles.scrollWithFooter : null]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {inner}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{inner}</View>
  );

  const content = (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.bg }, style]}>
      <View style={styles.bannerWrap}>
        <OfflineBanner inline />
      </View>
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.sm) },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );

  if (!keyboard) return content;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  scrollContent: { flexGrow: 1 },
  scrollWithFooter: { paddingBottom: spacing.xl },
  bannerWrap: { paddingHorizontal: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
