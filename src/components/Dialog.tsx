import React from 'react';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, radius, shadow, spacing } from '../theme';

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  disabled?: boolean;
}

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  actions?: DialogAction[];
  dismissible?: boolean;
}

export function Dialog({
  visible,
  onClose,
  title,
  message,
  children,
  actions,
  dismissible = true,
}: DialogProps) {
  const insets = useSafeAreaInsets();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismissible ? onClose : undefined}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={dismissible ? onClose : undefined}
          accessibilityRole="button"
          accessibilityLabel="Fechar janela"
        />
        <View
          style={[styles.card, { marginBottom: Math.max(insets.bottom, spacing.lg) }]}
          accessibilityViewIsModal
          accessible={false}
        >
          <ScrollView
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppText variant="subtitle">{title}</AppText>
            {message ? (
              <AppText variant="body" color={colors.textMuted} style={styles.mensagem}>
                {message}
              </AppText>
            ) : null}
            {children ? <View style={styles.children}>{children}</View> : null}
          </ScrollView>
          {actions && actions.length > 0 ? (
            <View style={styles.acoes}>
              {actions.map((acao) => (
                <Button
                  key={acao.label}
                  label={acao.label}
                  onPress={acao.onPress}
                  variant={acao.variant ?? 'primary'}
                  loading={acao.loading}
                  disabled={acao.disabled}
                  style={styles.acao}
                />
              ))}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: '86%',
    ...shadow.floating,
  },
  conteudo: { padding: spacing.lg, gap: spacing.sm },
  mensagem: { marginTop: spacing.xs },
  children: { marginTop: spacing.sm },
  acoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  acao: { flexGrow: 1, flexBasis: 120, alignSelf: 'auto' },
});
