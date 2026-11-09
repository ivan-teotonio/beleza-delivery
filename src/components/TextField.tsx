import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, minTouchTarget, radius, spacing } from '../theme';
import { useAccessibility } from '../providers/AccessibilityProvider';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  helper?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  suffix?: string;
}

export const TextField = React.forwardRef<React.ElementRef<typeof TextInput>, TextFieldProps>(function TextField(
  {
    label,
    error,
    helper,
    required,
    containerStyle,
    leftIcon,
    suffix,
    style,
    onFocus,
    onBlur,
    accessibilityLabel,
    ...rest
  },
  ref,
) {
  const [focado, setFocado] = useState(false);
  const [oculto, setOculto] = useState(Boolean(rest.secureTextEntry));
  const { fontScale } = useAccessibility();

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" style={styles.label}>
        {label}
        {required ? <AppText variant="label" color={colors.danger}> *</AppText> : null}
      </AppText>
      <View
        style={[
          styles.caixa,
          focado && styles.caixaFocada,
          error ? styles.caixaErro : null,
          rest.multiline ? styles.caixaMultilinha : null,
        ]}
      >
        {leftIcon ? <Ionicons name={leftIcon} size={20} color={colors.textMuted} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          allowFontScaling
          maxFontSizeMultiplier={1.4}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? helper}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={rest.secureTextEntry ? oculto : false}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { fontSize: Math.round(16 * fontScale) },
            rest.multiline ? styles.inputMultilinha : null,
            style,
          ]}
        />
        {suffix ? <AppText variant="bodyStrong" color={colors.textMuted}>{suffix}</AppText> : null}
        {rest.secureTextEntry ? (
          <Ionicons
            name={oculto ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color={colors.textMuted}
            accessibilityRole="button"
            accessibilityLabel={oculto ? 'Mostrar senha' : 'Ocultar senha'}
            onPress={() => setOculto((v) => !v)}
          />
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite" style={styles.helper}>
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" style={styles.helper}>
          {helper}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs + 2 },
  caixa: {
    minHeight: minTouchTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  caixaFocada: { borderColor: colors.primary, backgroundColor: colors.white },
  caixaErro: { borderColor: colors.danger },
  caixaMultilinha: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  input: { flex: 1, color: colors.text, paddingVertical: spacing.sm, minHeight: minTouchTarget },
  inputMultilinha: { minHeight: 100, textAlignVertical: 'top', paddingTop: spacing.sm },
  helper: { marginTop: spacing.xs + 2 },
});
