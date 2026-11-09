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
import { Notice } from '../../src/components/Notice';
import { cadastrar, entrar } from '../../src/lib/api';
import { mensagemErro } from '../../src/lib/errors';
import { formatPhone, onlyDigits } from '../../src/lib/format';
import { useSession } from '../../src/providers/SessionProvider';
import { useToast } from '../../src/providers/ToastProvider';
import { colors, radius, spacing } from '../../src/theme';

type TipoCadastro = 'cliente' | 'profissional';

export default function Cadastro() {
  const params = useLocalSearchParams<{ tipo?: string }>();
  const tipoInicial: TipoCadastro = params.tipo === 'profissional' ? 'profissional' : 'cliente';
  const [tipo, setTipo] = useState<TipoCadastro>(tipoInicial);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const telefoneRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const senhaRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmarRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const { recarregarPerfil } = useSession();
  const { showToast } = useToast();

  const ehProfissional = tipo === 'profissional';
  const titulo = useMemo(
    () => (ehProfissional ? 'Criar conta profissional' : 'Criar conta de cliente'),
    [ehProfissional],
  );

  async function enviar() {
    setErro(null);
    setSucesso(null);

    if (nome.trim().length < 2) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErro('Informe um e-mail válido.');
      return;
    }
    if (onlyDigits(telefone).length < 10) {
      setErro('Informe um telefone com DDD.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }
    if (!aceite) {
      setErro('É necessário aceitar o tratamento de dados para continuar.');
      return;
    }

    setCarregando(true);
    try {
      const resultado = await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        telefone: onlyDigits(telefone),
        senha,
        tipo,
      });

      let temSessao = Boolean(resultado.session);
      if (!temSessao) {
        try {
          const login = await entrar(email, senha);
          temSessao = Boolean(login.session);
        } catch {
          temSessao = false;
        }
      }

      if (!temSessao) {
        setSucesso(
          'Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre no app.',
        );
        return;
      }

      void recarregarPerfil();
      showToast('Conta criada com sucesso!');

      if (ehProfissional) {
        router.replace('/onboarding-profissional');
      } else {
        router.replace('/inicio');
      }
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

      <AppText variant="display">{titulo}</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        {ehProfissional
          ? 'Primeiro criamos seu acesso. Em seguida você completa foto, documentos, serviços e deslocamento.'
          : 'Leva menos de um minuto. Você poderá cadastrar seu endereço depois.'}
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
        {sucesso ? <Notice tone="success" message={sucesso} /> : null}

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
          returnKeyType="next"
          onSubmitEditing={() => telefoneRef.current?.focus()}
          editable={!carregando}
        />
        <TextField
          ref={telefoneRef}
          label="Telefone com DDD"
          required
          value={telefone}
          onChangeText={(texto) => setTelefone(formatPhone(texto))}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
          autoComplete="tel"
          leftIcon="call-outline"
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
          placeholder="Mínimo de 6 caracteres"
          secureTextEntry
          autoComplete="new-password"
          leftIcon="lock-closed-outline"
          returnKeyType="next"
          onSubmitEditing={() => confirmarRef.current?.focus()}
          editable={!carregando}
        />
        <TextField
          ref={confirmarRef}
          label="Confirmar senha"
          required
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          placeholder="Repita a senha"
          secureTextEntry
          autoComplete="new-password"
          leftIcon="lock-closed-outline"
          returnKeyType="done"
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
          label={ehProfissional ? 'Criar conta e continuar' : 'Criar conta'}
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
          Já tenho conta?{' '}
          <AppText variant="bodyStrong" color={colors.primary}>
            Entrar
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
