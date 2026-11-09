import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { AppText } from '../src/components/AppText';
import { TextField } from '../src/components/TextField';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { FormError } from '../src/components/ErrorState';
import { Notice } from '../src/components/Notice';
import { Loading } from '../src/components/Loading';
import { definirNovaSenha, sair, trocarCodigoPorSessao } from '../src/lib/api';
import { mensagemErro } from '../src/lib/errors';
import { colors, spacing } from '../src/theme';
import { useToast } from '../src/providers/ToastProvider';

export default function RedefinirSenha() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [pronto, setPronto] = useState(false);
  const confirmarRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let ativo = true;
    (async () => {
      if (params.error_description) {
        if (ativo) {
          setErro('O link de recuperação expirou ou é inválido. Solicite um novo.');
          setCarregando(false);
        }
        return;
      }
      if (!params.code) {
        if (ativo) {
          setErro('Abra esta tela pelo link enviado ao seu e-mail.');
          setCarregando(false);
        }
        return;
      }
      try {
        await trocarCodigoPorSessao(String(params.code));
        if (ativo) setPronto(true);
      } catch (falha) {
        if (ativo) setErro(mensagemErro(falha));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [params.code, params.error_description]);

  async function salvar() {
    setErro(null);
    if (senha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.');
      return;
    }
    setCarregando(true);
    try {
      await definirNovaSenha(senha);
      await sair().catch(() => undefined);
      showToast('Senha alterada! Entre com a nova senha.');
      router.replace('/entrar');
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setCarregando(false);
    }
  }

  if (carregando && !pronto && !erro) {
    return (
      <Screen scroll={false}>
        <Loading mensagem="Validando seu link..." />
      </Screen>
    );
  }

  return (
    <Screen keyboard contentContainerStyle={styles.conteudo}>
      <AppText variant="display">Criar nova senha</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Escolha uma senha forte, com pelo menos 6 caracteres, que você ainda não use em outros sites.
      </AppText>

      <Card style={styles.card}>
        <FormError mensagem={erro} />
        {pronto ? (
          <>
            <TextField
              label="Nova senha"
              required
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoComplete="new-password"
              leftIcon="lock-closed-outline"
              returnKeyType="next"
              onSubmitEditing={() => confirmarRef.current?.focus()}
            />
            <TextField
              ref={confirmarRef}
              label="Confirmar nova senha"
              required
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry
              autoComplete="new-password"
              leftIcon="lock-closed-outline"
              returnKeyType="done"
              onSubmitEditing={() => void salvar()}
            />
            <Button
              label="Salvar nova senha"
              onPress={() => void salvar()}
              loading={carregando}
              icon="checkmark-circle-outline"
              size="lg"
            />
          </>
        ) : (
          <>
            <Notice
              tone="warning"
              message="Solicite um novo link em “Esqueci minha senha” na tela de entrar."
            />
            <Button label="Voltar para o login" onPress={() => router.replace('/entrar')} variant="outline" />
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingTop: spacing.xl, justifyContent: 'center' },
  subtitulo: { marginTop: spacing.sm },
  card: { marginTop: spacing.xl },
});
