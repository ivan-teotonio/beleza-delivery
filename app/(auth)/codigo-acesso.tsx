import React, { useEffect, useRef, useState } from 'react';
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
import {
  ErroCooldownCodigo,
  entrarComCodigo,
  meuPerfil,
  solicitarCodigoAcesso,
} from '../../src/lib/api';
import { codigoEhValido } from '../../src/lib/codigoAcesso';
import { mensagemErro } from '../../src/lib/errors';
import { rotaInicial } from '../../src/lib/routes';
import { useSession } from '../../src/providers/SessionProvider';
import { useToast } from '../../src/providers/ToastProvider';
import { colors, spacing } from '../../src/theme';

export default function CodigoAcesso() {
  const params = useLocalSearchParams<{
    email?: string;
    nome?: string;
    tipo?: string;
    origem?: string;
    reenviar_em?: string;
    demo?: string;
  }>();
  const email = params.email ?? '';
  const nome = params.nome ?? '';
  const tipo = params.tipo === 'profissional' ? 'profissional' : 'cliente';

  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [segundos, setSegundos] = useState(Number(params.reenviar_em ?? 60) || 60);
  const codigoRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const { recarregarPerfil } = useSession();
  const { showToast } = useToast();

  useEffect(() => {
    if (segundos <= 0) return;
    const temporizador = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(temporizador);
  }, [segundos]);

  async function entrar() {
    setErro(null);
    if (!codigoEhValido(codigo)) {
      setErro('Digite os 6 dígitos do código recebido.');
      return;
    }
    setCarregando(true);
    try {
      await entrarComCodigo(email, codigo);
      const perfil = await meuPerfil();
      await recarregarPerfil();
      showToast(
        `Bem-vindo(a), ${perfil.cliente?.nome?.split(' ')[0] ?? perfil.profissional?.nome?.split(' ')[0] ?? 'você'}!`,
      );
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

  async function reenviar() {
    setErro(null);
    setReenviando(true);
    try {
      const resultado = await solicitarCodigoAcesso({ nome, email, tipo });
      setSegundos(resultado.reenviar_em ?? 60);
      setCodigo('');
      codigoRef.current?.focus();
      showToast('Novo código enviado ao seu e-mail.');
    } catch (falha) {
      if (falha instanceof ErroCooldownCodigo) {
        setSegundos(falha.reenviarEm);
        setErro(`Aguarde ${falha.reenviarEm} s para receber outro código.`);
      } else {
        setErro(mensagemErro(falha));
      }
    } finally {
      setReenviando(false);
    }
  }

  return (
    <Screen keyboard contentContainerStyle={styles.conteudo}>
      <Pressable
        onPress={() => router.replace('/entrar')}
        accessibilityRole="button"
        accessibilityLabel="Voltar para o login"
        style={styles.voltar}
      >
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </Pressable>

      <View style={styles.icone}>
        <Ionicons name="mail-open-outline" size={34} color={colors.primary} />
      </View>
      <AppText variant="display">Digite o código</AppText>
      <AppText variant="body" color={colors.textMuted} style={styles.subtitulo}>
        Enviamos um código de 6 dígitos para {' '}
        <AppText variant="bodyStrong" color={colors.primary}>
          {email}
        </AppText>
        . Ele é válido por 1 ano e pode ser usado apenas uma vez.
      </AppText>

      {params.demo ? (
        <Notice
          tone="info"
          title="Modo demonstração"
          message={`Código demo: ${params.demo}`}
          style={styles.aviso}
        />
      ) : null}

      <Card style={styles.card}>
        <FormError mensagem={erro} />

        <TextField
          ref={codigoRef}
          label="Código de acesso"
          required
          value={codigo}
          onChangeText={(texto) => setCodigo(texto.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          leftIcon="key-outline"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={() => void entrar()}
          editable={!carregando}
          helper="Verifique também a caixa de spam."
        />

        <Button
          label="Entrar"
          onPress={() => void entrar()}
          loading={carregando}
          disabled={carregando}
          icon="log-in-outline"
          size="lg"
        />

        <Pressable
          onPress={() => void reenviar()}
          disabled={segundos > 0 || reenviando}
          accessibilityRole="button"
          accessibilityLabel="Reenviar código de acesso"
          accessibilityState={{ disabled: segundos > 0 || reenviando }}
          style={[styles.reenviar, segundos > 0 && styles.reenviarDesativado]}
        >
          <AppText variant="label" color={segundos > 0 ? colors.textMuted : colors.primary}>
            {segundos > 0 ? `Reenviar em ${segundos} s` : 'Reenviar código'}
          </AppText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  voltar: { width: 48, height: 48, justifyContent: 'center' },
  icone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  subtitulo: { marginTop: spacing.sm },
  aviso: { marginTop: spacing.lg },
  card: { marginTop: spacing.xl },
  reenviar: { alignSelf: 'center', minHeight: 48, justifyContent: 'center', marginTop: spacing.sm },
  reenviarDesativado: { opacity: 0.7 },
});
