import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, minTouchTarget, radius, spacing } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const FUNDOS: Record<ButtonVariant, { fundo: string; texto: string; borda: string }> = {
  primary: { fundo: colors.primary, texto: colors.textOnPrimary, borda: colors.primary },
  secondary: { fundo: colors.primarySoft, texto: colors.primaryDark, borda: colors.primaryBorder },
  outline: { fundo: colors.surface, texto: colors.primary, borda: colors.primary },
  ghost: { fundo: 'transparent', texto: colors.primary, borda: 'transparent' },
  danger: { fundo: colors.danger, texto: colors.white, borda: colors.danger },
  success: { fundo: colors.success, texto: colors.white, borda: colors.success },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const cores = FUNDOS[variant];
  const bloqueado = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={bloqueado ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: bloqueado, busy: loading }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        {
          backgroundColor: cores.fundo,
          borderColor: cores.borda,
          opacity: bloqueado ? 0.55 : pressed ? 0.82 : 1,
        },
        fullWidth ? styles.full : styles.auto,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={cores.texto} />
      ) : (
        <View style={styles.conteudo}>
          {icon ? <Ionicons name={icon} size={20} color={cores.texto} /> : null}
          <AppText variant="button" color={cores.texto} style={styles.label} numberOfLines={2}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  color?: string;
  backgroundColor?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.primary,
  backgroundColor = colors.primarySoft,
  size = 44,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: Math.max(minTouchTarget, size),
          height: Math.max(minTouchTarget, size),
          borderRadius: Math.max(minTouchTarget, size) / 2,
          backgroundColor,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  md: { paddingVertical: spacing.md },
  lg: { paddingVertical: spacing.md + 4, minHeight: 56 },
  full: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { textAlign: 'center' },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
});
