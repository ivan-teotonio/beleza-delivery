import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import { StatusBadge } from './Badge';
import { formatBRL, formatDateTime, prazoResposta } from '../lib/format';
import type { Agendamento, TipoConta } from '../lib/types';
import { colors, spacing } from '../theme';

export function AgendamentoCard({
  agendamento,
  onPress,
  papel,
}: {
  agendamento: Agendamento;
  onPress: () => void;
  papel: TipoConta | null;
}) {
  const mostrarCliente = papel === 'profissional' || papel === 'admin';
  const pessoa = mostrarCliente
    ? { nome: agendamento.cliente_nome, foto: null }
    : { nome: agendamento.profissional_nome, foto: agendamento.profissional_foto_url };

  const rotulo = [
    agendamento.servico_tipo,
    `com ${pessoa.nome}`,
    formatDateTime(agendamento.inicio),
    `valor total ${formatBRL(agendamento.total_centavos)}`,
    `status ${agendamento.status}`,
  ].join('. ');

  return (
    <Card onPress={onPress} accessibilityLabel={rotulo} style={styles.card}>
      <View style={styles.topo}>
        <Avatar nome={pessoa.nome} uri={pessoa.foto} size={48} />
        <View style={styles.info}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {agendamento.servico_tipo}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {mostrarCliente ? 'Cliente' : 'Profissional'}: {pessoa.nome}
          </AppText>
        </View>
        <StatusBadge status={agendamento.status} />
      </View>

      <View style={styles.linha}>
        <View style={styles.infoLinha}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <AppText variant="caption">{formatDateTime(agendamento.inicio)}</AppText>
        </View>
        <View style={styles.infoLinha}>
          <Ionicons name="navigate-outline" size={16} color={colors.textMuted} />
          <AppText variant="caption">{agendamento.bairro}</AppText>
        </View>
      </View>

      <View style={styles.rodape}>
        <View style={styles.valores}>
          <AppText variant="caption">Serviço {formatBRL(agendamento.servico_preco_centavos)}</AppText>
          <AppText variant="caption">
            Deslocamento {formatBRL(agendamento.valor_deslocamento_centavos)}
          </AppText>
          <AppText variant="bodyStrong" color={colors.primaryDark}>
            Total {formatBRL(agendamento.total_centavos)}
          </AppText>
        </View>
        {agendamento.status === 'pendente' ? (
          <AppText variant="caption" color={colors.warning} style={styles.prazo}>
            {prazoResposta(agendamento.responder_ate)}
          </AppText>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1, gap: 2 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  infoLinha: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  valores: { gap: 1 },
  prazo: { flexShrink: 1, textAlign: 'right', fontWeight: '700' },
});
