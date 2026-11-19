import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selecionado : null,
        pressed && { opacity: 0.8 },
      ]}
    >
      <AppText
        variant="caption"
        color={selected ? colors.textOnPrimary : colors.text}
        style={styles.texto}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function ChipRow({
  children,
  horizontal = true,
}: {
  children: React.ReactNode;
  horizontal?: boolean;
}) {
  if (!horizontal) return <>{children}</>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.linha}
      style={styles.scroll}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  selecionado: { backgroundColor: colors.primary, borderColor: colors.primary },
  texto: { fontWeight: '700' },
  scroll: { marginBottom: spacing.sm },
  linha: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.xxl },
});
