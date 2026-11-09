import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'beleza.fontscale';
const ESCALAS = [1, 1.15, 1.3] as const;

interface AccessibilityContextValue {
  fontScale: number;
  aumentar: () => void;
  diminuir: () => void;
  restaurar: () => void;
  podeAumentar: boolean;
  podeDiminuir: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    let ativo = true;
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((valor) => {
        if (!ativo || !valor) return;
        const numero = Number(valor);
        const encontrado = ESCALAS.indexOf(numero as (typeof ESCALAS)[number]);
        if (encontrado >= 0) setIndice(encontrado);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  const persistir = useCallback((novo: number) => {
    setIndice(novo);
    SecureStore.setItemAsync(STORAGE_KEY, String(ESCALAS[novo])).catch(() => undefined);
  }, []);

  const aumentar = useCallback(() => {
    setIndice((atual) => {
      const novo = Math.min(ESCALAS.length - 1, atual + 1);
      SecureStore.setItemAsync(STORAGE_KEY, String(ESCALAS[novo])).catch(() => undefined);
      return novo;
    });
  }, []);

  const diminuir = useCallback(() => {
    setIndice((atual) => {
      const novo = Math.max(0, atual - 1);
      SecureStore.setItemAsync(STORAGE_KEY, String(ESCALAS[novo])).catch(() => undefined);
      return novo;
    });
  }, []);

  const restaurar = useCallback(() => persistir(0), [persistir]);

  const valor = useMemo<AccessibilityContextValue>(
    () => ({
      fontScale: ESCALAS[indice],
      aumentar,
      diminuir,
      restaurar,
      podeAumentar: indice < ESCALAS.length - 1,
      podeDiminuir: indice > 0,
    }),
    [indice, aumentar, diminuir, restaurar],
  );

  return <AccessibilityContext.Provider value={valor}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility deve ser usado dentro de AccessibilityProvider');
  return ctx;
}
