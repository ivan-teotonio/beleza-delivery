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
import { ErroCooldownCodigo, solicitarCodigoAcesso } from '../../src/lib/api';
import { mensagemErro } from '../../src/lib/errors';
import { colors, spacing } from '../../src/theme';

export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(null);
    if (!email.trim() || !email.includes('@')) {
      setErro('Informe o e-mail cadastrado.');
      return;
    }
    setCarregando(true);
    try {
      const resultado = await solicitarCodigoAcesso({
        nome: '',
        email: email.trim(),
        tipo: 'cliente',
      });
      const parametros = new URLSearchParams({
        email: email.trim().toLowerCase(),
        origem: 'login',
        reenviar_em: String(resultado.reenviar_em ?? 60),
      });
      if (resultado.codigo_demo) parametros.set('demo', resultado.codigo_demo);
      router.push(`/codigo-acesso?${parametros.toString()}`);
    } catch (falha) {
      if (falha instanceof ErroCooldownCodigo) {
        setErro(`Aguarde ${falha.reenviarEm} s para receber outro código.`);
      } else {
        setErro(mensagemErro(falha));
      }
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

      <AppText variant="display">Receber código de acesso</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Informe o e-mail da sua conta. Enviaremos um novo código — não usamos senha.
      </AppText>

      <Card style={styles.card}>
        <FormError mensagem={erro} />

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
          editable={!carregando}
        />

        <Button
          label="Enviar código"
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
