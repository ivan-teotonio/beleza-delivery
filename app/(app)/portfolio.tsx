import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { Loading } from '../../src/components/Loading';
import { AppText } from '../../src/components/AppText';
import { criarFotoPortfolio, excluirFotoPortfolio, listarPortfolio } from '../../src/lib/api';
import { comprimirImagem, enviarImagem, escolherImagem, urlPublica } from '../../src/lib/upload';
import { mensagemErro } from '../../src/lib/errors';
import { useQuery } from '../../src/hooks/useQuery';
import { useFocusRefresh } from '../../src/hooks/useFocusRefresh';
import { useNetwork } from '../../src/providers/NetworkProvider';
import { useSession } from '../../src/providers/SessionProvider';
import { useToast } from '../../src/providers/ToastProvider';
import { colors, radius, spacing } from '../../src/theme';

export default function Portfolio() {
  const { perfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();
  const profissionalId = perfil?.profissional?.id ?? null;
  const uid = perfil?.usuario?.id ?? null;
  const [enviando, setEnviando] = useState(false);

  const consulta = useQuery(
    `portfolio:${profissionalId ?? 'sem'}`,
    () => listarPortfolio(profissionalId!),
    { cacheKey: `portfolio:${profissionalId ?? 'sem'}`, enabled: Boolean(profissionalId) },
  );

  useFocusRefresh(() => {
    void consulta.refresh();
  });

  async function adicionar() {
    if (!online) {
      showToast('Conecte-se à internet para adicionar fotos.', 'error');
      return;
    }
    if (!profissionalId || !uid) return;
    setEnviando(true);
    try {
      const uri = await escolherImagem({ aspect: [4, 3], allowsEditing: true });
      if (!uri) return;
      const comprimida = await comprimirImagem(uri, 1280, 0.82);
      const caminho = `${uid}/portfolio-${Date.now()}.jpg`;
      await enviarImagem('portfolio', caminho, comprimida);
      const publica = await urlPublica('portfolio', caminho);
      await criarFotoPortfolio(profissionalId, publica, caminho);
      showToast('Foto adicionada ao portfólio.');
      await consulta.refresh();
    } catch (e) {
      showToast(mensagemErro(e), 'error');
    } finally {
      setEnviando(false);
    }
  }

  function confirmarExclusao(id: string, storagePath: string | null) {
    Alert.alert('Remover foto', 'Deseja remover esta foto do seu portfólio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          if (!online) {
            showToast('Conecte-se à internet para remover a foto.', 'error');
            return;
          }
          try {
            await excluirFotoPortfolio(id, storagePath);
            showToast('Foto removida.');
            await consulta.refresh();
          } catch (e) {
            showToast(mensagemErro(e), 'error');
          }
        },
      },
    ]);
  }

  if (!profissionalId) {
    return (
      <Screen>
        <PageHeader title="Portfólio" />
        <EmptyState icon="images-outline" title="Perfil profissional necessário" message="Complete seu cadastro para gerenciar o portfólio." />
      </Screen>
    );
  }

  const fotos = consulta.data ?? [];

  return (
    <Screen
      refreshing={consulta.refreshing}
      onRefresh={() => void consulta.refresh()}
      footer={
        <Button
          label="Adicionar foto"
          onPress={() => void adicionar()}
          icon="camera-outline"
          loading={enviando}
          disabled={enviando || !online}
          size="lg"
        />
      }
    >
      <PageHeader title="Portfólio" subtitle="Fotos visíveis no seu perfil público" />

      {!online ? <Notice tone="info" message="Alterações no portfólio exigem conexão com a internet." /> : null}

      {consulta.loading && !consulta.data ? (
        <Loading mensagem="Carregando portfólio..." />
      ) : consulta.error ? (
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      ) : fotos.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Mostre seu trabalho"
          message="Adicione fotos de atendimentos realizados para aumentar a confiança dos clientes."
          actionLabel={online ? 'Adicionar foto' : undefined}
          onAction={() => void adicionar()}
        />
      ) : (
        <View style={styles.grade}>
          {fotos.map((foto) => (
            <View key={foto.id} style={styles.item}>
              <Image source={{ uri: foto.url }} style={styles.imagem} resizeMode="cover" accessibilityLabel="Foto do portfólio" />
              <Pressable
                onPress={() => confirmarExclusao(foto.id, foto.storage_path)}
                accessibilityRole="button"
                accessibilityLabel="Remover foto do portfólio"
                style={styles.remover}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textOnPrimary} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <AppText variant="caption" style={styles.dica}>
        Dica: use fotos nítidas, bem iluminadas e com boa apresentação do resultado.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { width: '48%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  imagem: { width: '100%', height: '100%' },
  remover: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(159,18,57,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dica: { marginTop: spacing.lg },
});
