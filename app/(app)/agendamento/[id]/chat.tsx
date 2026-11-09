import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { PageHeader } from '../../../../src/components/PageHeader';
import { AppText } from '../../../../src/components/AppText';
import { TextField } from '../../../../src/components/TextField';
import { IconButton } from '../../../../src/components/Button';
import { Notice } from '../../../../src/components/Notice';
import { EmptyState } from '../../../../src/components/EmptyState';
import { ErrorState } from '../../../../src/components/ErrorState';
import { Loading } from '../../../../src/components/Loading';
import { StaleNotice } from '../../../../src/components/OfflineBanner';
import { detalharAgendamento, listarMensagens } from '../../../../src/lib/api';
import { formatDateTime } from '../../../../src/lib/format';
import { mensagemErro } from '../../../../src/lib/errors';
import { enqueueOutbox } from '../../../../src/lib/offline/db';
import { useFocusRefresh } from '../../../../src/hooks/useFocusRefresh';
import { useQuery } from '../../../../src/hooks/useQuery';
import { useRealtime } from '../../../../src/hooks/useRealtime';
import { useNetwork } from '../../../../src/providers/NetworkProvider';
import { useSession } from '../../../../src/providers/SessionProvider';
import { useSync } from '../../../../src/providers/SyncProvider';
import { useToast } from '../../../../src/providers/ToastProvider';
import type { Mensagem } from '../../../../src/lib/types';
import { colors, radius, spacing } from '../../../../src/theme';

interface MensagemLocal extends Mensagem {
  pendente?: boolean;
}

export default function ChatAgendamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agendamentoId = String(id ?? '');
  const { perfil } = useSession();
  const { online } = useNetwork();
  const { versaoSync } = useSync();
  const { showToast } = useToast();
  const meuId = perfil?.usuario?.id ?? '';
  const scrollRef = useRef<ScrollView>(null);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [locais, setLocais] = useState<MensagemLocal[]>([]);

  const agendamento = useQuery(
    `agendamento:${agendamentoId}`,
    () => detalharAgendamento(agendamentoId),
    { cacheKey: `agendamento:${agendamentoId}`, enabled: Boolean(agendamentoId) },
  );

  const mensagens = useQuery(
    `mensagens:${agendamentoId}`,
    () => listarMensagens(agendamentoId),
    { cacheKey: `mensagens:${agendamentoId}`, enabled: Boolean(agendamentoId) },
  );

  useFocusRefresh(() => {
    void agendamento.refresh();
    void mensagens.refresh();
  });

  useRealtime({
    canal: `chat:${agendamentoId}`,
    tabela: 'mensagem',
    filtro: `agendamento_id=eq.${agendamentoId}`,
    evento: 'INSERT',
    habilitado: Boolean(agendamentoId),
    aoMudar: () => {
      void mensagens.refresh();
    },
  });

  useEffect(() => {
    void mensagens.refresh();
  }, [versaoSync]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mensagens.data) return;
    setLocais((atuais) =>
      atuais.filter(
        (local) => !mensagens.data!.some((m) => m.conteudo === local.conteudo && m.remetente_id === local.remetente_id),
      ),
    );
  }, [mensagens.data]);

  const itens = useMemo(() => {
    const remotas = (mensagens.data ?? []) as MensagemLocal[];
    const todas = [...remotas, ...locais];
    return todas.sort((a, b) => a.enviada_em.localeCompare(b.enviada_em));
  }, [mensagens.data, locais]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [itens.length]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || !meuId || enviando) return;
    if (conteudo.length > 2000) {
      showToast('A mensagem pode ter no máximo 2.000 caracteres.', 'error');
      return;
    }

    setEnviando(true);
    const otimista: MensagemLocal = {
      id: `local-${Date.now()}`,
      agendamento_id: agendamentoId,
      remetente_id: meuId,
      conteudo,
      enviada_em: new Date().toISOString(),
      pendente: !online,
    };
    setTexto('');
    setLocais((atuais) => [...atuais, otimista]);

    try {
      if (online) {
        // Tenta enviar direto; se falhar por rede, cai na fila.
        const { enviarMensagem } = await import('../../../../src/lib/api');
        try {
          await enviarMensagem(agendamentoId, meuId, conteudo);
          await mensagens.refresh();
        } catch (erro) {
          await enqueueOutbox('mensagem', { agendamentoId, remetenteId: meuId, conteudo });
          showToast('Sem conexão estável. A mensagem será enviada automaticamente.', 'info');
        }
      } else {
        await enqueueOutbox('mensagem', { agendamentoId, remetenteId: meuId, conteudo });
        showToast('Mensagem salva. Ela será enviada quando a conexão voltar.');
      }
    } catch (erro) {
      setLocais((atuais) => atuais.filter((m) => m.id !== otimista.id));
      setTexto(conteudo);
      showToast(mensagemErro(erro), 'error');
    } finally {
      setEnviando(false);
    }
  }

  const podeConversar =
    agendamento.data?.status === 'pendente' || agendamento.data?.status === 'confirmado';

  return (
    <Screen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View style={styles.cabecalho}>
          <PageHeader
            title="Chat"
            subtitle={agendamento.data?.servico_tipo ?? 'Conversa do agendamento'}
          />
        </View>

        {!online ? (
          <View style={styles.avisoWrap}>
            <Notice
              tone="info"
              message="Sem conexão. Mensagens enviadas agora ficam na fila e são sincronizadas automaticamente."
            />
          </View>
        ) : null}
        {mensagens.stale ? (
          <View style={styles.avisoWrap}>
            <StaleNotice />
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mensagens.loading && !mensagens.data ? (
            <Loading mensagem="Carregando mensagens..." />
          ) : mensagens.error && !mensagens.data ? (
            <ErrorState mensagem={mensagens.error} onRetry={() => void mensagens.refresh()} />
          ) : itens.length === 0 ? (
            <EmptyState
              icon="chatbubble-outline"
              title="Comece a conversa"
              message="Combine detalhes do atendimento por aqui. Mantenha o respeito e evite compartilhar dados sensíveis."
            />
          ) : (
            itens.map((msg) => {
              const minha = msg.remetente_id === meuId;
              return (
                <View
                  key={msg.id}
                  style={[styles.linha, minha ? styles.linhaMinha : styles.linhaOutra]}
                >
                  <View
                    style={[styles.balao, minha ? styles.balaoMeu : styles.balaoOutro]}
                    accessible
                    accessibilityLabel={`${minha ? 'Você' : 'Outra pessoa'}: ${msg.conteudo}. ${formatDateTime(msg.enviada_em)}${msg.pendente ? '. Aguardando envio.' : ''}`}
                  >
                    <AppText
                      variant="body"
                      color={minha ? colors.textOnPrimary : colors.text}
                    >
                      {msg.conteudo}
                    </AppText>
                    <AppText
                      variant="caption"
                      color={minha ? 'rgba(255,255,255,0.82)' : colors.textMuted}
                      style={styles.hora}
                    >
                      {msg.pendente ? 'Aguardando envio' : formatDateTime(msg.enviada_em)}
                    </AppText>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {podeConversar ? (
          <View style={styles.composer}>
            <View style={styles.campoWrap}>
              <TextField
                label="Mensagem"
                value={texto}
                onChangeText={setTexto}
                placeholder="Escreva sua mensagem"
                multiline
                maxLength={2000}
                containerStyle={styles.campo}
                editable={!enviando}
                returnKeyType="default"
              />
            </View>
            <IconButton
              icon="send"
              accessibilityLabel="Enviar mensagem"
              onPress={() => void enviar()}
              disabled={!texto.trim() || enviando}
              loading={enviando}
              variant="primary"
              style={styles.enviar}
            />
          </View>
        ) : (
          <View style={styles.fechado}>
            <AppText variant="caption" center>
              O chat fica disponível enquanto o agendamento está pendente ou confirmado.
            </AppText>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cabecalho: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  avisoWrap: { paddingHorizontal: spacing.lg },
  lista: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  linha: { flexDirection: 'row' },
  linhaMinha: { justifyContent: 'flex-end' },
  linhaOutra: { justifyContent: 'flex-start' },
  balao: {
    maxWidth: '84%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  balaoMeu: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  balaoOutro: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  hora: { marginTop: 2 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  campoWrap: { flex: 1 },
  campo: { marginBottom: 0 },
  enviar: { marginBottom: 2 },
  fechado: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});
