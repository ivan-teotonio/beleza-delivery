import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface RealtimeOptions {
  canal: string;
  tabela: 'mensagem' | 'agendamento';
  filtro?: string;
  evento?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  habilitado?: boolean;
  aoMudar: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

/**
 * Assina mudanças do Supabase Realtime (chat e status do agendamento).
 * A autorização é a mesma do RLS: o usuário só recebe as linhas permitidas.
 */
export function useRealtime({
  canal,
  tabela,
  filtro,
  evento = '*',
  habilitado = true,
  aoMudar,
}: RealtimeOptions) {
  const callbackRef = useRef(aoMudar);
  callbackRef.current = aoMudar;

  useEffect(() => {
    if (!habilitado) return;

    const channel = supabase
      .channel(canal)
      .on(
        'postgres_changes',
        {
          event: evento,
          schema: 'public',
          table: tabela,
          ...(filtro ? { filter: filtro } : {}),
        } as never,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          callbackRef.current(payload);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal, tabela, filtro, evento, habilitado]);
}
