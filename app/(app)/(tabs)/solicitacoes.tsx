import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { Card } from '../../../src/components/Card';
import { Avatar } from '../../../src/components/Avatar';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Dialog } from '../../../src/components/Dialog';
import { TextField } from '../../../src/components/TextField';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { Notice } from '../../../src/components/Notice';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import { decidirAgendamento, listarAgendamentos } from '../../../src/lib/api';
import { formatBRL, formatDateTime, formatDistance, prazoResposta } from '../../../src/lib/format';
import { mensagemErro } from '../../../src/lib/errors';
import { useQuery } from '../../../src/hooks/useQuery';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { useRealtime } from '../../../src/hooks/useRealtime';
import { useNetwork } from '../../../src/providers/NetworkProvider';
import { useSession } from '../../../src/providers/SessionProvider';
import { useToast } from '../../../src/providers/ToastProvider';
import type { Agendamento } from '../../../src/lib/types';
import { colors, radius, spacing } from '../../../src/theme';

export default function Solicitacoes() {
  const { perfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();
  const [processando, setProcessando] = useState<string | null>(null);
  const [confirmarAceite, setConfirmarAceite] = useState<Agendamento | null>(null);
  const [recusando, setRecusando] = useState<Agendamento | null>(null);
  const [motivo, setMotivo] = useState('');

  const consulta = useQuery('agendamentos', listarAgendamentos, {
    cacheKey: 'agendamentos',
  });

  useFocusRefresh(() => consulta.refresh());

  useRealtime({
    canal: 'solicitacoes-profissional',
    tabela: 'agendamento',
    aoMudar: () => {
      void consulta.refresh();
    },
  });

  const pendentes = (consulta.data ?? []).filter((agendamento) => agendamento.status === 'pendente');
  const aprovado = perfil?.profissional?.status_verificacao === 'aprovado';

  async function aceitar(agendamento: Agendamento) {
    if (!online) {
      showToast('Conecte-se à internet para aceitar a solicitação.', 'error');
      return;
    }
    setProcessando(agendamento.id);
    try {
      await decidirAgendamento(agendamento.id, true);
      showToast('Atendimento aceito! O endereço completo foi liberado.');
      setConfirmarAceite(null);
      await consulta.refresh();
    } catch (erro) {
      showToast(mensagemErro(erro), 'error');
    } finally {
      setProcessando(null);
    }
  }

  async function recusar() {
    if (!recusando) return;
    if (!online) {
      showToast('Conecte-se à internet para recusar a solicitação.', 'error');
      return;
    }
    setProcessando(recusando.id);
    try {
      await decidirAgendamento(recusando.id, false, motivo.trim() || undefined);
      showToast('Solicitação recusada. O horário foi liberado na sua agenda.');
      setRecusando(null);
      setMotivo('');
      await consulta.refresh();
    } catch (erro) {
      showToast(mensagemErro(erro), 'error');
    } finally {
      setProcessando(null);
    }
  }

  return (
    <Screen refreshing={consulta.refreshing} onRefresh={() => void consulta.refresh()}>
      <AppText variant="display">Solicitações</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Atenda os pedidos dentro do prazo. O endereço completo só aparece depois do aceite.
      </AppText>

      {!aprovado ? (
        <Notice
          tone="warning"
          title="Cadastro em análise"
          message="Você receberá solicitações quando o administrador aprovar seu perfil."
        />
      ) : null}

      {!online ? (
        <Notice
          tone="info"
          message="Sem conexão. As solicitações salvas podem estar desatualizadas e aceitar/recusar exige internet."
        />
      ) : null}

      {consulta.stale ? <StaleNotice /> : null}

      {consulta.loading && !consulta.data ? (
        <Loading mensagem="Carregando solicitações..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : pendentes.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Nenhuma solicitação agora"
          message="Quando um cliente solicitar um horário da sua agenda, ele aparece aqui com o prazo para resposta."
          actionLabel="Ver minha agenda"
          onAction={() => router.push('/agenda')}
        />
      ) : (
        pendentes.map((agendamento) => (
          <Card key={agendamento.id} style={styles.card}>
            <View style={styles.topo}>
              <Avatar nome={agendamento.cliente_nome} size={52} />
              <View style={styles.info}>
                <AppText variant="subtitle" numberOfLines={1}>
                  {agendamento.cliente_nome}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {agendamento.servico_tipo}
                </AppText>
              </View>
              <Badge
                label={prazoResposta(agendamento.responder_ate)}
                tone={agendamento.status === 'pendente' ? 'warning' : 'neutral'}
              />
            </View>

            <View style={styles.linhas}>
              <View style={styles.linhaInfo}>
                <Ionicons name="calendar-outline" size={17} color={colors.textMuted} />
                <AppText variant="body">{formatDateTime(agendamento.inicio)}</AppText>
              </View>
              <View style={styles.linhaInfo}>
                <Ionicons name="location-outline" size={17} color={colors.textMuted} />
                <AppText variant="body">
                  {agendamento.bairro}, {agendamento.cidade}
                  {agendamento.distancia_km != null
                    ? ` · ${formatDistance(agendamento.distancia_km)} aprox.`
                    : ''}
                </AppText>
              </View>
            </View>

            <View style={styles.valores}>
              <View style={styles.valorLinha}>
                <AppText variant="caption">Serviço</AppText>
                <AppText variant="body">{formatBRL(agendamento.servico_preco_centavos)}</AppText>
              </View>
              <View style={styles.valorLinha}>
                <AppText variant="caption">
                  Deslocamento
                  {agendamento.distancia_km != null
                    ? ` · ${formatDistance(agendamento.distancia_km)}`
                    : ''}
                </AppText>
                <AppText variant="body">{formatBRL(agendamento.valor_deslocamento_centavos)}</AppText>
              </View>
              <View style={styles.valorLinha}>
                <AppText variant="bodyStrong">Total</AppText>
                <AppText variant="subtitle" color={colors.primaryDark}>
                  {formatBRL(agendamento.total_centavos)}
                </AppText>
              </View>
            </View>

            <View style={styles.acoes}>
              <Button
                label="Recusar"
                onPress={() => {
                  setMotivo('');
                  setRecusando(agendamento);
                }}
                variant="outline"
                fullWidth={false}
                style={styles.acao}
                disabled={processando === agendamento.id || !online}
              />
              <Button
                label="Aceitar"
                onPress={() => setConfirmarAceite(agendamento)}
                variant="success"
                icon="checkmark-circle-outline"
                fullWidth={false}
                style={styles.acao}
                loading={processando === agendamento.id}
                disabled={processando === agendamento.id || !online}
              />
            </View>

            <Button
              label="Analisar detalhes"
              onPress={() => router.push(`/agendamento/${agendamento.id}`)}
              variant="ghost"
              icon="chevron-forward-outline"
              fullWidth={false}
            />
          </Card>
        ))
      )}

      <Dialog
        visible={Boolean(confirmarAceite)}
        onClose={() => setConfirmarAceite(null)}
        title="Aceitar atendimento?"
        message={
          confirmarAceite
            ? `${confirmarAceite.servico_tipo} em ${formatDateTime(confirmarAceite.inicio)}. O horário ficará bloqueado na sua agenda e o endereço completo será liberado.`
            : undefined
        }
        actions={[
          {
            label: 'Voltar',
            onPress: () => setConfirmarAceite(null),
            variant: 'ghost',
            disabled: Boolean(processando),
          },
          {
            label: 'Aceitar',
            onPress: () => {
              if (confirmarAceite) void aceitar(confirmarAceite);
            },
            variant: 'success',
            loading: Boolean(processando),
          },
        ]}
      />

      <Dialog
        visible={Boolean(recusando)}
        onClose={() => setRecusando(null)}
        title="Recusar solicitação"
        message="O horário voltará a ficar disponível na sua agenda. Se quiser, explique o motivo ao cliente."
        dismissible={!processando}
        actions={[
          {
            label: 'Cancelar',
            onPress: () => setRecusando(null),
            variant: 'ghost',
            disabled: Boolean(processando),
          },
          {
            label: 'Recusar',
            onPress: () => void recusar(),
            variant: 'danger',
            loading: Boolean(processando),
          },
        ]}
      >
        <TextField
          label="Motivo (opcional)"
          value={motivo}
          onChangeText={setMotivo}
          placeholder="Ex.: agenda já preenchida"
          multiline
          maxLength={300}
          editable={!processando}
        />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitulo: { marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  topo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1, gap: 2 },
  linhas: { gap: spacing.sm, marginTop: spacing.md },
  linhaInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  valores: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  valorLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  acoes: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  acao: { flex: 1 },
});
