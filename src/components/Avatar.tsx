import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { iniciais } from '../lib/format';
import { colors } from '../theme';

export interface AvatarProps {
  nome: string;
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ nome, uri, size = 56, style }: AvatarProps) {
  const dimensoes = { width: size, height: size, borderRadius: size / 2 };
  const tamanhoTexto = Math.max(14, Math.round(size * 0.36));

  return (
    <View
      style={[styles.base, dimensoes, style]}
      accessible
      accessibilityLabel={uri ? `Foto de ${nome}` : `Iniciais de ${nome}`}
    >
      {uri ? (
        <Image source={{ uri }} style={dimensoes} resizeMode="cover" />
      ) : (
        <AppText
          variant="bodyStrong"
          color={colors.primaryDark}
          style={{ fontSize: tamanhoTexto, lineHeight: tamanhoTexto + 4 }}
          allowFontScaling={false}
        >
          {iniciais(nome)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
