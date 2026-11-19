import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { typography, type TypographyVariant } from '../theme';
import { useAccessibility } from '../providers/AccessibilityProvider';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
  children?: React.ReactNode;
}

/**
 * Texto do app com a escala de fonte escolhida em Acessibilidade.
 * O leitor de tela continua funcionando normalmente (TalkBack).
 */
export const AppText = React.forwardRef<React.ElementRef<typeof Text>, AppTextProps>(function AppText(
  { variant = 'body', color, weight, center, style, children, ...rest },
  ref,
) {
  const { fontScale } = useAccessibility();
  const base = typography[variant];
  const font = base.fontSize ?? 16;
  const line = base.lineHeight ?? Math.round(font * 1.45);

  return (
    <Text
      ref={ref}
      {...rest}
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[
        base,
        { fontSize: Math.round(font * fontScale), lineHeight: Math.round(line * fontScale) },
        color ? { color } : null,
        weight ? { fontWeight: weight } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
});
