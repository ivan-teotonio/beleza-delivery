import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { PageHeader } from '../../../../src/components/PageHeader';
import { AppText } from '../../../../src/components/AppText';
import { Card } from '../../../../src/components/Card';
import { Stars } from '../../../../src/components/Stars';
import { TextField } from '../../../../src/components/TextField';
import { Button } from '../../../../src/components/Button';
import { Notice } from '../../../../src/components/Notice';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorState } from '../../../../src/components/ErrorState';
import { Loading } from '../../../../src/components/Loading';
import { avaliarAgendamento, detalharAgendamento } from '../../../../src/lib/api';
import { formatDateTime } from '../../../../src/lib/format';
import { mensagemErro } from '../../../../src/lib/errors';
import { useQuery } from '../../../../src/hooks/useQuery';
import { useNetwork } from '../../../../src/providers/NetworkProvider';
import { useToast } from '../../../../src/providers/ToastProvider';
import { colors, spacing } from '../../../../src/theme';

export default function AvaliarAgendamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agendamentoId = String(id ?? '');
  const { online } = useNetwork();
  const { showToast } = useToast();
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const consulta = useQuery(
    `agendamento:${agendamentoId}`,
    () => detalharAgendamento(agendamentoId),
    { cacheKey: `agendamento:${agendamentoId}`, enabled: Boolean(agendamentoId) },
  );

  const agendamento = consulta.data;

  useEffect(() => {
    if (agendamento?.avaliacao_nota) setNota(agendamento.avaliacao_nota);
  }, [agendamento?.avaliacao_nota]);

  async function enviar() {
    if (!agendamento) return;
    if (!online) {
      showToast('Conecte-se à internet para enviar sua avaliação.', 'error');
      return;
    }
    if (nota < 1 || nota > 5) {
      showToast('Escolha uma nota de 1 a 5 estrelas.', 'error');
      return;
    }
    setEnviando(true);
    try {
      await avaliarAgendamento(agendamento.id, nota, comentario.trim() || undefined);
      showToast('Avaliação enviada. Obrigado pelo seu retorno!');
      router.replace(`/agendamento/${agendamento.id}`);
    } catch (erro) {
      showToast(mensagemErro(erro), 'error');
    } finally {
      setEnviando(false);
    }
  }

  if (consulta.loading && !agendamento) {
    return (
      <Screen scroll={false}>
        <Loading mensagem="Carregando atendimento..." />
      </Screen>
    );
  }

  if (consulta.error && !agendamento) {
    return (
      <Screen>
        <PageHeader title="Avaliar atendimento" />
        <ErrorState mensagem={consulta.error} onRetry={() => void consulta.refresh()} />
      </Screen>
    );
  }

  if (!agendamento) {
    return (
      <Screen>
        <PageHeader title="Avaliar atendimento" />
        <EmptyState
          icon="star-outline"
          title="Agendamento não encontrado"
          message="Não foi possível localizar este atendimento."
          actionLabel="Voltar"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (!agendamento.pode_avaliar) {
    return (
      <Screen>
        <PageHeader title="Avaliar atendimento" />
        <Notice
          tone={agendamento.avaliacao_nota ? 'success' : 'info'}
          title={agendamento.avaliacao_nota ? 'Avaliação já enviada' : 'Avaliação indisponível'}
          message={
            agendamento.avaliacao_nota
              ? 'Você já avaliou este atendimento.'
              : 'A avaliação fica disponível após o atendimento ser concluído.'
          }
        />
        <Button label="Voltar" onPress={() => router.back()} variant="outline" />
      </Screen>
    );
  }

  return (
    <Screen
      keyboard
      footer={
        <Button
          label="Enviar avaliação"
          onPress={() => void enviar()}
          loading={enviando}
          disabled={!online || enviando}
          icon="star"
          size="lg"
        />
      }
    >
      <PageHeader title="Avaliar atendimento" subtitle="Seu feedback ajuda outras pessoas" />

      {!online ? (
        <Notice tone="info" message="Conecte-se à internet para enviar sua avaliação." />
      ) : null}

      <Card style={styles.resumo}>
        <AppText variant="bodyStrong">{agendamento.servico_tipo}</AppText>
        <AppText variant="caption">
          com {agendamento.profissional_nome} · {formatDateTime(agendamento.inicio)}
        </AppText>
      </Card>

      <View style={styles.notaBloco}>
        <AppText variant="subtitle" center>
          Como foi o atendimento?
        </AppText>
        <View style={styles.estrelas}>
          <Stars nota={nota} onChange={setNota} size={40} />
        </View>
        <AppText variant="label" color={colors.primaryDark} center>
          {nota === 1
            ? 'Muito ruim'
            : nota === 2
              ? 'Ruim'
              : nota === 3
                ? 'Regular'
                : nota === 4
                  ? 'Bom'
                  : 'Excelente'}
        </AppText>
      </View>

      <TextField
        label="Comentário (opcional)"
        value={comentario}
        onChangeText={setComentario}
        placeholder="Conte como foi sua experiência"
        multiline
        maxLength={1000}
        helper={`${comentario.length}/1000 caracteres`}
        editable={!enviando}
      />

      <Notice
        tone="info"
        message="Avaliações honestas e respeitosas ajudam a manter a qualidade da plataforma."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  resumo: { gap: 2, marginBottom: spacing.lg },
  notaBloco: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  estrelas: { paddingVertical: spacing.sm },
});
