import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { AppText } from '../../../src/components/AppText';
import { Card } from '../../../src/components/Card';
import { Avatar } from '../../../src/components/Avatar';
import { Badge, STATUS_VERIFICACAO_LABEL, STATUS_VERIFICACAO_TONE } from '../../../src/components/Badge';
import { Button } from '../../../src/components/Button';
import { Chip, ChipRow } from '../../../src/components/Chip';
import { EmptyState } from '../../../src/components/EmptyState';
import { ErrorState } from '../../../src/components/ErrorState';
import { Loading } from '../../../src/components/Loading';
import { StaleNotice } from '../../../src/components/OfflineBanner';
import { PageHeader } from '../../../src/components/PageHeader';
import { listarProfissionaisAdmin } from '../../../src/lib/api';
import { formatDate } from '../../../src/lib/format';
import { useQuery } from '../../../src/hooks/useQuery';
import { useFocusRefresh } from '../../../src/hooks/useFocusRefresh';
import { colors, spacing } from '../../../src/theme';

type Filtro = 'pendente' | 'aprovado' | 'reprovado';

const FILTROS: Array<{ valor: Filtro; rotulo: string }> = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'aprovado', rotulo: 'Aprovados' },
  { valor: 'reprovado', rotulo: 'Reprovados' },
];

export default function Aprovacoes() {
  const [filtro, setFiltro] = useState<Filtro>('pendente');

  const consulta = useQuery(`admin-profissionais:${filtro}`, () => listarProfissionaisAdmin(filtro), {
    cacheKey: `admin-profissionais:${filtro}`,
  });

  useFocusRefresh(() => consulta.refresh());

  const profissionais = consulta.data ?? [];
  const pendentes = filtro === 'pendente';

  return (
    <Screen refreshing={consulta.refreshing} onRefresh={() => void consulta.refresh()}>
      <PageHeader
        title="Aprovações"
        back={false}
        subtitle="Analise documentos e libere novos profissionais"
      />

      <ChipRow>
        {FILTROS.map((item) => (
          <Chip
            key={item.valor}
            label={item.rotulo}
            selected={filtro === item.valor}
            onPress={() => setFiltro(item.valor)}
          />
        ))}
      </ChipRow>

      {consulta.stale ? <StaleNotice /> : null}

      {pendentes && profissionais.length > 0 ? (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.warning} />
          <AppText variant="caption" color={colors.warning} style={styles.avisoTexto}>
            {profissionais.length === 1
              ? '1 cadastro aguardando análise.'
              : `${profissionais.length} cadastros aguardando análise.`}
          </AppText>
        </View>
      ) : null}

      {consulta.loading && !consulta.data ? (
        <Loading mensagem="Carregando cadastros..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : profissionais.length === 0 ? (
        <EmptyState
          icon={pendentes ? 'checkmark-done-outline' : 'people-outline'}
          title={pendentes ? 'Nenhuma pendência' : 'Nada por aqui'}
          message={
            pendentes
              ? 'Todos os cadastros profissionais estão em dia.'
              : 'Não há profissionais com este status.'
          }
        />
      ) : (
        profissionais.map((profissional) => (
          <Card
            key={profissional.id}
            onPress={() => router.push(`/admin/${profissional.id}`)}
            accessibilityLabel={`Revisar cadastro de ${profissional.nome}`}
            accessibilityHint="Abre os dados e documentos do profissional"
            style={styles.card}
          >
            <View style={styles.topo}>
              <Avatar nome={profissional.nome} uri={profissional.foto_url} size={56} />
              <View style={styles.info}>
                <AppText variant="subtitle" numberOfLines={1}>
                  {profissional.nome}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {profissional.endereco_ref_bairro}, {profissional.endereco_ref_cidade}
                </AppText>
                <AppText variant="caption">Cadastro em {formatDate(profissional.criado_em)}</AppText>
              </View>
              <Badge
                label={STATUS_VERIFICACAO_LABEL[profissional.status_verificacao]}
                tone={STATUS_VERIFICACAO_TONE[profissional.status_verificacao]}
              />
            </View>

            <View style={styles.rodape}>
              <AppText variant="caption">
                Atende até {Number(profissional.distancia_maxima_km).toFixed(1).replace('.', ',')} km · resposta em{' '}
                {profissional.prazo_resposta_h}h
              </AppText>
              <Button
                label="Revisar cadastro"
                onPress={() => router.push(`/admin/${profissional.id}`)}
                variant={pendentes ? 'primary' : 'outline'}
                icon="document-text-outline"
                fullWidth={false}
              />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avisoTexto: { flex: 1 },
  card: { marginBottom: spacing.md },
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  info: { flex: 1, gap: 2 },
  rodape: { gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' },
});
