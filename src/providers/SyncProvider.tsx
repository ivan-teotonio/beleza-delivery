import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { enviarMensagem } from '../lib/api';
import { ehErroDeRede, mensagemErro } from '../lib/errors';
import {
  contarOutboxPendente,
  listOutboxPendente,
  marcarOutbox,
  type OutboxItem,
} from '../lib/offline/db';
import { useNetwork } from './NetworkProvider';
import { useSession } from './SessionProvider';

interface SyncContextValue {
  pendentes: number;
  sincronizando: boolean;
  ultimaSync: string | null;
  ultimoErro: string | null;
  versaoSync: number;
  sincronizarAgora: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

async function processar(item: OutboxItem): Promise<void> {
  switch (item.kind) {
    case 'mensagem': {
      const agendamentoId = String(item.payload.agendamentoId ?? '');
      const remetenteId = String(item.payload.remetenteId ?? '');
      const conteudo = String(item.payload.conteudo ?? '');
      if (!agendamentoId || !remetenteId || !conteudo.trim()) {
        throw new Error('Mensagem inválida na fila local');
      }
      await enviarMensagem(agendamentoId, remetenteId, conteudo);
      return;
    }
    default:
      throw new Error(`Operação desconhecida na fila: ${item.kind}`);
  }
}

/**
 * Outbox local (RN19/RF32): escritas não críticas (mensagens do chat) são
 * enviadas quando a conexão volta, com backoff exponencial.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { online } = useNetwork();
  const { session } = useSession();
  const [pendentes, setPendentes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [ultimoErro, setUltimoErro] = useState<string | null>(null);
  const [versaoSync, setVersaoSync] = useState(0);
  const emAndamento = useRef(false);
  const onlineRef = useRef(online);
  onlineRef.current = online;
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const atualizarPendentes = useCallback(async () => {
    setPendentes(await contarOutboxPendente());
  }, []);

  const sincronizarAgora = useCallback(async () => {
    if (emAndamento.current || !onlineRef.current || !sessionRef.current) {
      await atualizarPendentes();
      return;
    }
    emAndamento.current = true;
    setSincronizando(true);
    setUltimoErro(null);
    let enviadas = 0;
    try {
      const itens = await listOutboxPendente();
      for (const item of itens) {
        try {
          await processar(item);
          await marcarOutbox(item.id, 'concluido');
          enviadas += 1;
        } catch (erro) {
          if (ehErroDeRede(erro)) {
            await marcarOutbox(item.id, 'falhou', mensagemErro(erro));
            break; // sem rede: tenta de novo no próximo ciclo
          }
          // Servidor rejeitou (conflito/validação): descarta, o Supabase é autoridade.
          await marcarOutbox(item.id, 'concluido');
          setUltimoErro(mensagemErro(erro));
        }
      }
    } catch (erro) {
      setUltimoErro(mensagemErro(erro));
    } finally {
      emAndamento.current = false;
      setSincronizando(false);
      if (enviadas > 0) {
        setUltimaSync(new Date().toISOString());
        setVersaoSync((v) => v + 1);
      }
      await atualizarPendentes();
    }
  }, [atualizarPendentes]);

  useEffect(() => {
    void atualizarPendentes();
    if (session) void sincronizarAgora();
  }, [session, atualizarPendentes, sincronizarAgora]);

  useEffect(() => {
    if (online) void sincronizarAgora();
  }, [online, sincronizarAgora]);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void sincronizarAgora();
    });
    const timer = setInterval(() => {
      void sincronizarAgora();
    }, 30_000);
    return () => {
      assinatura.remove();
      clearInterval(timer);
    };
  }, [sincronizarAgora]);

  const valor = useMemo<SyncContextValue>(
    () => ({
      pendentes,
      sincronizando,
      ultimaSync,
      ultimoErro,
      versaoSync,
      sincronizarAgora,
    }),
    [pendentes, sincronizando, ultimaSync, ultimoErro, versaoSync, sincronizarAgora],
  );

  return <SyncContext.Provider value={valor}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync deve ser usado dentro de SyncProvider');
  return ctx;
}
