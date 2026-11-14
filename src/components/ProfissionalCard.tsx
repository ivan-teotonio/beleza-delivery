import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { Stars } from './Stars';
import { Badge } from './Badge';
import { formatBRL, formatDistance } from '../lib/format';
import type { ResultadoBusca } from '../lib/types';
import { colors, radius, spacing } from '../theme';

export function ProfissionalCard({
  profissional,
  onPress,
}: {
  profissional: ResultadoBusca;
  onPress: () => void;
}) {
  const servicos = profissional.servicos ?? [];
  const menorPreco = servicos.length
    ? Math.min(...servicos.map((s) => s.preco_centavos))
    : null;
  const tipos = servicos.map((s) => s.tipo);
  const rotulo = [
    profissional.nome,
    `nota ${Number(profissional.media_avaliacao).toFixed(1)}`,
    `${formatDistance(profissional.distancia_km)} de distância`,
    menorPreco !== null ? `serviços a partir de ${formatBRL(menorPreco)}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Card onPress={onPress} accessibilityLabel={rotulo} accessibilityHint="Abre o perfil e a agenda" style={styles.card}>
      <View style={styles.linhaTopo}>
        <Avatar nome={profissional.nome} uri={profissional.foto_url} size={64} />
        <View style={styles.info}>
          <View style={styles.nomeLinha}>
            <AppText variant="subtitle" numberOfLines={1} style={styles.nome}>
              {profissional.nome}
            </AppText>
            <Badge label={`${formatDistance(profissional.distancia_km)} aprox.`} tone="primary" />
          </View>
          <View style={styles.avaliacao}>
            <Stars nota={profissional.media_avaliacao} size={16} />
            <AppText variant="caption">
              {Number(profissional.media_avaliacao).toFixed(1)} ({profissional.total_avaliacoes})
            </AppText>
          </View>
          <View style={styles.local}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <AppText variant="caption" numberOfLines={1} style={styles.localTexto}>
              {profissional.bairro}, {profissional.cidade}
            </AppText>
          </View>
        </View>
      </View>

      {tipos.length > 0 ? (
        <View style={styles.tags}>
          {tipos.slice(0, 3).map((tipo, i) => (
            <View key={`${tipo}-${i}`} style={styles.tag}>
              <AppText variant="caption" color={colors.primaryDark} numberOfLines={1}>
                {tipo}
              </AppText>
            </View>
          ))}
          {tipos.length > 3 ? (
            <AppText variant="caption" color={colors.textMuted}>
              +{tipos.length - 3}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.rodape}>
        <View>
          {menorPreco !== null ? (
            <AppText variant="caption" color={colors.textMuted}>
              A partir de
            </AppText>
          ) : null}
          {menorPreco !== null ? (
            <AppText variant="bodyStrong" color={colors.primaryDark}>
              {formatBRL(menorPreco)}
            </AppText>
          ) : null}
        </View>
        <View style={styles.verPerfil}>
          <AppText variant="label" color={colors.primary}>
            Ver perfil e horários
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  linhaTopo: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  nomeLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nome: { flexShrink: 1 },
  avaliacao: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  local: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  localTexto: { flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  tag: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    maxWidth: '60%',
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  verPerfil: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
