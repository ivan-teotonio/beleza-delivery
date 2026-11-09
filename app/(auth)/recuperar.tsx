import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { FormError } from '../../src/components/ErrorState';
import { Notice } from '../../src/components/Notice';
import { recuperarSenha } from '../../src/lib/api';
import { mensagemErro } from '../../src/lib/errors';
import { colors, spacing } from '../../src/theme';

export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(null);
    if (!email.trim() || !email.includes('@')) {
      setErro('Informe o e-mail cadastrado.');
      return;
    }
    setCarregando(true);
    try {
      await recuperarSenha(email);
      setEnviado(true);
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Screen keyboard contentContainerStyle={styles.conteudo}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={styles.voltar}
      >
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </Pressable>

      <AppText variant="display">Recuperar senha</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Informe o e-mail da sua conta. Enviaremos um link seguro para você criar uma nova senha.
      </AppText>

      <Card style={styles.card}>
        <FormError mensagem={erro} />
        {enviado ? (
          <Notice
            tone="success"
            title="Link enviado"
            message={`Se existir uma conta para ${email.trim()}, você receberá um e-mail com instruções. Verifique também a caixa de spam.`}
          />
        ) : null}

        <TextField
          label="E-mail"
          required
          value={email}
          onChangeText={setEmail}
          placeholder="voce@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          leftIcon="mail-outline"
          returnKeyType="send"
          onSubmitEditing={() => void enviar()}
          editable={!carregando && !enviado}
        />

        <Button
          label={enviado ? 'Enviar novamente' : 'Enviar link de recuperação'}
          onPress={() => void enviar()}
          loading={carregando}
          disabled={carregando}
          icon="paper-plane-outline"
          size="lg"
        />

        <Button
          label="Voltar para o login"
          onPress={() => router.replace('/entrar')}
          variant="ghost"
          style={styles.secundario}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingTop: spacing.lg, justifyContent: 'center' },
  voltar: { width: 48, height: 48, justifyContent: 'center', marginBottom: spacing.sm },
  subtitulo: { marginTop: spacing.sm },
  card: { marginTop: spacing.xl },
  secundario: { marginTop: spacing.sm },
});
