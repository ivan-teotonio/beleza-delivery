import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { colors, radius, shadow, spacing } from '../theme';

type ToastTipo = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastContextValue {
  showToast: (mensagem: string, tipo?: ToastTipo, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const CORES: Record<ToastTipo, { fundo: string; texto: string; borda: string }> = {
  success: { fundo: colors.successBg, texto: colors.success, borda: colors.successBorder },
  error: { fundo: colors.dangerBg, texto: colors.danger, borda: colors.dangerBorder },
  info: { fundo: colors.infoBg, texto: colors.info, borda: colors.infoBorder },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ mensagem: string; tipo: ToastTipo; action?: ToastAction } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacidade = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const showToast = useCallback(
    (mensagem: string, tipo: ToastTipo = 'success', action?: ToastAction) => {
      if (!mensagem) return;
      if (timer.current) clearTimeout(timer.current);
      setToast({ mensagem, tipo, action });
      AccessibilityInfo.announceForAccessibility(mensagem);
      Animated.timing(opacidade, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacidade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 5000);
    },
    [opacidade],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const valor = useMemo(() => ({ showToast }), [showToast]);
  const cores = toast ? CORES[toast.tipo] : CORES.info;

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.container,
            { bottom: insets.bottom + spacing.xl, backgroundColor: cores.fundo, borderColor: cores.borda },
            { opacity: opacidade },
          ]}
        >
          <View style={styles.toastConteudo}>
            <AppText variant="bodyStrong" style={{ color: cores.texto }}>
              {toast.mensagem}
            </AppText>
            {toast.action ? (
              <TouchableOpacity
                onPress={toast.action.onPress}
                style={styles.toastAcao}
                hitSlop={8}
              >
                <AppText variant="button" style={{ color: cores.texto }}>
                  {toast.action.label}
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.floating,
    zIndex: 999,
  },
  toastConteudo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toastAcao: { marginLeft: spacing.md },
});
