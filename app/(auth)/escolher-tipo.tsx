import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { colors, radius, spacing } from '../../src/theme';

const TIPOS = [
  {
    tipo: 'cliente',
    titulo: 'Sou cliente',
    descricao: 'Quero encontrar profissionais de beleza que atendem em casa, com preço de deslocamento transparente.',
    icone: 'person-outline' as const,
  },
  {
    tipo: 'profissional',
    titulo: 'Sou profissional',
    descricao: 'Quero oferecer meus serviços a domicílio, definir minha agenda, portfólio e faixas de deslocamento.',
    icone: 'cut-outline' as const,
  },
];

export default function EscolherTipo() {
  return (
    <Screen contentContainerStyle={styles.conteudo}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={styles.voltar}
      >
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </Pressable>

      <AppText variant="display">Como você quer usar o app?</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Escolha o tipo de conta. Você poderá completar seu perfil depois.
      </AppText>

      <View style={styles.cards}>
        {TIPOS.map((item) => (
          <Card
            key={item.tipo}
            onPress={() => router.push(`/cadastro?tipo=${item.tipo}`)}
            accessibilityLabel={item.titulo}
            accessibilityHint={item.descricao}
            style={styles.card}
          >
            <View style={styles.icone}>
              <Ionicons name={item.icone} size={28} color={colors.primary} />
            </View>
            <View style={styles.cardTexto}>
              <AppText variant="subtitle">{item.titulo}</AppText>
              <AppText variant="caption" style={styles.descricao}>
                {item.descricao}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Card>
        ))}
      </View>

      <Notice
        tone="info"
        message="Profissionais passam por aprovação administrativa antes de aparecer na busca. Você receberá uma notificação quando tudo estiver pronto."
        style={styles.aviso}
      />

      <Button
        label="Já tenho conta"
        onPress={() => router.replace('/entrar')}
        variant="outline"
        icon="log-in-outline"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingTop: spacing.xl, justifyContent: 'center' },
  voltar: { width: 48, height: 48, justifyContent: 'center', marginBottom: spacing.md },
  subtitulo: { marginTop: spacing.sm },
  cards: { gap: spacing.md, marginTop: spacing.xl },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icone: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexto: { flex: 1 },
  descricao: { marginTop: spacing.xs },
  aviso: { marginTop: spacing.xl },
});
