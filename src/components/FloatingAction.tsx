import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, radius, shadow, spacing } from '../theme';

export interface FloatingActionProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  bottom?: number;
}

export function FloatingAction({ label, icon = 'add', onPress, bottom = 24 }: FloatingActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.botao, { bottom, opacity: pressed ? 0.85 : 1 }]}
    >
      <Ionicons name={icon} size={24} color={colors.textOnPrimary} />
      <AppText variant="label" color={colors.textOnPrimary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadow.floating,
  },
});
