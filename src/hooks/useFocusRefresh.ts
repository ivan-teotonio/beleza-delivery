import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

/** Executa uma atualização sempre que a tela volta ao foco. */
export function useFocusRefresh(callback: () => void | Promise<void>) {
  useFocusEffect(
    useCallback(() => {
      void callback();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [callback]),
  );
}
