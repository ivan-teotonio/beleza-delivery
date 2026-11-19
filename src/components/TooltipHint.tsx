import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { colors, spacing } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

export interface TooltipHintProps {
  /** Texto explicativo exibido no dialog. */
  message: string;
  /** Título curto do dialog. */
  title?: string;
  /** Ícone do Ionicons para o botão de ajuda. */
  helpIcon?: IconName;
  /** Quando verdadeiro, o botão de ajuda fica oculto (tooltip já visto/dispensado). */
  dismissed?: boolean;
  onDismiss?: () => void;
}

export function TooltipHint({
  message,
  title = 'Saiba mais',
  helpIcon = 'help-circle-outline',
  dismissed = false,
  onDismiss,
}: TooltipHintProps) {
  const [visivel, setVisivel] = React.useState(false);

  if (dismissed) return null;

  return (
    <View style={styles.wrapper}>
      <Button
        label={helpIcon ? '?' : 'Ajuda'}
        icon={helpIcon}
        variant="ghost"
        size="md"
        fullWidth={false}
        onPress={() => setVisivel(true)}
        style={styles.botaoAjuda}
        accessibilityLabel="Ajuda"
        accessibilityHint={message}
      />
      <Dialog
        visible={visivel}
        onClose={() => setVisivel(false)}
        title={title}
        dismissible
        actions={[
          {
            label: 'Entendi',
            onPress: () => {
              setVisivel(false);
              onDismiss?.();
            },
            variant: 'ghost',
          },
        ]}
      >
        <AppText variant="body" color={colors.text}>
          {message}
        </AppText>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'flex-start' },
  botaoAjuda: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
});
