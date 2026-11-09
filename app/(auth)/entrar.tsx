import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { FormError } from '../../src/components/ErrorState';
import { Notice } from '../../src/components/Notice';
import { entrar, meuPerfil } from '../../src/lib/api';
import { mensagemErro } from '../../src/lib/errors';
import { rotaInicial } from '../../src/lib/routes';
import { colors, radius, spacing } from '../../src/theme';
import { useSession } from '../../src/providers/SessionProvider';
import { useToast } from '../../src/providers/ToastProvider';

const CONTAS_DEMO = [
  { rotulo: 'Cliente', email: 'ana.cliente@beleza.app' },
  { rotulo: 'Profissional', email: 'mariana@beleza.app' },
  { rotulo: 'Admin', email: 'admin@beleza.app' },
] as const;

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const senhaRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const { recarregarPerfil } = useSession();
  const { showToast } = useToast();

  async function acessar(entrarEmail = email, entrarSenha = senha) {
    setErro(null);
    if (!entrarEmail.trim() || !entrarEmail.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (entrarSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setCarregando(true);
    try {
      await entrar(entrarEmail, entrarSenha);
      const perfil = await meuPerfil();
      await recarregarPerfil();
      showToast(`Bem-vindo(a), ${perfil.cliente?.nome?.split(' ')[0] ?? perfil.profissional?.nome?.split(' ')[0] ?? 'você'}!`);
      router.replace(
        rotaInicial(
          perfil.usuario?.tipo ?? null,
          perfil.usuario?.tipo === 'profissional' && !perfil.profissional,
        ),
      );
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setCarregando(false);
    }
  }

  function preencher(contaEmail: string) {
    setEmail(contaEmail);
    setSenha('Beleza@123');
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
          returnKeyType="next"
          onSubmitEditing={() => senhaRef.current?.focus()}
          editable={!carregando}
        />
        <TextField
          ref={senhaRef}
          label="Senha"
          required
          value={senha}
          onChangeText={setSenha}
          placeholder="Sua senha"
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          leftIcon="lock-closed-outline"
          returnKeyType="go"
          onSubmitEditing={() => void acessar()}
          editable={!carregando}
        />

        <Button
          label="Entrar"
          onPress={() => void acessar()}
          loading={carregando}
          disabled={carregando}
          icon="log-in-outline"
          size="lg"
        />

        <Pressable
          onPress={() => router.push('/recuperar')}
          accessibilityRole="button"
          accessibilityLabel="Esqueci minha senha"
          style={styles.link}
        >
          <AppText variant="label" color={colors.primary}>
            Esqueci minha senha
          </AppText>
        </Pressable>
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

      <Notice
        tone="info"
        title="Contas de demonstração"
        message="Toque em uma conta para preencher o e-mail e a senha padrão (Beleza@123)."
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
  secao: { marginBottom: spacing.lg },
  link: { alignSelf: 'center', minHeight: 48, justifyContent: 'center', marginTop: spacing.sm },
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
