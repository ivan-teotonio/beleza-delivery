import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Card } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { SectionHeader } from '../../src/components/SectionHeader';
import { InfoRow, Divider } from '../../src/components/InfoRow';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { Loading } from '../../src/components/Loading';
import { listarFaixas, salvarConfigDeslocamento } from '../../src/lib/api';
import { centsToInput, formatBRL, formatDistance, parseMoneyToCents } from '../../src/lib/format';
import { distanciasDeExemplo, selecionarFaixa, validarFaixas, type FaixaDeslocamento } from '../../src/lib/pricing';
import { mensagemErro } from '../../src/lib/errors';
import { useQuery } from '../../src/hooks/useQuery';
import { useNetwork } from '../../src/providers/NetworkProvider';
import { useSession } from '../../src/providers/SessionProvider';
import { useToast } from '../../src/providers/ToastProvider';
import { colors, radius, spacing } from '../../src/theme';

interface FaixaForm {
  limite: string;
  valor: string;
}

const FAIXA_VAZIA: FaixaForm = { limite: '', valor: '' };

export default function AtendimentoDomicilio() {
  const { perfil, recarregarPerfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();
  const profissionalId = perfil?.profissional?.id ?? null;

  const [distanciaMaxima, setDistanciaMaxima] = useState('');
  const [faixasForm, setFaixasForm] = useState<FaixaForm[]>([{ ...FAIXA_VAZIA }]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const faixasQuery = useQuery(
    `faixas:${profissionalId ?? 'sem'}`,
    () => listarFaixas(profissionalId!),
    { cacheKey: `faixas:${profissionalId ?? 'sem'}`, enabled: Boolean(profissionalId) },
  );

  useEffect(() => {
    if (perfil?.profissional?.distancia_maxima_km != null) {
      setDistanciaMaxima(String(perfil.profissional.distancia_maxima_km).replace('.', ','));
    }
  }, [perfil?.profissional?.distancia_maxima_km]);

  useEffect(() => {
    if (!faixasQuery.data) return;
    if (faixasQuery.data.length === 0) return;
    setFaixasForm(
      faixasQuery.data.map((f) => ({
        limite: String(f.limite_km).replace('.', ','),
        valor: centsToInput(f.valor_centavos),
      })),
    );
  }, [faixasQuery.data]);

  const faixas = useMemo<FaixaDeslocamento[]>(
    () =>
      faixasForm.map((f, i) => ({
        ordem: i + 1,
        limite_km: Number(f.limite.replace(',', '.')),
        valor_centavos: parseMoneyToCents(f.valor),
      })),
    [faixasForm],
  );

  const maxima = Number(distanciaMaxima.replace(',', '.'));
  const errosValidacao = useMemo(
    () => (distanciaMaxima || faixasForm.some((f) => f.limite || f.valor) ? validarFaixas(maxima, faixas) : []),
    [distanciaMaxima, faixasForm, maxima, faixas],
  );

  const exemplos = useMemo(() => {
    if (errosValidacao.length > 0 || !Number.isFinite(maxima)) return [];
    return distanciasDeExemplo(faixas).map((dist) => ({
      distanciaKm: dist,
      resultado: selecionarFaixa(dist, faixas, maxima),
    }));
  }, [errosValidacao.length, maxima, faixas]);

  function atualizarFaixa(indice: number, campo: keyof FaixaForm, valor: string) {
    setFaixasForm((atuais) => atuais.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  function adicionarFaixa() {
    setFaixasForm((atuais) => [...atuais, { ...FAIXA_VAZIA }]);
  }

  function removerFaixa(indice: number) {
    setFaixasForm((atuais) => (atuais.length <= 1 ? atuais : atuais.filter((_, i) => i !== indice)));
  }

  async function salvar() {
    setErro(null);
    if (!online) {
      setErro('Conecte-se à internet para salvar suas faixas de deslocamento.');
      return;
    }
    const problemas = validarFaixas(maxima, faixas);
    if (problemas.length > 0) {
      setErro(problemas[0]);
      return;
    }

    setSalvando(true);
    try {
      await salvarConfigDeslocamento(
        maxima,
        faixas.map((f, i) => ({
          id: faixasQuery.data?.[i]?.id ?? `nova-${i}`,
          limite_km: f.limite_km,
          valor_centavos: f.valor_centavos,
          ordem: i + 1,
        })),
      );
      await recarregarPerfil();
      await faixasQuery.refresh();
      showToast('Configuração de deslocamento salva.');
      router.back();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!profissionalId) {
    return (
      <Screen>
        <PageHeader title="Atendimento a domicílio" />
        <EmptyState
          icon="briefcase-outline"
          title="Perfil profissional necessário"
          message="Complete seu cadastro profissional para configurar o atendimento."
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboard
      footer={
        <Button
          label="Salvar configuração"
          onPress={() => void salvar()}
          loading={salvando}
          disabled={salvando}
          icon="save-outline"
          size="lg"
        />
      }
    >
      <PageHeader
        title="Atendimento a domicílio"
        subtitle="Defina até onde você atende e o valor do deslocamento"
      />

      <Notice
        tone="info"
        message="Clientes só verão seu perfil se você configurar faixas válidas. O valor do deslocamento é somado ao preço do serviço no momento da solicitação."
      />

      {erro ? <Notice tone="danger" message={erro} /> : null}
      {errosValidacao.length > 0 && !erro ? (
        <Notice tone="warning" message={errosValidacao[0]} />
      ) : null}

      <TextField
        label="Distância máxima de atendimento (km)"
        required
        value={distanciaMaxima}
        onChangeText={setDistanciaMaxima}
        placeholder="20"
        keyboardType="decimal-pad"
        helper="A última faixa deve ter limite igual a esta distância."
      />

      <SectionHeader
        title="Faixas de deslocamento"
        subtitle="Limites crescentes, sem sobreposição"
        actionLabel="Adicionar faixa"
        actionIcon="add-circle-outline"
        onAction={adicionarFaixa}
      />

      {faixasQuery.loading && !faixasQuery.data ? (
        <Loading mensagem="Carregando faixas..." />
      ) : faixasQuery.error && !faixasQuery.data ? (
        <ErrorState mensagem={faixasQuery.error} onRetry={() => void faixasQuery.refresh()} />
      ) : (
        faixasForm.map((faixa, indice) => (
          <Card key={indice} style={styles.faixaCard}>
            <View style={styles.faixaTopo}>
              <AppText variant="bodyStrong">Faixa {indice + 1}</AppText>
              {faixasForm.length > 1 ? (
                <Button
                  label="Remover"
                  onPress={() => removerFaixa(indice)}
                  variant="ghost"
                  icon="trash-outline"
                  fullWidth={false}
                />
              ) : null}
            </View>
            <View style={styles.faixaCampos}>
              <View style={styles.campoMetade}>
                <TextField
                  label="Até (km)"
                  required
                  value={faixa.limite}
                  onChangeText={(v) => atualizarFaixa(indice, 'limite', v)}
                  placeholder="5"
                  keyboardType="decimal-pad"
                  containerStyle={styles.semMargem}
                />
              </View>
              <View style={styles.campoMetade}>
                <TextField
                  label="Valor (R$)"
                  required
                  value={faixa.valor}
                  onChangeText={(v) => atualizarFaixa(indice, 'valor', v)}
                  placeholder="5,00"
                  keyboardType="decimal-pad"
                  containerStyle={styles.semMargem}
                />
              </View>
            </View>
          </Card>
        ))
      )}

      {exemplos.length > 0 ? (
        <>
          <SectionHeader title="Prévia de valores" subtitle="Exemplos calculados com suas faixas" />
          <Card style={styles.previa}>
            {exemplos.map((exemplo, i) => (
              <View key={`${exemplo.distanciaKm}-${i}`}>
                {i > 0 ? <Divider /> : null}
                <InfoRow
                  label={formatDistance(exemplo.distanciaKm)}
                  value={
                    exemplo.resultado.disponivel
                      ? formatBRL(exemplo.resultado.valorDeslocamentoCentavos)
                      : 'Indisponível'
                  }
                  valueColor={exemplo.resultado.disponivel ? colors.text : colors.danger}
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  faixaCard: { gap: spacing.sm, marginBottom: spacing.md },
  faixaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faixaCampos: { flexDirection: 'row', gap: spacing.sm },
  campoMetade: { flex: 1 },
  semMargem: { marginBottom: 0 },
  previa: { gap: 2, marginBottom: spacing.lg },
});
