import { useEffect, useState } from 'react';

/** Atrasa a atualização de um valor (ex.: busca enquanto digita). */
export function useDebounce<T>(valor: T, atrasoMs = 350): T {
  const [adiado, setAdiado] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setAdiado(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);

  return adiado;
}
