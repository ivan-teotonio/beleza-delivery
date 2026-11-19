import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { Card } from '../../../src/components/Card';
import { Badge } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Dialog } from '../../../src/components/Dialog';
import { TextField } from '../../../src/components/TextField';
import { Chip } from '../../../src/components/Chip';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { Notice } from '../../../src/components/Notice';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import { PageHeader } from '../../../src/components/PageHeader';
import { TooltipHint } from '../../../src/components/TooltipHint';
import {
  atualizarServico,
  criarServico,
  excluirServico,
  listarServicos,
} from '../../../src/lib/api';
import { centsToInput, formatBRL, parseMoneyToCents } from '../../../src/lib/format';
import { mensagemErro } from '../../../src/lib/errors';
import { useQuery } from '../../../src/hooks/useQuery';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { useNetwork } from '../../../src/providers/NetworkProvider';
import { useSession } from '../../../src/providers/SessionProvider';
import { useToast } from '../../../src/providers/ToastProvider';
import type { Servico } from '../../../src/lib/types';
import { colors, radius, spacing } from '../../../src/theme';

const SUGESTOES = [
  'Manicure',
  'Pedicure',
  'Corte de cabelo',
  'Escova',
  'Coloração',
  'Maquiagem',
  'Design de sobrancelhas',
  'Depilação',
  'Massagem',
];

const DURACOES = [30, 45, 60, 90, 120];

export default function Servicos() {
  const { perfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();
  const profissionalId = perfil?.profissional?.id ?? null;
  const [editorAberto, setEditorAberto] = useState(false);
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null);
  const [tipo, setTipo] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('60');
  const [ativo, setAtivo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<Servico | null>(null);
  const [precoAjudaVisto, setPrecoAjudaVisto] = useState(false);

  const consulta = useQuery(
    `servicos:${profissionalId ?? 'sem'}`,
    () => listarServicos(profissionalId!),
    { cacheKey: 'meus-servicos', enabled: Boolean(profissionalId) },
  );

  useFocusRefresh(() => consulta.refresh());

  const servicos = useMemo(() => consulta.data ?? [], [consulta.data]);
  const ativos = servicos.filter((servico) => servico.ativo).length;

  function abrirNovo() {
    setServicoEditando(null);
    setTipo('');
    setPreco('');
    setDuracao('60');
    setAtivo(true);
    setErro(null);
    setEditorAberto(true);
  }

  function abrirEdicao(servico: Servico) {
    setServicoEditando(servico);
    setTipo(servico.tipo);
    setPreco(centsToInput(servico.preco_centavos));
    setDuracao(String(servico.duracao_min));
    setAtivo(servico.ativo);
    setErro(null);
    setEditorAberto(true);
  }

  async function salvar() {
    setErro(null);
    if (!online) {
      setErro('Conecte-se à internet para salvar seus serviços.');
      return;
    }
    if (tipo.trim().length < 2) {
      setErro('Informe o nome do serviço.');
      return;
    }
    const precoCentavos = parseMoneyToCents(preco);
    if (precoCentavos <= 0) {
      setErro('Informe um preço maior que zero.');
      return;
    }
    const duracaoMin = Number.parseInt(duracao, 10);
    if (!Number.isFinite(duracaoMin) || duracaoMin < 15 || duracaoMin > 480) {
      setErro('A duração deve estar entre 15 e 480 minutos.');
      return;
    }

    setSalvando(true);
    try {
      const entrada = {
        tipo: tipo.trim(),
        preco_centavos: precoCentavos,
        duracao_min: duracaoMin,
        ativo,
      };
      if (servicoEditando) {
        await atualizarServico(servicoEditando.id, entrada);
        showToast('Serviço atualizado.');
      } else {
        await criarServico(profissionalId!, entrada);
        showToast('Serviço cadastrado.');
      }
      setEditorAberto(false);
      await consulta.refresh();
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(servico: Servico) {
    if (!online) {
      showToast('Conecte-se à internet para alterar o serviço.', 'error');
      return;
    }
    try {
      await atualizarServico(servico.id, {
        tipo: servico.tipo,
        preco_centavos: servico.preco_centavos,
        duracao_min: servico.duracao_min,
        ativo: !servico.ativo,
      });
      showToast(servico.ativo ? 'Serviço pausado na busca.' : 'Serviço reativado na busca.');
      await consulta.refresh();
    } catch (falha) {
      showToast(mensagemErro(falha), 'error');
    }
  }

  async function excluir() {
    if (!excluindo) return;
    if (!online) {
      showToast('Conecte-se à internet para excluir o serviço.', 'error');
      return;
    }
    setSalvando(true);
    try {
      const servicoParaRestaurar = excluindo;
      await excluirServico(excluindo.id);
      showToast(
        'Serviço excluído.',
        'success',
        {
          label: 'Desfazer',
          onPress: async () => {
            try {
              await criarServico(profissionalId!, {
                tipo: servicoParaRestaurar.tipo,
                preco_centavos: servicoParaRestaurar.preco_centavos,
                duracao_min: servicoParaRestaurar.duracao_min,
                ativo: servicoParaRestaurar.ativo,
              });
              showToast('Serviço restaurado.');
            } catch (erroRestore) {
              showToast(mensagemErro(erroRestore), 'error');
            }
            await consulta.refresh();
          },
        }
      );
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
          message="Cadastre seus dados para publicar seus serviços."
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button label="Novo serviço" onPress={abrirNovo} icon="add-circle-outline" size="lg" disabled={!online} />
      }
      refreshing={consulta.refreshing}
      onRefresh={() => void consulta.refresh()}
    >
      <PageHeader title="Meus serviços" back={false} subtitle="Preços e duração usados nos agendamentos" />

      {!online ? (
        <Notice
          tone="info"
          message="Sem conexão. Você pode consultar os serviços salvos, mas alterações exigem internet."
        />
      ) : null}

      {consulta.stale ? <StaleNotice /> : null}

      <View style={styles.resumo}>
        <Ionicons name="pricetags-outline" size={22} color={colors.primary} />
        <View style={styles.resumoTexto}>
          <AppText variant="bodyStrong">
            {servicos.length} serviço(s) cadastrado(s)
          </AppText>
          <AppText variant="caption">{ativos} ativo(s) na busca e nos agendamentos</AppText>
        </View>
      </View>

      {consulta.loading && !consulta.data ? (
        <Loading mensagem="Carregando seus serviços..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : servicos.length === 0 ? (
        <EmptyState
          icon="cut-outline"
          title="Cadastre seu primeiro serviço"
          message="Informe o tipo de serviço, o preço e a duração para aparecer na busca e receber solicitações."
          actionLabel={online ? 'Novo serviço' : undefined}
          onAction={abrirNovo}
        />
      ) : (
        servicos.map((servico) => (
          <Card key={servico.id} style={styles.card}>
            <View style={styles.cabecalho}>
              <View style={styles.info}>
                <AppText variant="subtitle" numberOfLines={2}>
                  {servico.tipo}
                </AppText>
                <AppText variant="caption">
                  {servico.duracao_min} min · {formatBRL(servico.preco_centavos)}
                </AppText>
              </View>
              <Badge
                label={servico.ativo ? 'Ativo' : 'Pausado'}
                tone={servico.ativo ? 'success' : 'neutral'}
              />
            </View>

            <View style={styles.acoes}>
              <Button
                label="Editar"
                onPress={() => abrirEdicao(servico)}
                variant="outline"
                icon="create-outline"
                fullWidth={false}
                style={styles.acao}
                disabled={!online}
              />
              <Button
                label={servico.ativo ? 'Pausar' : 'Reativar'}
                onPress={() => void alternarAtivo(servico)}
                variant="secondary"
                icon={servico.ativo ? 'pause-outline' : 'play-outline'}
                fullWidth={false}
                style={styles.acao}
                disabled={!online}
              />
              <Button
                label="Excluir"
                onPress={() => setExcluindo(servico)}
                variant="ghost"
                icon="trash-outline"
                fullWidth={false}
                style={styles.acao}
                disabled={!online}
              />
            </View>
          </Card>
        ))
      )}

      <Dialog
        visible={editorAberto}
        onClose={() => setEditorAberto(false)}
        title={servicoEditando ? 'Editar serviço' : 'Novo serviço'}
        message="Esses dados aparecem no seu perfil público e definem a duração reservada na agenda."
        dismissible={!salvando}
        actions={[
          {
            label: 'Cancelar',
            onPress: () => setEditorAberto(false),
            variant: 'ghost',
            disabled: salvando,
          },
          {
            label: servicoEditando ? 'Salvar' : 'Cadastrar',
            onPress: () => void salvar(),
            loading: salvando,
            disabled: !online,
          },
        ]}
      >
        {erro ? <Notice tone="danger" message={erro} /> : null}
        <TextField
          label="Serviço"
          required
          value={tipo}
          onChangeText={setTipo}
          placeholder="Ex.: Manicure"
          leftIcon="cut-outline"
          editable={!salvando}
          maxLength={60}
        />
        <View style={styles.sugestoes}>
          {SUGESTOES.filter((sugestao) => sugestao.toLowerCase() !== tipo.trim().toLowerCase())
            .slice(0, 5)
            .map((sugestao) => (
              <Chip key={sugestao} label={sugestao} onPress={() => setTipo(sugestao)} />
            ))}
        </View>
        <View style={styles.tooltipPreco}>
          <TooltipHint
            title="Como o preço é composto"
            message="O cliente paga o preço do serviço mais o valor do deslocamento, definido por você em faixas de distância (ex.: até 5 km = R$ 5,00; até 10 km = R$ 8,00). O total é calculado pelo servidor e mostrado antes de confirmar o agendamento."
            dismissed={precoAjudaVisto}
            onDismiss={() => setPrecoAjudaVisto(true)}
          />
        </View>
        <TextField
          label="Preço"
          required
          value={preco}
          onChangeText={setPreco}
          placeholder="45,00"
          keyboardType="decimal-pad"
          leftIcon="cash-outline"
          suffix="R$"
          editable={!salvando}
          helper="Use vírgula para centavos, por exemplo 45,00."
        />
        <TextField
          label="Duração em minutos"
          required
          value={duracao}
          onChangeText={setDuracao}
          placeholder="60"
          keyboardType="number-pad"
          leftIcon="time-outline"
          suffix="min"
          editable={!salvando}
        />
        <View style={styles.duracoes}>
          {DURACOES.map((minutos) => (
            <Chip
              key={minutos}
              label={`${minutos} min`}
              selected={Number(duracao) === minutos}
              onPress={() => setDuracao(String(minutos))}
            />
          ))}
        </View>
        <Button
          label={ativo ? 'Serviço ativo na busca' : 'Serviço pausado'}
          onPress={() => setAtivo((valor) => !valor)}
          variant={ativo ? 'success' : 'secondary'}
          icon={ativo ? 'checkmark-circle-outline' : 'pause-circle-outline'}
          disabled={salvando}
        />
        <AppText variant="caption">
          Serviços pausados não aparecem na busca e não podem receber novas solicitações.
        </AppText>
      </Dialog>

      <Dialog
        visible={Boolean(excluindo)}
        onClose={() => setExcluindo(null)}
        title="Excluir serviço?"
        message={
          excluindo
            ? `"${excluindo.tipo}" será removido. Agendamentos antigos continuam no histórico.`
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
            label: 'Excluir',
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
  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  resumoTexto: { flex: 1 },
  card: { marginBottom: spacing.md },
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  info: { flex: 1, gap: 2 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  acao: { flexGrow: 1, flexBasis: 100 },
  sugestoes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  duracoes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tooltipPreco: { marginBottom: spacing.xs, alignSelf: 'flex-start' },
});
