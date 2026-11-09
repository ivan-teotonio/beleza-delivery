import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { Card } from '../../../src/components/Card';
import { Badge, type BadgeTone } from '../../../src/components/Badge';
import { TextField } from '../../../src/components/TextField';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import { PageHeader } from '../../../src/components/PageHeader';
import { listarLogsAuditoria } from '../../../src/lib/api';
import { formatDateTime } from '../../../src/lib/format';
import { useDebounce } from '../../../src/hooks/useDebounce';
import { useQuery } from '../../../src/hooks/useQuery';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { colors, radius, spacing } from '../../../src/theme';

const ACAO_LABEL: Record<string, string> = {
  profissional_cadastrado: 'Profissional cadastrado',
  profissional_atualizado: 'Perfil profissional atualizado',
  profissional_aprovado: 'Profissional aprovado',
  profissional_reprovado: 'Profissional reprovado',
  config_deslocamento_atualizada: 'Faixas de deslocamento atualizadas',
  agendamento_solicitado: 'Agendamento solicitado',
  agendamento_confirmado: 'Agendamento aceito',
  agendamento_recusado: 'Agendamento recusado',
  agendamento_cancelado: 'Agendamento cancelado',
  agendamento_concluido: 'Atendimento concluído',
  agendamento_expirado: 'Solicitação expirada',
  avaliacao_criada: 'Avaliação registrada',
  endereco_atualizado: 'Endereço atualizado',
  foto_profissional_atualizada: 'Foto do profissional atualizada',
  documento_profissional_atualizado: 'Documento do profissional atualizado',
  servico_criado: 'Serviço criado',
  servico_atualizado: 'Serviço atualizado',
  servico_excluido: 'Serviço excluído',
};

function tomDaAcao(acao: string): BadgeTone {
  if (/aprovado|concluido|criado/.test(acao)) return 'success';
  if (/recusado|reprovado|cancelado|expirado/.test(acao)) return 'danger';
  if (/atualizad|config/.test(acao)) return 'info';
  return 'neutral';
}

export default function Auditoria() {
  const [busca, setBusca] = useState('');
  const buscaAdiada = useDebounce(busca, 300);

  const consulta = useQuery('auditoria', () => listarLogsAuditoria(150), {
    cacheKey: 'auditoria',
  });

  useFocusRefresh(() => consulta.refresh());

  const logs = useMemo(() => {
    const termo = buscaAdiada.trim().toLowerCase();
    const dados = consulta.data ?? [];
    if (!termo) return dados;
    return dados.filter((log) => {
      const rotulo = (ACAO_LABEL[log.acao] ?? log.acao).toLowerCase();
      return (
        rotulo.includes(termo) ||
        log.entidade.toLowerCase().includes(termo) ||
        (log.entidade_id ?? '').toLowerCase().includes(termo)
      );
    });
  }, [consulta.data, buscaAdiada]);

  return (
    <Screen refreshing={consulta.refreshing} onRefresh={() => void consulta.refresh()}>
      <PageHeader
        title="Auditoria"
        back={false}
        subtitle="Registro das ações críticas do aplicativo"
      />

      <TextField
        label="Filtrar registros"
        value={busca}
        onChangeText={setBusca}
        placeholder="Ex.: aprovado, agendamento, avaliação"
        leftIcon="search-outline"
        autoCorrect={false}
      />

      {consulta.stale ? <StaleNotice /> : null}

      {consulta.loading && !consulta.data ? (
        <Loading mensagem="Carregando registros de auditoria..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={busca.trim() ? 'Nenhum registro encontrado' : 'Nenhum registro ainda'}
          message={
            busca.trim()
              ? 'Tente outro termo de busca.'
              : 'As ações de cadastro, agenda, valores e aprovação aparecerão aqui.'
          }
          actionLabel={busca.trim() ? 'Limpar busca' : undefined}
          onAction={() => setBusca('')}
        />
      ) : (
        logs.map((log) => {
          const rotulo = ACAO_LABEL[log.acao] ?? log.acao;
          const detalhe = log.detalhe_json && Object.keys(log.detalhe_json).length > 0
            ? JSON.stringify(log.detalhe_json)
            : null;
          return (
            <Card key={log.id} style={styles.card}>
              <View style={styles.topo}>
                <View style={styles.icone}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.info}>
                  <AppText variant="bodyStrong">{rotulo}</AppText>
                  <AppText variant="caption">
                    {log.entidade}
                    {log.entidade_id ? ` · ${log.entidade_id.slice(0, 8)}` : ''}
                  </AppText>
                  <AppText variant="caption">{formatDateTime(log.criado_em)}</AppText>
                </View>
                <Badge label={log.acao.replaceAll('_', ' ')} tone={tomDaAcao(log.acao)} />
              </View>
              {detalhe ? (
                <View style={styles.detalhe}>
                  <AppText variant="caption" numberOfLines={4}>
                    {detalhe}
                  </AppText>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  icone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 1 },
  detalhe: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});
