import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { FormError } from '../../src/components/ErrorState';
import { Notice } from '../../src/components/Notice';
import { ErroCooldownCodigo, solicitarCodigoAcesso } from '../../src/lib/api';
import { mensagemErro } from '../../src/lib/errors';
import { colors, radius, spacing } from '../../src/theme';

const CONTAS_DEMO = [
  { rotulo: 'Cliente', email: 'ana.cliente@beleza.app' },
  { rotulo: 'Profissional', email: 'mariana@beleza.app' },
  { rotulo: 'Admin', email: 'admin@beleza.app' },
] as const;

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const modoDemo = process.env.EXPO_PUBLIC_ENABLE_DEMO === 'true';

  async function enviarCodigo(emailSolicitado = email) {
    setErro(null);
    if (!emailSolicitado.trim() || !emailSolicitado.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setCarregando(true);
    try {
      const resultado = await solicitarCodigoAcesso({
        nome: '',
        email: emailSolicitado,
        tipo: 'cliente',
      });
      const parametros = new URLSearchParams({
        email: emailSolicitado.trim().toLowerCase(),
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

  function preencher(contaEmail: string) {
    if (!modoDemo) return;
    setEmail(contaEmail);
    setErro(null);
  }

  return (
    <Screen keyboard contentContainerStyle={styles.conteudo}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="sparkles" size={36} color={colors.textOnPrimary} />
        </View>
        <AppText variant="display" center style={styles.titulo}>
          Beleza a Domicílio
        </AppText>
        <AppText variant="body" color={colors.textMuted} center>
          Cuidado e beleza perto de você, com acessibilidade e segurança.
        </AppText>
      </View>

      <Card>
        <AppText variant="subtitle" style={styles.secao}>
          Entrar na sua conta
        </AppText>
        <AppText variant="body" color={colors.textMuted} style={styles.descricao}>
          Informe seu e-mail. Enviaremos um código de acesso para você entrar — sem senha.
        </AppText>

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
          textContentType="emailAddress"
          leftIcon="mail-outline"
          returnKeyType="send"
          onSubmitEditing={() => void enviarCodigo()}
          editable={!carregando}
        />

        <Button
          label="Receber código"
          onPress={() => void enviarCodigo()}
          loading={carregando}
          disabled={carregando}
          icon="mail-outline"
          size="lg"
        />
      </Card>

      <View style={styles.criarConta}>
        <AppText variant="body" color={colors.textMuted}>
          Ainda não tem conta?
        </AppText>
        <Button
          label="Criar conta"
          onPress={() => router.push('/escolher-tipo')}
          variant="outline"
          fullWidth={false}
          icon="person-add-outline"
        />
      </View>

      {modoDemo ? (
        <>
          <Notice
            tone="info"
            title="Contas de demonstração"
            message="Toque em uma conta para preencher o e-mail. O código demo é 000000."
            style={styles.aviso}
          />
          <View style={styles.demoLinha}>
            {CONTAS_DEMO.map((conta) => (
              <Pressable
                key={conta.email}
                onPress={() => preencher(conta.email)}
                accessibilityRole="button"
                accessibilityLabel={`Preencher conta demo ${conta.rotulo}`}
                style={({ pressed }) => [styles.demo, pressed && { opacity: 0.8 }]}
              >
                <AppText variant="label" color={colors.primary}>
                  {conta.rotulo}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {conta.email}
                </AppText>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  titulo: { color: colors.primaryDark },
  secao: { marginBottom: spacing.sm },
  descricao: { marginBottom: spacing.lg },
  criarConta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xl,
  },
  aviso: { marginTop: spacing.xl, marginBottom: spacing.sm },
  demoLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  demo: {
    flexGrow: 1,
    flexBasis: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    minHeight: 64,
    justifyContent: 'center',
  },
});
