import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkContextValue {
  online: boolean;
  verificado: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ online: true, verificado: false });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((estado) => {
      const conectado =
        estado.isConnected !== false && estado.isInternetReachable !== false;
      setOnline(conectado);
      setVerificado(true);
    });
    NetInfo.fetch()
      .then((estado) => {
        setOnline(estado.isConnected !== false && estado.isInternetReachable !== false);
        setVerificado(true);
      })
      .catch(() => setVerificado(true));
    return unsubscribe;
  }, []);

  const valor = useMemo(() => ({ online, verificado }), [online, verificado]);
  return <NetworkContext.Provider value={valor}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}
