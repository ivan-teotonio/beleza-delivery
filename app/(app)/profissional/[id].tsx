import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { PageHeader } from '../../../src/components/PageHeader';
import { Avatar } from '../../../src/components/Avatar';
import { Badge } from '../../../src/components/Badge';
import { Stars } from '../../../src/components/Stars';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { Chip, ChipRow } from '../../../src/components/Chip';
import { Notice } from '../../../src/components/Notice';
import { Dialog } from '../../../src/components/Dialog';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { InfoRow, Divider } from '../../../src/components/InfoRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import {
  listarAgenda,
  obterProfissionalPublico,
  previaAgendamento,
  solicitarAgendamento,
} from '../../../src/lib/api';
import {
  addDaysKey,
  formatBRL,
  formatDate,
  formatDayShort,
  formatDistance,
  formatTime,
  hojeSP,
  startOfDaySP,
} from '../../../src/lib/format';
import { mensagemErro } from '../../../src/lib/errors';
import { novaChaveIdempotencia } from '../../../src/lib/idempotency';
import { useQuery } from '../../../src/hooks/useQuery';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { useNetwork } from '../../../src/providers/NetworkProvider';
import { useSession } from '../../../src/providers/SessionProvider';
import { useToast } from '../../../src/providers/ToastProvider';
import type { AgendaSlot, PreviaAgendamento } from '../../../src/lib/types';
import { colors, radius, spacing } from '../../../src/theme';

const DIAS = 14;

export default function ProfissionalDetalhe() {
  const params = useLocalSearchParams<{ id?: string; distancia?: string }>();
  const id = String(params.id ?? '');
  const distanciaParam = params.distancia ? Number(params.distancia) : null;
  const { perfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();

  const [servicoId, setServicoId] = useState<string | null>(null);
  const [dia, setDia] = useState(hojeSP());
  const [slot, setSlot] = useState<AgendaSlot | null>(null);
  const [previa, setPrevia] = useState<PreviaAgendamento | null>(null);
  const [previaLoading, setPreviaLoading] = useState(false);
  const [previaErro, setPreviaErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [chaveIdem, setChaveIdem] = useState<string | null>(null);

  const perfilPublico = useQuery(`profissional:${id}`, () => obterProfissionalPublico(id), {
    cacheKey: `profissional:${id}`,
    enabled: Boolean(id),
  });

  const dias = useMemo(() => Array.from({ length: DIAS }, (_, i) => addDaysKey(hojeSP(), i)), []);

  const agenda = useQuery(
    `agenda-cliente:${id}:${dia}`,
    () => {
      const inicio = startOfDaySP(dia);
      const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
      return listarAgenda(id, inicio.toISOString(), fim.toISOString(), true);
    },
    { cacheKey: `agenda-cliente:${id}:${dia}`, enabled: Boolean(id) },
  );

  const profissional = perfilPublico.data;
  const servico = profissional?.servicos.find((item) => item.id === servicoId) ?? null;

  useEffect(() => {
    if (profissional && !servicoId && profissional.servicos.length > 0) {
      setServicoId(profissional.servicos[0].id);
    }
  }, [profissional, servicoId]);

  useEffect(() => {
    setSlot(null);
  }, [dia, servicoId]);

  useEffect(() => {
    if (!servicoId || !id) {
      setPrevia(null);
      return;
    }
    let ativo = true;
    setPreviaLoading(true);
    setPreviaErro(null);
    previaAgendamento(id, servicoId)
      .then((resultado) => {
        if (ativo) setPrevia(resultado);
      })
      .catch((erro) => {
        if (ativo) {
          setPrevia(null);
          setPreviaErro(mensagemErro(erro));
        }
      })
      .finally(() => {
        if (ativo) setPreviaLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [id, servicoId, perfil?.endereco?.id]);

  useFocusRefresh(() => {
    void perfilPublico.refresh();
    void agenda.refresh();
  });

  const slots = useMemo(() => {
    const agora = Date.now();
    return (agenda.data ?? []).filter((item) => {
      const inicio = new Date(item.inicio).getTime();
      if (inicio <= agora) return false;
      if (!servico) return true;
      const duracaoBloco = (new Date(item.fim).getTime() - inicio) / 60_000;
      return duracaoBloco >= servico.duracao_min;
    });
  }, [agenda.data, servico]);

  const podeSolicitar = Boolean(servico && slot && previa?.disponivel && online && !enviando);
  const semEndereco = !perfil?.endereco;

  function abrirConfirmacao() {
    if (!slot) return;
    if (!online) {
      showToast('Conecte-se à internet para solicitar o agendamento.', 'error');
      return;
    }
    setChaveIdem(novaChaveIdempotencia());
    setConfirmar(true);
  }

  async function solicitar() {
    if (!servico || !slot || !perfil?.endereco) return;
    const chave = chaveIdem ?? novaChaveIdempotencia();
    setChaveIdem(chave);
    setEnviando(true);
    try {
      const agendamento = await solicitarAgendamento({
        profissionalId: id,
        servicoId: servico.id,
        enderecoId: perfil.endereco.id,
        inicio: slot.inicio,
        chaveIdempotencia: chave,
      });
      setConfirmar(false);
      showToast('Solicitação enviada! Aguarde a resposta do profissional.');
      router.replace(`/agendamento/${agendamento.id}`);
    } catch (erro) {
      showToast(mensagemErro(erro), 'error');
    } finally {
      setEnviando(false);
    }
  }

  if (perfilPublico.loading && !profissional) {
    return (
      <Screen scroll={false}>
        <Loading mensagem="Carregando perfil..." />
      </Screen>
    );
  }

  if (perfilPublico.error) {
    return (
      <Screen>
        <PageHeader title="Profissional" />
        <ErrorState mensagem={perfilPublico.error} onRetry={() => void perfilPublico.refresh()} />
      </Screen>
    );
  }

  if (!profissional) {
    return (
      <Screen>
        <PageHeader title="Profissional" />
        <EmptyState
          icon="person-outline"
          title="Perfil indisponível"
          message="Este profissional não está disponível para agendamentos no momento."
          actionLabel="Voltar para a busca"
          onAction={() => router.replace('/inicio')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      refreshing={perfilPublico.refreshing}
      onRefresh={() => {
        void perfilPublico.refresh();
        void agenda.refresh();
      }}
      footer={
        <Button
          label={
            semEndereco
              ? 'Cadastre seu endereço para agendar'
              : !previa?.disponivel
                ? 'Indisponível para seu endereço'
                : !slot
                  ? 'Escolha um horário'
                  : 'Solicitar agendamento'
          }
          onPress={semEndereco ? () => router.push('/endereco') : abrirConfirmacao}
          disabled={semEndereco ? false : !podeSolicitar}
          icon={semEndereco ? 'home-outline' : 'calendar-outline'}
          size="lg"
          loading={enviando}
        />
      }
    >
      <PageHeader title={profissional.nome} back />

      {perfilPublico.stale ? <StaleNotice /> : null}

      <View style={styles.hero}>
        <Avatar nome={profissional.nome} uri={profissional.foto_url} size={96} />
        <View style={styles.heroInfo}>
          <View style={styles.avaliacao}>
            <Stars nota={profissional.media_avaliacao} size={18} />
            <AppText variant="caption">
              {Number(profissional.media_avaliacao).toFixed(1)} ({profissional.total_avaliacoes})
            </AppText>
          </View>
          <View style={styles.local}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <AppText variant="caption" style={styles.localTexto}>
              {profissional.bairro}, {profissional.cidade}
              {distanciaParam != null && Number.isFinite(distanciaParam)
                ? ` · ${formatDistance(distanciaParam)} aprox.`
                : ''}
            </AppText>
          </View>
          <Badge label={`Atende até ${formatDistance(profissional.distancia_maxima_km)}`} tone="primary" />
        </View>
      </View>

      {profissional.descricao ? (
        <AppText variant="body" style={styles.descricao}>
          {profissional.descricao}
        </AppText>
      ) : null}

      {profissional.portfolio.length > 0 ? (
        <>
          <SectionHeader title="Portfólio" subtitle="Trabalhos realizados por este profissional" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.portfolio}
          >
            {profissional.portfolio.map((foto) => (
              <Image
                key={foto.id}
                source={{ uri: foto.url }}
                style={styles.foto}
                resizeMode="cover"
                accessibilityLabel={`Foto do portfólio de ${profissional.nome}`}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title="Serviços" subtitle="Escolha o serviço desejado" />
      {profissional.servicos.length === 0 ? (
        <Notice tone="warning" message="Este profissional ainda não publicou serviços ativos." />
      ) : (
        profissional.servicos.map((item) => {
          const selecionado = item.id === servicoId;
          return (
            <Pressable
              key={item.id}
              onPress={() => setServicoId(item.id)}
              accessibilityRole="radio"
              accessibilityLabel={`${item.tipo}, ${formatBRL(item.preco_centavos)}, ${item.duracao_min} minutos`}
              accessibilityState={{ selected: selecionado }}
              style={({ pressed }) => [
                styles.servico,
                selecionado && styles.servicoSelecionado,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons
                name={selecionado ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selecionado ? colors.primary : colors.borderStrong}
              />
              <View style={styles.servicoTexto}>
                <AppText variant="bodyStrong">{item.tipo}</AppText>
                <AppText variant="caption">{item.duracao_min} min</AppText>
              </View>
              <AppText variant="subtitle" color={colors.primaryDark}>
                {formatBRL(item.preco_centavos)}
              </AppText>
            </Pressable>
          );
        })
      )}

      <SectionHeader title="Valores para o seu endereço" subtitle="Calculado pela distância até você" />
      {semEndereco ? (
        <Notice
          tone="warning"
          title="Cadastre seu endereço"
          message="Precisamos do seu endereço para calcular a distância e o valor do deslocamento."
          actionLabel="Cadastrar endereço"
          onAction={() => router.push('/endereco')}
        />
      ) : previaLoading ? (
        <Loading mensagem="Calculando deslocamento..." />
      ) : previaErro ? (
        <Notice tone="danger" message={previaErro} />
      ) : previa && !previa.disponivel ? (
        <Notice
          tone="warning"
          title="Não disponível para este endereço"
          message={previa.motivo ?? 'Profissional não atende tão longe.'}
        />
      ) : previa?.disponivel ? (
        <Card style={styles.valores}>
          <InfoRow
            label="Distância aproximada"
            value={formatDistance(previa.distancia_km)}
          />
          <InfoRow
            label={`Faixa até ${Number(previa.faixa_limite_km).toFixed(1).replace('.', ',')} km`}
            value={formatBRL(previa.valor_deslocamento_centavos)}
          />
          <InfoRow label="Serviço" value={formatBRL(previa.preco_servico_centavos)} />
          <Divider />
          <InfoRow label="Total" value={formatBRL(previa.total_centavos)} strong />
        </Card>
      ) : null}

      <SectionHeader title="Horários disponíveis" subtitle="Próximos 14 dias" />
      <ChipRow>
        {dias.map((chave) => (
          <Chip
            key={chave}
            label={chave === hojeSP() ? `Hoje · ${formatDayShort(chave).split(', ')[1]}` : formatDayShort(chave)}
            selected={dia === chave}
            onPress={() => setDia(chave)}
          />
        ))}
      </ChipRow>

      {agenda.loading && !agenda.data ? (
        <Loading mensagem="Carregando horários..." />
      ) : agenda.error ? (
        <ErrorState mensagem={agenda.error} onRetry={() => void agenda.refresh()} />
      ) : slots.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Sem horários neste dia"
          message="Escolha outra data ou entre em contato pelo chat depois de solicitar."
        />
      ) : (
        <View style={styles.slots}>
          {slots.map((item) => {
            const selecionado = slot?.id === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setSlot(selecionado ? null : item)}
                accessibilityRole="radio"
                accessibilityLabel={`Horário ${formatTime(item.inicio)} às ${formatTime(item.fim)}`}
                accessibilityState={{ selected: selecionado }}
                style={({ pressed }) => [
                  styles.slot,
                  selecionado && styles.slotSelecionado,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <AppText variant="label" color={selecionado ? colors.textOnPrimary : colors.text}>
                  {formatTime(item.inicio)}
                </AppText>
                <AppText variant="caption" color={selecionado ? colors.textOnPrimary : colors.textMuted}>
                  até {formatTime(item.fim)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      {profissional.avaliacoes.length > 0 ? (
        <>
          <SectionHeader
            title="Avaliações"
            subtitle={`${profissional.total_avaliacoes} avaliação(ões) de clientes`}
          />
          {profissional.avaliacoes.slice(0, 6).map((avaliacao, indice) => (
            <Card key={`${avaliacao.criado_em}-${indice}`} style={styles.avaliacaoCard}>
              <View style={styles.avaliacaoTopo}>
                <Stars nota={avaliacao.nota} size={16} />
                <AppText variant="caption">{formatDate(avaliacao.criado_em)}</AppText>
              </View>
              {avaliacao.comentario ? (
                <AppText variant="body" style={styles.comentario}>
                  “{avaliacao.comentario}”
                </AppText>
              ) : null}
              <AppText variant="caption">— {avaliacao.cliente_nome}</AppText>
            </Card>
          ))}
        </>
      ) : null}

      <Dialog
        visible={confirmar}
        onClose={() => setConfirmar(false)}
        title="Confirmar solicitação"
        dismissible={!enviando}
        actions={[
          {
            label: 'Voltar',
            onPress: () => setConfirmar(false),
            variant: 'ghost',
            disabled: enviando,
          },
          {
            label: 'Enviar solicitação',
            onPress: () => void solicitar(),
            loading: enviando,
          },
        ]}
      >
        {servico && slot && previa ? (
          <View style={styles.confirmacao}>
            <InfoRow label="Profissional" value={profissional.nome} />
            <InfoRow label="Serviço" value={servico.tipo} />
            <InfoRow label="Data" value={formatDate(slot.inicio)} />
            <InfoRow label="Horário" value={formatTime(slot.inicio)} />
            <InfoRow label="Endereço" value={`${perfil?.endereco?.rua}, ${perfil?.endereco?.numero}`} />
            <Divider />
            <InfoRow label="Serviço" value={formatBRL(previa.preco_servico_centavos)} />
            <InfoRow
              label="Deslocamento"
              value={`${formatBRL(previa.valor_deslocamento_centavos)} · até ${Number(previa.faixa_limite_km).toFixed(1).replace('.', ',')} km`}
            />
            <InfoRow label="Total" value={formatBRL(previa.total_centavos)} strong />
            <AppText variant="caption" style={styles.avisoConfirmacao}>
              Os valores ficam congelados nesta solicitação. O profissional tem até{' '}
              {profissional.prazo_resposta_h}h para responder.
            </AppText>
          </View>
        ) : null}
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  heroInfo: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  avaliacao: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  local: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  localTexto: { flexShrink: 1 },
  descricao: { marginTop: spacing.md },
  portfolio: { gap: spacing.sm, paddingBottom: spacing.sm },
  foto: { width: 148, height: 148, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  servico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 64,
  },
  servicoSelecionado: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  servicoTexto: { flex: 1, gap: 1 },
  valores: { gap: 2 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    minWidth: 96,
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  slotSelecionado: { backgroundColor: colors.primary, borderColor: colors.primary },
  avaliacaoCard: { marginBottom: spacing.sm, gap: spacing.xs },
  avaliacaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  comentario: { fontStyle: 'italic' },
  confirmacao: { gap: 2 },
  avisoConfirmacao: { marginTop: spacing.sm },
});
