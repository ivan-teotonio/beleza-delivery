import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { AgendamentoCard } from '../../../src/components/AgendamentoCard';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import { Button } from '../../../src/components/Button';
import { listarAgendamentos } from '../../../src/lib/api';
import { useQuery } from '../../../src/hooks/useQuery';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { useRealtime } from '../../../src/hooks/useRealtime';
import { useSession } from '../../../src/providers/SessionProvider';
import { colors, spacing } from '../../../src/theme';

export default function Agendamentos() {
  const { tipo } = useSession();
  const consulta = useQuery('agendamentos', listarAgendamentos, {
    cacheKey: 'agendamentos',
  });

  useFocusRefresh(() => consulta.refresh());

  useRealtime({
    canal: 'agendamentos-cliente',
    tabela: 'agendamento',
    aoMudar: () => {
      void consulta.refresh();
    },
  });

  const ativos = (consulta.data ?? []).filter(
    (agendamento) => agendamento.status === 'pendente' || agendamento.status === 'confirmado',
  );
  const historico = (consulta.data ?? []).filter(
    (agendamento) => agendamento.status !== 'pendente' && agendamento.status !== 'confirmado',
  );
  const aguardando = ativos.filter((agendamento) => agendamento.status === 'pendente').length;

  return (
    <Screen
      refreshing={consulta.refreshing}
      onRefresh={() => void consulta.refresh()}
    >
      <AppText variant="display">Meus agendamentos</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Acompanhe solicitações, atendimentos confirmados e seu histórico.
      </AppText>

      {consulta.stale ? <StaleNotice /> : null}

      {aguardando > 0 ? (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <AppText variant="label" color={colors.warning}>
            {aguardando === 1
              ? '1 solicitação aguardando resposta do profissional.'
              : `${aguardando} solicitações aguardando resposta dos profissionais.`}
          </AppText>
        </View>
      ) : null}

      {consulta.loading && !consulta.data ? (
        <Loading mensagem="Carregando seus agendamentos..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : (consulta.data ?? []).length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Nenhum agendamento ainda"
          message="Encontre um profissional perto de você e solicite seu primeiro atendimento a domicílio."
          actionLabel="Buscar profissionais"
          onAction={() => router.push('/inicio')}
        />
      ) : (
        <>
          {ativos.length > 0 ? (
            <View>
              <SectionHeader title="Em andamento" subtitle="Solicitações e atendimentos ativos" />
              {ativos.map((agendamento) => (
                <AgendamentoCard
                  key={agendamento.id}
                  agendamento={agendamento}
                  papel={tipo}
                  onPress={() => router.push(`/agendamento/${agendamento.id}`)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.semAtivos}>
              <AppText variant="body" color={colors.textMuted}>
                Você não tem atendimentos ativos no momento.
              </AppText>
              <Button
                label="Buscar profissionais"
                onPress={() => router.push('/inicio')}
                variant="secondary"
                fullWidth={false}
                icon="search-outline"
              />
            </View>
          )}

          {historico.length > 0 ? (
            <View>
              <SectionHeader title="Histórico" subtitle="Atendimentos concluídos, recusados e cancelados" />
              {historico.map((agendamento) => (
                <AgendamentoCard
                  key={agendamento.id}
                  agendamento={agendamento}
                  papel={tipo}
                  onPress={() => router.push(`/agendamento/${agendamento.id}`)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitulo: { marginTop: spacing.xs, marginBottom: spacing.lg },
  aviso: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  semAtivos: { gap: spacing.md, paddingVertical: spacing.lg, alignItems: 'flex-start' },
});
