import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { Card } from '../../src/components/Card';
import { AppText } from '../../src/components/AppText';
import { salvarEndereco } from '../../src/lib/api';
import { buscarCep, localizacaoAtual, resolverCoordenadas } from '../../src/lib/geocode';
import { formatCep, onlyDigits } from '../../src/lib/format';
import { mensagemErro } from '../../src/lib/errors';
import { useNetwork } from '../../src/providers/NetworkProvider';
import { useSession } from '../../src/providers/SessionProvider';
import { useToast } from '../../src/providers/ToastProvider';
import { spacing } from '../../src/theme';

export default function Endereco() {
  const { perfil, recarregarPerfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();

  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const endereco = perfil?.endereco;
    if (!endereco) return;
    setCep(formatCep(endereco.cep));
    setRua(endereco.rua);
    setNumero(endereco.numero);
    setComplemento(endereco.complemento ?? '');
    setBairro(endereco.bairro);
    setCidade(endereco.cidade);
    if (perfil?.endereco_lat != null && perfil?.endereco_lng != null) {
      setCoords({ lat: perfil.endereco_lat, lng: perfil.endereco_lng });
    }
  }, [perfil?.endereco?.id]);

  async function consultarCep() {
    const digitos = onlyDigits(cep);
    if (digitos.length !== 8) {
      setErro('Informe um CEP com 8 dígitos para consultar.');
      return;
    }
    setErro(null);
    setBuscandoCep(true);
    try {
      const dados = await buscarCep(digitos);
      setCep(formatCep(dados.cep));
      if (dados.rua) setRua(dados.rua);
      if (dados.bairro) setBairro(dados.bairro);
      if (dados.cidade) setCidade(dados.cidade);
      if (dados.lat != null && dados.lng != null) {
        setCoords({ lat: dados.lat, lng: dados.lng });
      }
      showToast('CEP encontrado. Confira os dados antes de salvar.');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setBuscandoCep(false);
    }
  }

  async function usarLocalizacao() {
    setErro(null);
    setLocalizando(true);
    try {
      const local = await localizacaoAtual();
      setCoords({ lat: local.lat, lng: local.lng });
      showToast('Localização atual capturada.');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setLocalizando(false);
    }
  }

  function validar(): string | null {
    if (onlyDigits(cep).length !== 8) return 'Informe um CEP válido.';
    if (rua.trim().length < 2) return 'Informe a rua.';
    if (numero.trim().length < 1) return 'Informe o número.';
    if (bairro.trim().length < 2) return 'Informe o bairro.';
    if (cidade.trim().length < 2) return 'Informe a cidade.';
    return null;
  }

  async function salvar() {
    setErro(null);
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    if (!online) {
      setErro('Conecte-se à internet para salvar seu endereço.');
      return;
    }

    setSalvando(true);
    try {
      let local = coords;
      if (!local) {
        local = await resolverCoordenadas({
          cep: onlyDigits(cep),
          rua: rua.trim(),
          numero: numero.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
        });
      }

      await salvarEndereco({
        cep: onlyDigits(cep),
        rua: rua.trim(),
        numero: numero.trim(),
        complemento: complemento.trim(),
        bairro: bairro.trim(),
        cidade: cidade.trim(),
        lat: local.lat,
        lng: local.lng,
      });
      await recarregarPerfil();
      showToast('Endereço salvo com sucesso.');
      router.back();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Screen
      keyboard
      footer={
        <Button
          label="Salvar endereço"
          onPress={() => void salvar()}
          loading={salvando}
          disabled={salvando}
          icon="save-outline"
          size="lg"
        />
      }
    >
      <PageHeader
        title="Meu endereço"
        subtitle="Usado para calcular distância, deslocamento e atendimento"
      />

      <Notice
        tone="info"
        message="O endereço completo só é compartilhado com o profissional após a confirmação do agendamento."
      />

      {erro ? <Notice tone="danger" message={erro} /> : null}

      <TextField
        label="CEP"
        required
        value={cep}
        onChangeText={(v) => setCep(formatCep(v))}
        placeholder="00000-000"
        keyboardType="number-pad"
        maxLength={9}
        leftIcon="mail-outline"
      />
      <View style={styles.linhaBotoes}>
        <Button
          label={buscandoCep ? 'Consultando...' : 'Consultar CEP'}
          onPress={() => void consultarCep()}
          variant="secondary"
          icon="search-outline"
          loading={buscandoCep}
          disabled={buscandoCep}
          fullWidth={false}
        />
        <Button
          label={localizando ? 'Localizando...' : 'Usar localização atual'}
          onPress={() => void usarLocalizacao()}
          variant="outline"
          icon="navigate-outline"
          loading={localizando}
          disabled={localizando}
          fullWidth={false}
        />
      </View>

      <TextField label="Rua" required value={rua} onChangeText={setRua} placeholder="Nome da rua" />
      <TextField
        label="Número"
        required
        value={numero}
        onChangeText={setNumero}
        placeholder="123"
        keyboardType="default"
      />
      <TextField
        label="Complemento (opcional)"
        value={complemento}
        onChangeText={setComplemento}
        placeholder="Apto, bloco, referência"
      />
      <TextField label="Bairro" required value={bairro} onChangeText={setBairro} placeholder="Bairro" />
      <TextField label="Cidade" required value={cidade} onChangeText={setCidade} placeholder="Cidade" />

      {coords ? (
        <Card style={styles.coords}>
          <AppText variant="bodyStrong">Localização definida</AppText>
          <AppText variant="caption">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
          </AppText>
        </Card>
      ) : (
        <AppText variant="caption">
          Se o CEP não trouxer coordenadas, usaremos sua localização atual ou geocodificação ao salvar.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  linhaBotoes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  coords: { gap: 2 },
});
