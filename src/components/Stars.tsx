import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { colors, spacing } from '../theme';

const NOTAS = [1, 2, 3, 4, 5];

export interface StarsProps {
  nota: number;
  onChange?: (nota: number) => void;
  size?: number;
  showValue?: boolean;
  total?: number;
}

export function Stars({ nota, onChange, size = 20, showValue = false, total }: StarsProps) {
  const interativo = Boolean(onChange);

  return (
    <View
      style={styles.linha}
      accessible={!interativo}
      accessibilityLabel={
        !interativo
          ? `Nota ${Number(nota).toFixed(1)} de 5${total !== undefined ? `, ${total} avaliações` : ''}`
          : 'Avaliação de 1 a 5 estrelas'
      }
    >
      {NOTAS.map((valor) => {
        const preenchida = valor <= Math.round(nota);
        const estrela = (
          <Ionicons
            name={preenchida ? 'star' : 'star-outline'}
            size={size}
            color={preenchida ? '#B45309' : colors.borderStrong}
          />
        );
        if (!interativo) {
          return <View key={valor}>{estrela}</View>;
        }
        return (
          <Pressable
            key={valor}
            onPress={() => onChange?.(valor)}
            accessibilityRole="button"
            accessibilityLabel={`${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`}
            accessibilityState={{ selected: valor <= nota }}
            hitSlop={6}
            style={styles.botaoEstrela}
          >
            {estrela}
          </Pressable>
        );
      })}
      {showValue ? (
        <AppText variant="caption" style={styles.valor}>
          {Number(nota).toFixed(1)}
          {total !== undefined ? ` (${total})` : ''}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' },
  botaoEstrela: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  valor: { marginLeft: spacing.xs },
});
