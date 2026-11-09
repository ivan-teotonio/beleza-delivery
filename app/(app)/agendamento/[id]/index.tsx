import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../../src/components/Screen';
import { PageHeader } from '../../../../src/components/PageHeader';
import { AppText } from '../../../../src/components/AppText';
import { Card } from '../../../../src/components/Card';
import { Avatar } from '../../../../src/components/Avatar';
import { StatusBadge } from '../../../../src/components/Badge';
import { Button } from '../../../../src/components/Button';
import { Dialog } from '../../../../src/components/Dialog';
import { TextField } from '../../../../src/components/TextField';
import { Notice } from '../../../../src/components/Notice';
import { SectionHeader } from '../../../../src/components/SectionHeader';
import { InfoRow, Divider } from '../../../../src/components/InfoRow';
import { Stars } from '../../../../src/components/Stars';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorState } from '../../../../src/components/ErrorState';
import { Loading } from '../../../../src/components/Loading';
import { StaleNotice } from '../../../../src/components/OfflineBanner';
import {
  cancelarAgendamento,
  concluirAgendamento,
  decidirAgendamento,
  detalharAgendamento,
} from '../../../../src/lib/api';
import {
  formatBRL,
  formatDateTime,
  formatDistance,
  formatTime,
  prazoResposta,
} from '../../../../src/lib/format';
import { mensagemErro } from '../../../../src/lib/errors';
import { linkMapa } from '../../../../src/lib/routes';
import { useFocusRefresh } from '../../../../src/hooks/useFocusRefresh';
import { useQuery } from '../../../../src/hooks/useQuery';
import { useRealtime } from '../../../../src/hooks/useRealtime';
import { useNetwork } from '../../../../src/providers/NetworkProvider';
import { useSession } from '../../../../src/providers/SessionProvider';
import { useToast } from '../../../../src/providers/ToastProvider';
import { colors, radius, spacing } from '../../../../src/theme';

export default function AgendamentoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agendamentoId = String(id ?? '');
  const { tipo, perfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();

  const [acao, setAcao] = useState<'aceitar' | 'recusar' | 'cancelar' | 'concluir' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [processando, setProcessando] = useState(false);

  const consulta = useQuery(
    `agendamento:${agendamentoId}`,
    () => detalharAgendamento(agendamentoId),
    { cacheKey: `agendamento:${agendamentoId}`, enabled: Boolean(agendamentoId) },
  );

  useFocusRefresh(() => {
    void consulta.refresh();
  });

  useRealtime({
    canal: `agendamento:${agendamentoId}`,
    tabela: 'agendamento',
    filtro: `id=eq.${agendamentoId}`,
    habilitado: Boolean(agendamentoId),
    aoMudar: () => {
      void consulta.refresh();
    },
  });

  const agendamento = consulta.data;
  const souProfissional = tipo === 'profissional';
  const pessoa = useMemo(() => {
    if (!agendamento) return null;
    return souProfissional
      ? { nome: agendamento.cliente_nome, foto: null, papel: 'Cliente' }
      : {
          nome: agendamento.profissional_nome,
          foto: agendamento.profissional_foto_url,
          papel: 'Profissional',
        };
  }, [agendamento, souProfissional]);

  async function executarAcao() {
    if (!agendamento) return;
    if (!online) {
      showToast('Conecte-se à internet para atualizar este agendamento.', 'error');
      return;
    }
    setProcessando(true);
    try {
      if (acao === 'aceitar') {
        await decidirAgendamento(agendamento.id, true);
        showToast('Atendimento aceito. O endereço completo foi liberado.');
      } else if (acao === 'recusar') {
        await decidirAgendamento(agendamento.id, false, motivo.trim() || undefined);
        showToast('Solicitação recusada.');
      } else if (acao === 'cancelar') {
        await cancelarAgendamento(agendamento.id, motivo.trim() || undefined);
        showToast('Agendamento cancelado.');
      } else if (acao === 'concluir') {
        await concluirAgendamento(agendamento.id);
        showToast('Atendimento concluído. O cliente já pode avaliar.');
      }
      setAcao(null);
      setMotivo('');
      await consulta.refresh();
    } catch (erro) {
      showToast(mensagemErro(erro), 'error');
    } finally {
      setProcessando(false);
    }
  }

  async function abrirMapa() {
    if (!agendamento?.endereco_liberado) return;
    const rotulo = [agendamento.rua, agendamento.numero, agendamento.bairro, agendamento.cidade]
      .filter(Boolean)
      .join(', ');
    const url = linkMapa(agendamento.endereco_lat, agendamento.endereco_lng, rotulo);
    if (!url) {
      showToast('Endereço sem localização disponível.', 'error');
      return;
    }
    await Linking.openURL(url);
  }

  if (consulta.loading && !agendamento) {
    return (
      <Screen scroll={false}>
        <Loading mensagem="Carregando agendamento..." />
      </Screen>
    );
  }

  if (consulta.error && !agendamento) {
    return (
      <Screen>
        <PageHeader title="Agendamento" />
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      </Screen>
    );
  }

  if (!agendamento) {
    return (
      <Screen>
        <PageHeader title="Agendamento" />
        <EmptyState
          icon="calendar-outline"
          title="Agendamento não encontrado"
          message="Ele pode ter sido removido ou você não tem acesso."
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const enderecoCompleto =
    agendamento.endereco_liberado && agendamento.rua
      ? [
          `${agendamento.rua}, ${agendamento.numero}`,
          agendamento.complemento ? `Compl.: ${agendamento.complemento}` : null,
          `${agendamento.bairro}, ${agendamento.cidade}`,
          agendamento.cep ? `CEP ${agendamento.cep}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      : `${agendamento.bairro}, ${agendamento.cidade}`;

  const podeChat =
    agendamento.status === 'pendente' || agendamento.status === 'confirmado';
  const acoesProfissional = souProfissional && agendamento.status === 'pendente';
  const dialogTitulo =
    acao === 'aceitar'
      ? 'Aceitar atendimento?'
      : acao === 'recusar'
        ? 'Recusar solicitação'
        : acao === 'cancelar'
          ? 'Cancelar agendamento'
          : 'Concluir atendimento';
  const dialogMensagem =
    acao === 'aceitar'
      ? 'Ao aceitar, o horário fica bloqueado e o endereço completo do cliente será liberado para você.'
      : acao === 'recusar'
        ? 'O horário voltará a ficar disponível. Se quiser, informe o motivo ao cliente.'
        : acao === 'cancelar'
          ? 'Esta ação não pode ser desfeita. O cancelamento pode ter impacto conforme as regras do serviço.'
          : 'Confirma que o atendimento foi realizado? Depois disso o cliente poderá avaliar o serviço.';

  return (
    <Screen
      refreshing={consulta.refreshing}
      onRefresh={() => void consulta.refresh()}
      footer={
        acoesProfissional ? (
          <View style={styles.footerAcoes}>
            <Button
              label="Recusar"
              onPress={() => {
                setMotivo('');
                setAcao('recusar');
              }}
              variant="outline"
              fullWidth={false}
              style={styles.footerBotao}
              disabled={!online}
            />
            <Button
              label="Aceitar"
              onPress={() => setAcao('aceitar')}
              variant="success"
              icon="checkmark-circle-outline"
              fullWidth={false}
              style={styles.footerBotao}
              disabled={!online}
            />
          </View>
        ) : undefined
      }
    >
      <PageHeader title="Detalhes do agendamento" />

      {consulta.stale ? <StaleNotice /> : null}
      {!online ? (
        <Notice
          tone="info"
          message="Sem conexão. Você pode consultar os dados salvos, mas aceitar, cancelar, concluir ou enviar mensagens exige internet."
        />
      ) : null}

      <Card style={styles.bloco}>
        <View style={styles.cabecalho}>
          {pessoa ? <Avatar nome={pessoa.nome} uri={pessoa.foto} size={56} /> : null}
          <View style={styles.cabecalhoTexto}>
            <AppText variant="caption">{pessoa?.papel}</AppText>
            <AppText variant="subtitle" numberOfLines={2}>
              {pessoa?.nome}
            </AppText>
            <StatusBadge status={agendamento.status} />
          </View>
        </View>

        {agendamento.status === 'pendente' ? (
          <View style={styles.prazo} accessibilityLiveRegion="polite">
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <AppText variant="label" color={colors.warning}>
              {prazoResposta(agendamento.responder_ate)}
            </AppText>
          </View>
        ) : null}

        {agendamento.motivo_recusa ? (
          <Notice tone="danger" title="Motivo informado" message={agendamento.motivo_recusa} />
        ) : null}
      </Card>

      <SectionHeader title="Atendimento" />
      <Card style={styles.bloco}>
        <InfoRow label="Serviço" value={agendamento.servico_tipo} strong />
        <InfoRow label="Data e horário" value={formatDateTime(agendamento.inicio)} />
        <InfoRow
          label="Término previsto"
          value={agendamento.fim ? formatTime(agendamento.fim) : '—'}
        />
        <InfoRow label="Solicitado em" value={formatDateTime(agendamento.solicitado_em)} />
      </Card>

      <SectionHeader
        title="Endereço"
        subtitle={
          agendamento.endereco_liberado
            ? 'Endereço completo liberado para este atendimento.'
            : 'O endereço completo é liberado após a confirmação.'
        }
      />
      <Card style={styles.bloco}>
        <View style={styles.enderecoLinha}>
          <Ionicons
            name={agendamento.endereco_liberado ? 'location' : 'location-outline'}
            size={22}
            color={colors.primary}
          />
          <AppText variant="body" style={styles.enderecoTexto}>
            {enderecoCompleto}
          </AppText>
        </View>
        {agendamento.endereco_liberado ? (
          <Button
            label="Abrir no mapa"
            onPress={() => void abrirMapa()}
            variant="secondary"
            icon="map-outline"
            fullWidth={false}
          />
        ) : (
          <AppText variant="caption">
            Por segurança, apenas o bairro e a cidade aparecem enquanto o agendamento não está confirmado.
          </AppText>
        )}
      </Card>

      <SectionHeader title="Valores" subtitle="Valores congelados no momento da solicitação" />
      <Card style={styles.bloco}>
        <InfoRow label="Serviço" value={formatBRL(agendamento.servico_preco_centavos)} />
        <InfoRow
          label={`Deslocamento${agendamento.distancia_km != null ? ` · ${formatDistance(agendamento.distancia_km)}` : ''}`}
          value={formatBRL(agendamento.valor_deslocamento_centavos)}
        />
        <Divider />
        <InfoRow label="Total" value={formatBRL(agendamento.total_centavos)} strong />
      </Card>

      {agendamento.avaliacao_nota ? (
        <>
          <SectionHeader title="Avaliação do cliente" />
          <Card style={styles.bloco}>
            <Stars nota={agendamento.avaliacao_nota} showValue />
          </Card>
        </>
      ) : null}

      <SectionHeader title="Ações" />
      <View style={styles.acoes}>
        {podeChat ? (
          <Button
            label="Abrir chat"
            onPress={() => router.push(`/agendamento/${agendamento.id}/chat`)}
            variant="secondary"
            icon="chatbubble-ellipses-outline"
          />
        ) : null}

        {agendamento.pode_cancelar ? (
          <Button
            label="Cancelar agendamento"
            onPress={() => {
              setMotivo('');
              setAcao('cancelar');
            }}
            variant="outline"
            icon="close-circle-outline"
            disabled={!online}
          />
        ) : null}

        {souProfissional && agendamento.pode_concluir ? (
          <Button
            label="Marcar como concluído"
            onPress={() => setAcao('concluir')}
            variant="success"
            icon="checkmark-done-outline"
            disabled={!online}
          />
        ) : null}

        {!souProfissional && agendamento.pode_avaliar ? (
          <Button
            label="Avaliar atendimento"
            onPress={() => router.push(`/agendamento/${agendamento.id}/avaliar`)}
            icon="star-outline"
          />
        ) : null}

        {!souProfissional && agendamento.status === 'concluido' && agendamento.avaliacao_nota ? (
          <Notice tone="success" message="Obrigado! Sua avaliação já foi registrada." />
        ) : null}
      </View>

      <Dialog
        visible={acao !== null}
        onClose={() => (processando ? undefined : setAcao(null))}
        title={dialogTitulo}
        message={dialogMensagem}
        dismissible={!processando}
        actions={[
          {
            label: 'Voltar',
            onPress: () => setAcao(null),
            variant: 'ghost',
            disabled: processando,
          },
          {
            label:
              acao === 'aceitar'
                ? 'Aceitar'
                : acao === 'recusar'
                  ? 'Recusar'
                  : acao === 'cancelar'
                    ? 'Cancelar agendamento'
                    : 'Concluir',
            onPress: () => void executarAcao(),
            variant: acao === 'aceitar' || acao === 'concluir' ? 'success' : 'danger',
            loading: processando,
            disabled: !online,
          },
        ]}
      >
        {acao === 'recusar' || acao === 'cancelar' ? (
          <TextField
            label="Motivo (opcional)"
            value={motivo}
            onChangeText={setMotivo}
            placeholder={acao === 'cancelar' ? 'Conte o motivo do cancelamento' : 'Explique o motivo ao cliente'}
            multiline
            maxLength={300}
            editable={!processando}
          />
        ) : null}
      </Dialog>

      {perfil?.usuario?.id ? null : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bloco: { marginBottom: spacing.md, gap: spacing.sm },
  cabecalho: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  cabecalhoTexto: { flex: 1, gap: 2, alignItems: 'flex-start' },
  prazo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  enderecoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  enderecoTexto: { flex: 1 },
  acoes: { gap: spacing.sm, marginBottom: spacing.lg },
  footerAcoes: { flexDirection: 'row', gap: spacing.sm },
  footerBotao: { flex: 1 },
});
