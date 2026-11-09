import { useCallback, useEffect, useRef, useState } from 'react';
import { mensagemErro } from '../lib/errors';
import { cacheGet, cacheSet } from '../lib/offline/db';

export interface UseQueryOptions {
  /** Chave de cache local. Sem chave, não há leitura offline. */
  cacheKey?: string;
  enabled?: boolean;
}

export interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
  updatedAt: string | null;
  refresh: () => Promise<void>;
  setData: (dados: T | null) => void;
}

/**
 * Consulta com stale-while-revalidate: mostra o cache local na hora e
 * revalida no Supabase; em erro de rede mantém o cache e sinaliza "stale".
 */
export function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseQueryOptions = {},
): UseQueryResult<T> {
  const { cacheKey, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const emAndamento = useRef(false);
  const montado = useRef(true);

  const buscar = useCallback(async (chave: string) => {
    if (!enabled || emAndamento.current) return;
    emAndamento.current = true;
    try {
      const valor = await fetcherRef.current();
      if (!montado.current || keyRef.current !== chave) return;
      setData(valor);
      setError(null);
      setStale(false);
      setUpdatedAt(new Date().toISOString());
      if (cacheKeyRef.current) {
        await cacheSet(cacheKeyRef.current, valor);
      }
    } catch (erro) {
      if (!montado.current || keyRef.current !== chave) return;
      const cache = cacheKeyRef.current ? await cacheGet<T>(cacheKeyRef.current) : null;
      if (cache) {
        setData(cache.value);
        setStale(true);
        setUpdatedAt(cache.updatedAt);
        setError(null);
      } else {
        setError(mensagemErro(erro));
      }
    } finally {
      emAndamento.current = false;
      if (montado.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    montado.current = true;
    let ativo = true;
    const chave = key;

    if (!enabled) {
      setLoading(false);
      return () => {
        ativo = false;
        montado.current = false;
      };
    }

    setLoading(true);
    setError(null);

    (async () => {
      if (cacheKey) {
        const cache = await cacheGet<T>(cacheKey);
        if (ativo && cache && keyRef.current === chave) {
          setData(cache.value);
          setStale(true);
          setUpdatedAt(cache.updatedAt);
          setLoading(false);
        }
      }
      if (ativo) await buscar(chave);
    })();

    return () => {
      ativo = false;
      montado.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, cacheKey]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await buscar(keyRef.current);
    if (montado.current) setRefreshing(false);
  }, [buscar]);

  return { data, loading, refreshing, stale, error, updatedAt, refresh, setData };
}
