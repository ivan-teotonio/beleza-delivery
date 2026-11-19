import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { FormError } from '../../src/components/ErrorState';
import { ErroCooldownCodigo, solicitarCodigoAcesso } from '../../src/lib/api';
import { mensagemErro } from '../../src/lib/errors';
import { colors, radius, spacing } from '../../src/theme';

type TipoCadastro = 'cliente' | 'profissional';

export default function Cadastro() {
  const params = useLocalSearchParams<{ tipo?: string }>();
  const tipoInicial: TipoCadastro = params.tipo === 'profissional' ? 'profissional' : 'cliente';
  const [tipo, setTipo] = useState<TipoCadastro>(tipoInicial);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const ehProfissional = tipo === 'profissional';
  const titulo = useMemo(
    () => (ehProfissional ? 'Criar conta profissional' : 'Criar conta de cliente'),
    [ehProfissional],
  );

  async function enviar() {
    setErro(null);

    if (nome.trim().length < 2) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (!aceite) {
      setErro('É necessário aceitar o tratamento de dados para continuar.');
      return;
    }

    setCarregando(true);
    try {
      const resultado = await solicitarCodigoAcesso({
        nome: nome.trim(),
        email: email.trim(),
        tipo,
      });
      const parametros = new URLSearchParams({
        email: email.trim().toLowerCase(),
        nome: nome.trim(),
        tipo,
        origem: 'cadastro',
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

      <AppText variant="display">{titulo}</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        É só informar nome e e-mail. Enviaremos um código para você entrar — sem senha. Depois você completa seu perfil.
      </AppText>

      <View style={styles.tipos} accessibilityRole="tablist">
        {(['cliente', 'profissional'] as const).map((valor) => {
          const ativo = tipo === valor;
          return (
            <Pressable
              key={valor}
              onPress={() => setTipo(valor)}
              accessibilityRole="tab"
              accessibilityLabel={valor === 'cliente' ? 'Conta de cliente' : 'Conta de profissional'}
              accessibilityState={{ selected: ativo }}
              style={[styles.tipo, ativo && styles.tipoAtivo]}
            >
              <Ionicons
                name={valor === 'cliente' ? 'person-outline' : 'cut-outline'}
                size={18}
                color={ativo ? colors.textOnPrimary : colors.primary}
              />
              <AppText variant="label" color={ativo ? colors.textOnPrimary : colors.primary}>
                {valor === 'cliente' ? 'Cliente' : 'Profissional'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <FormError mensagem={erro} />

        <TextField
          label="Nome completo"
          required
          value={nome}
          onChangeText={setNome}
          placeholder="Seu nome"
          autoCapitalize="words"
          autoComplete="name"
          leftIcon="person-outline"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!carregando}
        />
        <TextField
          ref={emailRef}
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

        <Pressable
          onPress={() => setAceite((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityLabel="Aceito o tratamento dos meus dados pessoais conforme a LGPD"
          accessibilityState={{ checked: aceite }}
          style={styles.aceite}
        >
          <Ionicons
            name={aceite ? 'checkbox' : 'square-outline'}
            size={26}
            color={aceite ? colors.primary : colors.borderStrong}
          />
          <AppText variant="caption" style={styles.aceiteTexto}>
            Autorizo o uso dos meus dados para cadastro, busca, agendamento e comunicação, conforme a LGPD.
            Posso exportar ou excluir meus dados no meu perfil.
          </AppText>
        </Pressable>

        <Button
          label="Enviar código de acesso"
          onPress={() => void enviar()}
          loading={carregando}
          disabled={carregando}
          icon="checkmark-circle-outline"
          size="lg"
          style={styles.botao}
        />
      </Card>

      <Pressable
        onPress={() => router.replace('/entrar')}
        accessibilityRole="button"
        accessibilityLabel="Já tenho conta"
        style={styles.link}
      >
        <AppText variant="body" color={colors.textMuted}>
          Já tem conta?{' '}
          <AppText variant="bodyStrong" color={colors.primary}>
            Receber um código
          </AppText>
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  voltar: { width: 48, height: 48, justifyContent: 'center', marginBottom: spacing.sm },
  subtitulo: { marginTop: spacing.sm },
  tipos: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  tipo: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  tipoAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  aceite: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  aceiteTexto: { flex: 1 },
  botao: { marginTop: spacing.sm },
  link: { alignSelf: 'center', marginTop: spacing.xl, minHeight: 48, justifyContent: 'center' },
});
