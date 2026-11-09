import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { TextField } from '../../../src/components/TextField';
import { SectionHeader } from '../../../src/components/SectionHeader';
import { Chip, ChipRow } from '../../../src/components/Chip';
import { Notice } from '../../../src/components/Notice';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { Button } from '../../../src/components/Button';
import { ProfissionalCard } from '../../../src/components/ProfissionalCard';
import { buscarProfissionais, tiposServicoDisponiveis } from '../../../src/lib/api';
import { localizacaoAtual } from '../../../src/lib/geocode';
import { primeiroNome } from '../../../src/lib/format';
import { mensagemErro } from '../../../src/lib/errors';
import { useDebounce } from '../../../src/hooks/useDebounce';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { useQuery } from '../../../src/hooks/useQuery';
import { useNetwork } from '../../../src/providers/NetworkProvider';
import { useSession } from '../../../src/providers/SessionProvider';
import { useToast } from '../../../src/providers/ToastProvider';
import { colors, spacing } from '../../../src/theme';

export default function Inicio() {
  const { perfil, perfilLoading } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();
  const [tipo, setTipo] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const buscaAdiada = useDebounce(busca, 400);

  useEffect(() => {
    if (perfil?.endereco_lat != null && perfil?.endereco_lng != null) {
      setCoords({ lat: perfil.endereco_lat, lng: perfil.endereco_lng });
    }
  }, [perfil?.endereco_lat, perfil?.endereco_lng]);

  const tipos = useQuery('tipos-servico', tiposServicoDisponiveis, {
    cacheKey: 'tipos-servico',
  });

  const chaveBusca = useMemo(
    () =>
      `busca:${coords?.lat ?? 'x'}:${coords?.lng ?? 'x'}:${tipo ?? 'todos'}:${buscaAdiada.trim().toLowerCase()}`,
    [coords?.lat, coords?.lng, tipo, buscaAdiada],
  );

  const resultados = useQuery(
    chaveBusca,
    () =>
      buscarProfissionais({
        lat: coords!.lat,
        lng: coords!.lng,
        tipo,
        busca: buscaAdiada,
      }),
    { cacheKey: coords ? 'busca-profissionais' : undefined, enabled: Boolean(coords) },
  );

  useFocusRefresh(() => {
    if (coords) void resultados.refresh();
    if (tipos.data === null) void tipos.refresh();
  });

  async function usarMinhaLocalizacao() {
    setBuscandoLocal(true);
    try {
      const local = await localizacaoAtual();
      setCoords({ lat: local.lat, lng: local.lng });
      showToast('Buscando profissionais perto de você.');
    } catch (erro) {
      showToast(mensagemErro(erro), 'error');
    } finally {
      setBuscandoLocal(false);
    }
  }

  const nome = primeiroNome(perfil?.cliente?.nome);
  const temEndereco = Boolean(perfil?.endereco);
  const enderecoResumo = perfil?.endereco
    ? `${perfil.endereco.rua}, ${perfil.endereco.numero} — ${perfil.endereco.bairro}`
    : 'Cadastre seu endereço para agendar com segurança.';

  return (
    <Screen
      refreshing={resultados.refreshing}
      onRefresh={() => {
        void resultados.refresh();
        void tipos.refresh();
      }}
    >
      <View style={styles.topo}>
        <View style={styles.saudacao}>
          <AppText variant="display">Olá, {nome}</AppText>
          <AppText variant="body" color={colors.textMuted}>
            Encontre beleza e cuidado perto de você.
          </AppText>
        </View>
        <View style={styles.localAtual}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <AppText variant="caption" numberOfLines={2} style={styles.localTexto}>
            {enderecoResumo}
          </AppText>
        </View>
      </View>

      {!temEndereco ? (
        <Notice
          tone="warning"
          title="Falta seu endereço"
          message="O endereço é usado para calcular a distância e o valor do deslocamento. Cadastre antes de solicitar um atendimento."
          actionLabel="Cadastrar meu endereço"
          onAction={() => router.push('/endereco')}
        />
      ) : null}

      {!online ? (
        <Notice
          tone="info"
          message="Sem conexão: mostrando os últimos resultados salvos. Para solicitar um agendamento, conecte-se à internet."
        />
      ) : null}

      <TextField
        label="Buscar profissional ou serviço"
        value={busca}
        onChangeText={setBusca}
        placeholder="Ex.: manicure, corte, maquiagem"
        leftIcon="search-outline"
        autoCorrect={false}
        returnKeyType="search"
        helper="A busca considera nome do profissional e tipo de serviço."
      />

      {tipos.data && tipos.data.length > 0 ? (
        <ChipRow>
          <Chip label="Todos" selected={tipo === null} onPress={() => setTipo(null)} />
          {tipos.data.map((valor) => (
            <Chip
              key={valor}
              label={valor}
              selected={tipo === valor}
              onPress={() => setTipo(tipo === valor ? null : valor)}
            />
          ))}
        </ChipRow>
      ) : null}

      <View style={styles.acoesLocal}>
        <Button
          label={buscandoLocal ? 'Localizando...' : 'Usar minha localização atual'}
          onPress={() => void usarMinhaLocalizacao()}
          variant="secondary"
          icon="navigate-outline"
          loading={buscandoLocal}
          disabled={buscandoLocal}
          fullWidth={false}
        />
        {!temEndereco ? (
          <Button
            label="Meu endereço"
            onPress={() => router.push('/endereco')}
            variant="ghost"
            icon="home-outline"
            fullWidth={false}
          />
        ) : null}
      </View>

      {!coords ? (
        <EmptyState
          icon="location-outline"
          title="Onde você está?"
          message="Cadastre seu endereço ou use a localização atual para ver profissionais que atendem na sua região."
          actionLabel={temEndereco ? 'Usar localização' : 'Cadastrar endereço'}
          onAction={() => (temEndereco ? void usarMinhaLocalizacao() : router.push('/endereco'))}
        />
      ) : resultados.loading && !resultados.data ? (
        <Loading mensagem="Procurando profissionais perto de você..." />
      ) : resultados.error ? (
        <ErrorState mensagem={resultados.error} onRetry={() => void resultados.refresh()} />
      ) : (
        <>
          {resultados.stale ? <StaleNotice /> : null}
          <SectionHeader
            title="Perto de você"
            subtitle={
              resultados.data && resultados.data.length > 0
                ? `${resultados.data.length} ${resultados.data.length === 1 ? 'profissional encontrado' : 'profissionais encontrados'}`
                : undefined
            }
            actionLabel="Atualizar"
            actionIcon="refresh-outline"
            onAction={() => void resultados.refresh()}
          />

          {resultados.data && resultados.data.length > 0 ? (
            resultados.data.map((profissional) => (
              <ProfissionalCard
                key={profissional.id}
                profissional={profissional}
                onPress={() =>
                  router.push(
                    `/profissional/${profissional.id}?distancia=${encodeURIComponent(String(profissional.distancia_km))}`,
                  )
                }
              />
            ))
          ) : (
            <EmptyState
              icon="search-outline"
              title="Nenhum profissional por aqui"
              message={
                tipo || busca.trim()
                  ? 'Tente remover o filtro ou buscar outro serviço.'
                  : 'Ainda não encontramos profissionais que atendam nessa região. Tente atualizar sua localização mais tarde.'
              }
              actionLabel={tipo || busca.trim() ? 'Limpar filtros' : undefined}
              onAction={() => {
                setTipo(null);
                setBusca('');
              }}
            />
          )}
        </>
      )}

      {perfilLoading ? <AppText variant="caption" center>Atualizando seu perfil...</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topo: { gap: spacing.md, marginBottom: spacing.lg },
  saudacao: { gap: spacing.xs },
  localAtual: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: spacing.md,
  },
  localTexto: { flex: 1, color: colors.primaryDark },
  acoesLocal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
