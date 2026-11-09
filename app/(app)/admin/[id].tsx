import React, { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { PageHeader } from '../../../src/components/PageHeader';
import { Card } from '../../../src/components/Card';
import { AppText } from '../../../src/components/AppText';
import { Avatar } from '../../../src/components/Avatar';
import { Badge, STATUS_VERIFICACAO_LABEL, STATUS_VERIFICACAO_TONE } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Dialog } from '../../../src/components/Dialog';
import { TextField } from '../../../src/components/TextField';
import { Notice } from '../../../src/components/Notice';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { InfoRow, Divider } from '../../../src/components/InfoRow';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import {
  aprovarProfissional,
  detalharProfissionalAdmin,
  listarFaixas,
  listarPortfolio,
  listarServicos,
  urlAssinadaDocumento,
} from '../../../src/lib/api';
import { formatBRL, formatDate, formatDistance } from '../../../src/lib/format';
import { mensagemErro } from '../../../src/lib/errors';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { useQuery } from '../../../src/hooks/useQuery';
import { useNetwork } from '../../../src/providers/NetworkProvider';
import { useToast } from '../../../src/providers/ToastProvider';
import { colors, radius, spacing } from '../../../src/theme';

export default function AdminProfissional() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profissionalId = String(id ?? '');
  const { online } = useNetwork();
  const { showToast } = useToast();
  const [acao, setAcao] = useState<'aprovar' | 'reprovar' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [processando, setProcessando] = useState(false);

  const profissional = useQuery(
    `admin-profissional:${profissionalId}`,
    () => detalharProfissionalAdmin(profissionalId),
    { cacheKey: `admin-profissional:${profissionalId}`, enabled: Boolean(profissionalId) },
  );
  const servicos = useQuery(
    `admin-servicos:${profissionalId}`,
    () => listarServicos(profissionalId),
    { cacheKey: `admin-servicos:${profissionalId}`, enabled: Boolean(profissionalId) },
  );
  const faixas = useQuery(
    `admin-faixas:${profissionalId}`,
    () => listarFaixas(profissionalId),
    { cacheKey: `admin-faixas:${profissionalId}`, enabled: Boolean(profissionalId) },
  );
  const portfolio = useQuery(
    `admin-portfolio:${profissionalId}`,
    () => listarPortfolio(profissionalId),
    { cacheKey: `admin-portfolio:${profissionalId}`, enabled: Boolean(profissionalId) },
  );

  useFocusRefresh(() => {
    void profissional.refresh();
    void servicos.refresh();
    void faixas.refresh();
    void portfolio.refresh();
  });

  const p = profissional.data;

  async function abrirDocumento() {
    if (!p?.documento_chave) {
      showToast('Nenhum documento enviado.', 'error');
      return;
    }
    const url = await urlAssinadaDocumento(p.documento_chave);
    if (!url) {
      showToast('Não foi possível abrir o documento.', 'error');
      return;
    }
    await Linking.openURL(url);
  }

  async function decidir() {
    if (!p || !acao) return;
    if (!online) {
      showToast('Conecte-se à internet para concluir a análise.', 'error');
      return;
    }
    if (acao === 'reprovar' && motivo.trim().length < 3) {
      showToast('Informe o motivo da reprovação.', 'error');
      return;
    }
    setProcessando(true);
    try {
      await aprovarProfissional(p.id, acao === 'aprovar', motivo.trim() || undefined);
      showToast(acao === 'aprovar' ? 'Profissional aprovado.' : 'Profissional reprovado.');
      setAcao(null);
      setMotivo('');
      await profissional.refresh();
      router.back();
    } catch (e) {
      showToast(mensagemErro(e), 'error');
    } finally {
      setProcessando(false);
    }
  }

  if (profissional.loading && !p) {
    return (
      <Screen scroll={false}>
        <Loading mensagem="Carregando cadastro..." />
      </Screen>
    );
  }

  if (profissional.error) {
    return (
      <Screen>
        <PageHeader title="Revisar cadastro" />
        <ErrorState mensagem={profissional.error} onRetry={() => void profissional.refresh()} />
      </Screen>
    );
  }

  if (!p) {
    return (
      <Screen>
        <PageHeader title="Revisar cadastro" />
        <EmptyState icon="person-outline" title="Profissional não encontrado" message="O cadastro pode ter sido removido." actionLabel="Voltar" onAction={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Revisar cadastro" subtitle={p.nome} />

      {!online ? <Notice tone="info" message="Aprovar ou reprovar exige conexão com a internet." /> : null}

      <Card style={styles.bloco}>
        <View style={styles.topo}>
          <Avatar nome={p.nome} uri={p.foto_url} size={72} />
          <View style={styles.topoTexto}>
            <AppText variant="subtitle">{p.nome}</AppText>
            <AppText variant="caption">{p.telefone ?? 'Sem telefone'}</AppText>
            <Badge label={STATUS_VERIFICACAO_LABEL[p.status_verificacao]} tone={STATUS_VERIFICACAO_TONE[p.status_verificacao]} />
          </View>
        </View>
        <InfoRow label="CPF" value={p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')} />
        <InfoRow label="Cadastro" value={formatDate(p.criado_em)} />
        <InfoRow label="Referência" value={`${p.endereco_ref_bairro}, ${p.endereco_ref_cidade}`} />
        <InfoRow label="Distância máxima" value={formatDistance(p.distancia_maxima_km)} />
        <InfoRow label="Prazo de resposta" value={`${p.prazo_resposta_h}h`} />
        {p.descricao ? <InfoRow label="Descrição" value={p.descricao} /> : null}
      </Card>

      <SectionHeader title="Documento" subtitle="Verificação enviada pelo profissional" />
      <Card style={styles.bloco}>
        {p.documento_chave ? (
          <Button label="Abrir documento enviado" onPress={() => void abrirDocumento()} variant="secondary" icon="document-text-outline" />
        ) : (
          <Notice tone="warning" message="Nenhum documento foi enviado." />
        )}
      </Card>

      <SectionHeader title="Serviços" />
      <Card style={styles.bloco}>
        {(servicos.data ?? []).length === 0 ? (
          <AppText variant="caption">Nenhum serviço cadastrado.</AppText>
        ) : (
          (servicos.data ?? []).map((s) => (
            <View key={s.id} style={styles.itemLinha}>
              <AppText variant="body" style={styles.itemTexto}>{s.tipo}</AppText>
              <AppText variant="bodyStrong">{formatBRL(s.preco_centavos)} · {s.duracao_min} min</AppText>
            </View>
          ))
        )}
      </Card>

      <SectionHeader title="Faixas de deslocamento" />
      <Card style={styles.bloco}>
        {(faixas.data ?? []).length === 0 ? (
          <Notice tone="warning" message="Nenhuma faixa cadastrada. A aprovação sem faixas impede a publicação na busca." />
        ) : (
          (faixas.data ?? []).map((f) => (
            <InfoRow key={f.id} label={`Até ${Number(f.limite_km).toFixed(1).replace('.', ',')} km`} value={formatBRL(f.valor_centavos)} />
          ))
        )}
      </Card>

      <SectionHeader title="Portfólio" />
      {(portfolio.data ?? []).length === 0 ? (
        <Card style={styles.bloco}><AppText variant="caption">Nenhuma foto no portfólio.</AppText></Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolio}>
          {(portfolio.data ?? []).map((foto) => (
            <Image key={foto.id} source={{ uri: foto.url }} style={styles.foto} accessibilityLabel="Foto do portfólio" />
          ))}
        </ScrollView>
      )}

      {p.status_verificacao === 'pendente' ? (
        <View style={styles.acoes}>
          <Button label="Reprovar" onPress={() => { setMotivo(''); setAcao('reprovar'); }} variant="danger" icon="close-circle-outline" disabled={!online} />
          <Button label="Aprovar" onPress={() => { setMotivo(''); setAcao('aprovar'); }} variant="success" icon="checkmark-circle-outline" disabled={!online} />
        </View>
      ) : (
        <Notice tone="info" message="Este cadastro já foi analisado. Uma nova alteração pelo profissional pode exigir nova análise conforme as regras do sistema." />
      )}

      <Dialog
        visible={acao !== null}
        onClose={() => (processando ? undefined : setAcao(null))}
        title={acao === 'aprovar' ? 'Aprovar profissional?' : 'Reprovar profissional?'}
        message={acao === 'aprovar' ? 'O profissional poderá aparecer na busca e receber solicitações.' : 'Informe o motivo para orientar o profissional.'}
        dismissible={!processando}
        actions={[
          { label: 'Voltar', onPress: () => setAcao(null), variant: 'ghost', disabled: processando },
          { label: acao === 'aprovar' ? 'Aprovar' : 'Reprovar', onPress: () => void decidir(), variant: acao === 'aprovar' ? 'success' : 'danger', loading: processando, disabled: !online },
        ]}
      >
        {acao === 'reprovar' ? (
          <TextField label="Motivo da reprovação" required value={motivo} onChangeText={setMotivo} placeholder="Descreva o que precisa ser corrigido" multiline maxLength={400} editable={!processando} />
        ) : null}
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bloco: { gap: spacing.sm, marginBottom: spacing.md },
  topo: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  topoTexto: { flex: 1, gap: 4, alignItems: 'flex-start' },
  itemLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 2 },
  itemTexto: { flex: 1 },
  portfolio: { gap: spacing.sm, paddingBottom: spacing.md },
  foto: { width: 140, height: 140, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  acoes: { gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xl },
});
