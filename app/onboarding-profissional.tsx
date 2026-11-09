import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { PageHeader } from '../src/components/PageHeader';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';
import { Notice } from '../src/components/Notice';
import { Card } from '../src/components/Card';
import { AppText } from '../src/components/AppText';
import { SectionHeader } from '../src/components/SectionHeader';
import { InfoRow } from '../src/components/InfoRow';
import { criarPerfilProfissional } from '../src/lib/api';
import { localizacaoAtual } from '../src/lib/geocode';
import { centsToInput, formatBRL, formatCpf, formatPhone, onlyDigits, parseMoneyToCents } from '../src/lib/format';
import { selecionarFaixa, validarFaixas, type FaixaDeslocamento } from '../src/lib/pricing';
import { mensagemErro } from '../src/lib/errors';
import { useNetwork } from '../src/providers/NetworkProvider';
import { useSession } from '../src/providers/SessionProvider';
import { useToast } from '../src/providers/ToastProvider';
import { spacing } from '../src/theme';

interface FaixaForm {
  limite: string;
  valor: string;
}

export default function OnboardingProfissional() {
  const { session, perfil, tipo, recarregarPerfil, precisaOnboarding, loading } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();

  const [nome, setNome] = useState(perfil?.usuario?.email?.split('@')[0]?.replace(/[._-]+/g, ' ') ?? '');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [distanciaMaxima, setDistanciaMaxima] = useState('10');
  const [faixasForm, setFaixasForm] = useState<FaixaForm[]>([
    { limite: '5', valor: '5,00' },
    { limite: '10', valor: '10,00' },
  ]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (loading) return null;
  if (!session) return <Redirect href="/entrar" />;
  if (tipo !== 'profissional') return <Redirect href="/inicio" />;
  if (!precisaOnboarding) return <Redirect href="/solicitacoes" />;

  const faixas: FaixaDeslocamento[] = faixasForm.map((f, i) => ({
    ordem: i + 1,
    limite_km: Number(f.limite.replace(',', '.')),
    valor_centavos: parseMoneyToCents(f.valor),
  }));
  const maxima = Number(distanciaMaxima.replace(',', '.'));

  function atualizarFaixa(indice: number, campo: keyof FaixaForm, valor: string) {
    setFaixasForm((atuais) => atuais.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  async function capturarLocalizacao() {
    try {
      const local = await localizacaoAtual();
      setLat(local.lat);
      setLng(local.lng);
      showToast('Localização de referência capturada.');
    } catch (e) {
      showToast(mensagemErro(e), 'error');
    }
  }

  async function salvar() {
    setErro(null);
    if (!online) {
      setErro('Conecte-se à internet para concluir seu cadastro.');
      return;
    }
    if (nome.trim().length < 2) return setErro('Informe seu nome completo.');
    if (onlyDigits(cpf).length !== 11) return setErro('Informe um CPF com 11 dígitos.');
    if (!bairro.trim() || !cidade.trim()) return setErro('Informe bairro e cidade de referência.');
    if (lat == null || lng == null) return setErro('Capture sua localização de referência.');
    const problemas = validarFaixas(maxima, faixas);
    if (problemas.length > 0) return setErro(problemas[0]);

    setSalvando(true);
    try {
      await criarPerfilProfissional({
        nome: nome.trim(),
        cpf: onlyDigits(cpf),
        telefone: onlyDigits(telefone),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        lat,
        lng,
        descricao: descricao.trim(),
        distancia_maxima_km: maxima,
        faixas: faixas.map((f, i) => ({
          id: `nova-${i}`,
          limite_km: f.limite_km,
          valor_centavos: f.valor_centavos,
          ordem: i + 1,
        })),
      });
      await recarregarPerfil();
      showToast('Cadastro profissional criado! Complete seus serviços e agenda.');
      router.replace('/servicos');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const previa = lat != null && maxima > 0 ? selecionarFaixa(Math.min(3, maxima), faixas, maxima) : null;

  return (
    <Screen
      keyboard
      footer={
        <Button
          label="Concluir cadastro"
          onPress={() => void salvar()}
          loading={salvando}
          disabled={salvando}
          icon="checkmark-circle-outline"
          size="lg"
        />
      }
    >
      <PageHeader title="Cadastro profissional" back={false} subtitle="Configure seu atendimento a domicílio" />

      <Notice
        tone="info"
        message="Seu perfil ficará em análise após o envio dos dados. Você poderá cadastrar serviços e agenda enquanto aguarda a aprovação."
      />

      {erro ? <Notice tone="danger" message={erro} /> : null}

      <SectionHeader title="Seus dados" />
      <TextField label="Nome completo" required value={nome} onChangeText={setNome} />
      <TextField
        label="CPF"
        required
        value={cpf}
        onChangeText={(v) => setCpf(formatCpf(v))}
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        maxLength={14}
      />
      <TextField
        label="Telefone"
        value={telefone}
        onChangeText={(v) => setTelefone(formatPhone(v))}
        placeholder="(00) 00000-0000"
        keyboardType="phone-pad"
        maxLength={15}
      />
      <TextField label="Descrição" value={descricao} onChangeText={setDescricao} placeholder="Especialidades e forma de atendimento" multiline maxLength={600} />

      <SectionHeader title="Localização de referência" subtitle="Usada para calcular a distância até os clientes" />
      <TextField label="Bairro" required value={bairro} onChangeText={setBairro} />
      <TextField label="Cidade" required value={cidade} onChangeText={setCidade} />
      <Button
        label={lat != null ? 'Atualizar localização' : 'Capturar minha localização'}
        onPress={() => void capturarLocalizacao()}
        variant="secondary"
        icon="navigate-outline"
        fullWidth={false}
      />
      {lat != null && lng != null ? (
        <Notice tone="success" message={`Localização definida: ${lat.toFixed(5)}, ${lng.toFixed(5)}`} />
      ) : (
        <Notice tone="warning" message="A localização é obrigatória para o cálculo de deslocamento." />
      )}

      <SectionHeader title="Atendimento a domicílio" />
      <TextField
        label="Distância máxima (km)"
        required
        value={distanciaMaxima}
        onChangeText={setDistanciaMaxima}
        keyboardType="decimal-pad"
      />

      {faixasForm.map((faixa, indice) => (
        <Card key={indice} style={styles.faixaCard}>
          <AppText variant="bodyStrong">Faixa {indice + 1}</AppText>
          <View style={styles.faixaCampos}>
            <View style={styles.metade}>
              <TextField label="Até (km)" required value={faixa.limite} onChangeText={(v) => atualizarFaixa(indice, 'limite', v)} keyboardType="decimal-pad" containerStyle={styles.semMargem} />
            </View>
            <View style={styles.metade}>
              <TextField label="Valor (R$)" required value={faixa.valor} onChangeText={(v) => atualizarFaixa(indice, 'valor', v)} keyboardType="decimal-pad" containerStyle={styles.semMargem} />
            </View>
          </View>
        </Card>
      ))}

      <View style={styles.linhaAcoes}>
        <Button label="Adicionar faixa" onPress={() => setFaixasForm((a) => [...a, { limite: '', valor: '' }])} variant="outline" icon="add-outline" fullWidth={false} />
        {faixasForm.length > 1 ? (
          <Button label="Remover última" onPress={() => setFaixasForm((a) => a.slice(0, -1))} variant="ghost" icon="remove-outline" fullWidth={false} />
        ) : null}
      </View>

      {previa?.disponivel ? (
        <Card>
          <InfoRow label="Prévia (3 km ou máximo)" value={formatBRL(previa.valorDeslocamentoCentavos)} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  faixaCard: { gap: spacing.sm, marginBottom: spacing.md },
  faixaCampos: { flexDirection: 'row', gap: spacing.sm },
  metade: { flex: 1 },
  semMargem: { marginBottom: 0 },
  linhaAcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
});
