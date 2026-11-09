import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Card } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { Chip, ChipRow } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { InfoRow, Divider } from '../../src/components/InfoRow';
import { ErrorState } from '../../src/components/ErrorState';
import { Loading } from '../../src/components/Loading';
import { Stars } from '../../src/components/Stars';
import { relatorioProfissional } from '../../src/lib/api';
import { addDaysKey, formatBRL, formatDate, hojeSP } from '../../src/lib/format';
import { useQuery } from '../../src/hooks/useQuery';
import { colors, spacing } from '../../src/theme';

type Periodo = '7d' | '30d' | '90d';

function intervalo(periodo: Periodo): { inicio: string; fim: string } {
  const fim = hojeSP();
  const dias = periodo === '7d' ? 6 : periodo === '30d' ? 29 : 89;
  return { inicio: addDaysKey(fim, -dias), fim };
}

export default function Relatorio() {
  const [periodo, setPeriodo] = useState<Periodo>('30d');
  const { inicio, fim } = useMemo(() => intervalo(periodo), [periodo]);

  const consulta = useQuery(
    `relatorio:${inicio}:${fim}`,
    () => relatorioProfissional(inicio, fim),
    { cacheKey: `relatorio:${inicio}:${fim}` },
  );

  const r = consulta.data;

  return (
    <Screen refreshing={consulta.refreshing} onRefresh={() => void consulta.refresh()}>
      <PageHeader title="Relatório" subtitle="Acompanhe seus atendimentos e receitas" />

      <ChipRow>
        <Chip label="7 dias" selected={periodo === '7d'} onPress={() => setPeriodo('7d')} />
        <Chip label="30 dias" selected={periodo === '30d'} onPress={() => setPeriodo('30d')} />
        <Chip label="90 dias" selected={periodo === '90d'} onPress={() => setPeriodo('90d')} />
      </ChipRow>

      <AppText variant="caption" style={styles.periodo}>
        Período: {formatDate(inicio)} a {formatDate(fim)}
      </AppText>

      {consulta.loading && !r ? (
        <Loading mensagem="Gerando relatório..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : r ? (
        <>
          <View style={styles.cards}>
            <Card style={styles.metrica}>
              <AppText variant="caption">Atendimentos</AppText>
              <AppText variant="display" color={colors.primaryDark}>{r.total_atendimentos}</AppText>
            </Card>
            <Card style={styles.metrica}>
              <AppText variant="caption">Receita total</AppText>
              <AppText variant="title" color={colors.primaryDark}>{formatBRL(r.receita_total_centavos)}</AppText>
            </Card>
          </View>

          <Card style={styles.detalhes}>
            <InfoRow label="Receita de serviços" value={formatBRL(r.receita_servicos_centavos)} />
            <InfoRow label="Receita de deslocamento" value={formatBRL(r.receita_deslocamento_centavos)} />
            <Divider />
            <InfoRow label="Total recebido" value={formatBRL(r.receita_total_centavos)} strong />
            <InfoRow label="Cancelados no período" value={String(r.cancelados)} />
          </Card>

          <Card style={styles.avaliacao}>
            <AppText variant="bodyStrong">Média de avaliação</AppText>
            <Stars nota={r.media_avaliacao} showValue size={22} />
            <AppText variant="caption">Com base nas avaliações dos atendimentos do período.</AppText>
          </Card>

          <Notice tone="info" message="Os valores refletem atendimentos concluídos no período selecionado." />
          <Button label="Atualizar relatório" onPress={() => void consulta.refresh()} variant="outline" icon="refresh-outline" />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodo: { marginBottom: spacing.md },
  cards: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metrica: { flex: 1, gap: spacing.xs },
  detalhes: { gap: 2, marginBottom: spacing.md },
  avaliacao: { gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
});
