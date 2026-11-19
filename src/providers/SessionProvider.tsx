import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { meuPerfil, registrarDispositivo, sair, sairDeTodosOsDispositivos } from '../lib/api';
import { mensagemErro } from '../lib/errors';
import { prepararNotificacoes } from '../lib/notifications';
import { cacheClear, cacheGet, cacheSet } from '../lib/offline/db';
import { supabase } from '../lib/supabase';
import type { PerfilUsuario, TipoConta } from '../lib/types';

interface SessionContextValue {
  session: Session | null;
  perfil: PerfilUsuario | null;
  tipo: TipoConta | null;
  loading: boolean;
  perfilLoading: boolean;
  perfilStale: boolean;
  erroPerfil: string | null;
  precisaOnboarding: boolean;
  recarregarPerfil: () => Promise<void>;
  encerrarSessao: () => Promise<void>;
  encerrarTodasAsSessoes: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function lerCachePerfil(): Promise<PerfilUsuario | null> {
  const cache = await cacheGet<PerfilUsuario>('perfil');
  return cache?.value ?? null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [perfilStale, setPerfilStale] = useState(false);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const perfilEmAndamento = useRef(false);

  const carregarPerfil = useCallback(async () => {
    if (perfilEmAndamento.current) return;
    perfilEmAndamento.current = true;
    setPerfilLoading(true);
    try {
      const dados = await meuPerfil();
      setPerfil(dados);
      setPerfilStale(false);
      setErroPerfil(null);
      await cacheSet('perfil', dados);
    } catch (erro) {
      const cache = await lerCachePerfil();
      if (cache) {
        setPerfil(cache);
        setPerfilStale(true);
        setErroPerfil(null);
      } else {
        setErroPerfil(mensagemErro(erro));
      }
    } finally {
      perfilEmAndamento.current = false;
      setPerfilLoading(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!ativo) return;
        setSession(data.session);
        if (data.session) {
          userIdRef.current = data.session.user.id;
          await carregarPerfil();
        }
      } catch {
        if (ativo) setErroPerfil('Não foi possível restaurar sua sessão.');
      } finally {
        if (ativo) setLoading(false);
      }
    })();

    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      if (!ativo) return;
      setSession(novaSessao);

      if (evento === 'SIGNED_OUT' || !novaSessao) {
        userIdRef.current = null;
        setPerfil(null);
        setPerfilStale(false);
        setErroPerfil(null);
        return;
      }

      if (userIdRef.current !== novaSessao.user.id) {
        userIdRef.current = novaSessao.user.id;
        void carregarPerfil();
        return;
      }

      if (evento === 'USER_UPDATED' || evento === 'TOKEN_REFRESHED') {
        void carregarPerfil();
      }
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => assinatura.remove();
  }, []);

  const usuarioId = perfil?.usuario?.id ?? session?.user.id ?? null;

  useEffect(() => {
    if (!usuarioId) return;
    let cancelado = false;
    prepararNotificacoes()
      .then((token) => {
        if (!token || cancelado) return;
        registrarDispositivo(usuarioId, token, Platform.OS).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  const recarregarPerfil = useCallback(async () => {
    await carregarPerfil();
  }, [carregarPerfil]);

  const encerrarSessao = useCallback(async () => {
    try {
      await sair();
    } catch {
      // Mesmo com falha de rede, encerramos a sessão local.
    } finally {
      await cacheClear();
      setPerfil(null);
      setPerfilStale(false);
      setErroPerfil(null);
      setSession(null);
      userIdRef.current = null;
    }
  }, []);

  const encerrarTodasAsSessoes = useCallback(async () => {
    await sairDeTodosOsDispositivos();
    await cacheClear();
    setPerfil(null);
    setPerfilStale(false);
    setErroPerfil(null);
    setSession(null);
    userIdRef.current = null;
  }, []);

  const tipo = (perfil?.usuario?.tipo ?? null) as TipoConta | null;
  const precisaOnboarding = tipo === 'profissional' && !perfil?.profissional;

  const valor = useMemo<SessionContextValue>(
    () => ({
      session,
      perfil,
      tipo,
      loading,
      perfilLoading,
      perfilStale,
      erroPerfil,
      precisaOnboarding,
      recarregarPerfil,
      encerrarSessao,
      encerrarTodasAsSessoes,
    }),
    [
      session,
      perfil,
      tipo,
      loading,
      perfilLoading,
      perfilStale,
      erroPerfil,
      precisaOnboarding,
      recarregarPerfil,
      encerrarSessao,
      encerrarTodasAsSessoes,
    ],
  );

  return <SessionContext.Provider value={valor}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession deve ser usado dentro de SessionProvider');
  return ctx;
}
