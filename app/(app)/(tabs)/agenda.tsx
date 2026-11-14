import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { Chip, ChipRow } from '../../../src/components/Chip';
import { Card } from '../../../src/components/Card';
import { Badge, type BadgeTone } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Dialog } from '../../../src/components/Dialog';
import { TextField } from '../../../src/components/TextField';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { Notice } from '../../../src/components/Notice';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import { criarBloqueAgenda, excluirBloqueAgenda, listarAgenda } from '../../../src/lib/api';
import { addDaysKey, formatDayLong, formatDayShort, formatTime, hojeSP, startOfDaySP } from '../../../src/lib/format';
import { mensagemErro } from '../../../src/lib/errors';
import { useQuery } from '../../../src/hooks/useQuery';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { useNetwork } from '../../../src/providers/NetworkProvider';
import { useSession } from '../../../src/providers/SessionProvider';
import { useToast } from '../../../src/providers/ToastProvider';
import type { AgendaSlot } from '../../../src/lib/types';
import { colors, radius, spacing } from '../../../src/theme';

const DIAS = 14;

const STATUS_SLOT: Record<AgendaSlot['status'], { label: string; tone: BadgeTone }> = {
  disponivel: { label: 'Disponível', tone: 'success' },
  reservado: { label: 'Reservado', tone: 'warning' },
  ocupado: { label: 'Ocupado', tone: 'primary' },
};

const DURACOES = [30, 45, 60, 90, 120];

export default function Agenda() {
  const { perfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();
  const profissionalId = perfil?.profissional?.id ?? null;
  const [dia, setDia] = useState(hojeSP());
  const [novoAberto, setNovoAberto] = useState(false);
  const [hora, setHora] = useState('09:00');
  const [duracao, setDuracao] = useState(60);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<AgendaSlot | null>(null);

  const hoje = hojeSP();
  const dias = useMemo(
    () =>
      Array.from({ length: DIAS }, (_, i) => addDaysKey(hoje, i)).filter(
        (d) => d >= hoje,
      ),
    [hoje],
  );

  // Garante que o dia selecionado nunca seja anterior a hoje
  React.useEffect(() => {
    if (dia < hoje) {
      setDia(hoje);
    }
  }, [dia, hoje]);

  const consulta = useQuery(
    `agenda:${profissionalId ?? 'sem'}:${dia}`,
    () => {
      const inicio = startOfDaySP(dia);
      const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
      return listarAgenda(profissionalId!, inicio.toISOString(), fim.toISOString());
    },
    { cacheKey: `agenda:${dia}`, enabled: Boolean(profissionalId) },
  );

  useFocusRefresh(() => consulta.refresh());

  const slots = (consulta.data ?? []).slice().sort((a, b) => a.inicio.localeCompare(b.inicio));
  const livres = slots.filter((slot) => slot.status === 'disponivel').length;

  function abrirNovo() {
    setHora('09:00');
    setDuracao(60);
    setErro(null);
    setNovoAberto(true);
  }

  function inicioProposto(): Date | null {
    const match = /^(\d{2}):(\d{2})$/.exec(hora.trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    const inicioDia = startOfDaySP(dia);
    return new Date(inicioDia.getTime() + h * 3_600_000 + m * 60_000);
  }

  async function adicionar() {
    setErro(null);
    if (!online) {
      setErro('Conecte-se à internet para alterar sua agenda.');
      return;
    }
    const inicio = inicioProposto();
    if (!inicio) {
      setErro('Informe o horário no formato HH:MM.');
      return;
    }
    if (inicio.getTime() < Date.now()) {
      setErro('Escolha um horário futuro.');
      return;
    }
    const fim = new Date(inicio.getTime() + duracao * 60_000);
    const conflito = slots.some((slot) => {
      const slotInicio = new Date(slot.inicio).getTime();
      const slotFim = new Date(slot.fim).getTime();
      return inicio.getTime() < slotFim && fim.getTime() > slotInicio;
    });
    if (conflito) {
      setErro('Esse horário se sobrepõe a um bloco já existente.');
      return;
    }

    setSalvando(true);
    try {
      await criarBloqueAgenda(profissionalId!, inicio.toISOString(), duracao);
      showToast('Horário adicionado à agenda.');
      setNovoAberto(false);
      await consulta.refresh();
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    if (!online) {
      showToast('Conecte-se à internet para excluir um horário.', 'error');
      return;
    }
    setSalvando(true);
    try {
      await excluirBloqueAgenda(excluindo.id);
      showToast('Horário removido da agenda.');
      setExcluindo(null);
      await consulta.refresh();
    } catch (falha) {
      showToast(mensagemErro(falha), 'error');
    } finally {
      setSalvando(false);
    }
  }

  if (!profissionalId) {
    return (
      <Screen>
        <EmptyState
          icon="cut-outline"
          title="Complete seu perfil profissional"
          message="Cadastre seus dados e serviços para começar a receber agendamentos."
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      refreshing={consulta.refreshing}
      onRefresh={() => void consulta.refresh()}
      footer={
        <Button
          label="Adicionar horário"
          onPress={abrirNovo}
          icon="add-circle-outline"
          size="lg"
          disabled={!online}
        />
      }
    >
      <AppText variant="display">Minha agenda</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Cadastre os horários em que você pode atender. Cada solicitação aceita bloqueia o horário automaticamente.
      </AppText>

      {!online ? (
        <Notice
          tone="info"
          message="Sem conexão. Você pode consultar a agenda salva, mas alterações exigem internet."
        />
      ) : null}

      {consulta.stale ? <StaleNotice /> : null}

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

      <View style={styles.resumo}>
        <AppText variant="bodyStrong">{formatDayLong(dia)}</AppText>
        <AppText variant="caption">
          {slots.length === 0
            ? 'Nenhum bloco cadastrado'
            : `${slots.length} bloco(s) · ${livres} disponível(is)`}
        </AppText>
      </View>

      {consulta.loading && !consulta.data ? (
        <Loading mensagem="Carregando sua agenda..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : slots.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Dia livre"
          message="Adicione blocos de horário para que os clientes possam solicitar atendimento neste dia."
          actionLabel={online ? 'Adicionar horário' : undefined}
          onAction={abrirNovo}
        />
      ) : (
        <>
          <SectionHeader title="Horários do dia" subtitle="Toque em um horário disponível para removê-lo" />
          {slots.map((slot) => {
            const status = STATUS_SLOT[slot.status];
            return (
              <Card key={slot.id} style={styles.slot} padded={false}>
                <View style={styles.slotConteudo}>
                  <View style={styles.slotHora}>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <AppText variant="subtitle">
                      {formatTime(slot.inicio)} – {formatTime(slot.fim)}
                    </AppText>
                  </View>
                  <Badge label={status.label} tone={status.tone} />
                </View>
                {slot.status === 'disponivel' ? (
                  <Button
                    label="Remover horário"
                    onPress={() => setExcluindo(slot)}
                    variant="ghost"
                    icon="trash-outline"
                    fullWidth={false}
                    disabled={!online}
                  />
                ) : (
                  <AppText variant="caption" style={styles.slotAviso}>
                    {slot.status === 'reservado'
                      ? 'Reservado por uma solicitação aguardando resposta.'
                      : 'Horário ocupado por um atendimento confirmado.'}
                  </AppText>
                )}
              </Card>
            );
          })}
        </>
      )}

      <Dialog
        visible={novoAberto}
        onClose={() => setNovoAberto(false)}
        title="Adicionar horário"
        message={`Escolha o início e a duração do bloco em ${formatDayLong(dia)}.`}
        dismissible={!salvando}
        actions={[
          {
            label: 'Cancelar',
            onPress: () => setNovoAberto(false),
            variant: 'ghost',
            disabled: salvando,
          },
          {
            label: 'Adicionar',
            onPress: () => void adicionar(),
            loading: salvando,
            disabled: !online,
          },
        ]}
      >
        {erro ? <Notice tone="danger" message={erro} /> : null}
        <TextField
          label="Horário de início"
          required
          value={hora}
          onChangeText={setHora}
          placeholder="09:00"
          keyboardType="numbers-and-punctuation"
          leftIcon="time-outline"
          editable={!salvando}
          helper="Formato de 24 horas, por exemplo 09:00 ou 18:30."
        />
        <AppText variant="label" style={styles.labelDuracao}>
          Duração
        </AppText>
        <View style={styles.duracoes}>
          {DURACOES.map((minutos) => (
            <Chip
              key={minutos}
              label={`${minutos} min`}
              selected={duracao === minutos}
              onPress={() => setDuracao(minutos)}
            />
          ))}
        </View>
        {duracao === 120 ? (
          <AppText variant="caption">Dica: blocos maiores atendem serviços mais longos.</AppText>
        ) : null}
      </Dialog>

      <Dialog
        visible={Boolean(excluindo)}
        onClose={() => setExcluindo(null)}
        title="Remover horário?"
        message={
          excluindo
            ? `O bloco das ${formatTime(excluindo.inicio)} às ${formatTime(excluindo.fim)} será excluído da sua agenda.`
            : undefined
        }
        dismissible={!salvando}
        actions={[
          {
            label: 'Manter',
            onPress: () => setExcluindo(null),
            variant: 'ghost',
            disabled: salvando,
          },
          {
            label: 'Remover',
            onPress: () => void excluir(),
            variant: 'danger',
            loading: salvando,
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitulo: { marginTop: spacing.xs, marginBottom: spacing.lg },
  resumo: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 2,
  },
  slot: { marginBottom: spacing.sm, overflow: 'hidden' },
  slotConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
  },
  slotHora: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  slotAviso: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  labelDuracao: { marginBottom: spacing.xs },
  duracoes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
