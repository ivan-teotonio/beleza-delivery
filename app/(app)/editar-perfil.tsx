import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PageHeader } from '../../src/components/PageHeader';
import { TextField } from '../../src/components/TextField';
import { Button } from '../../src/components/Button';
import { Notice } from '../../src/components/Notice';
import { Avatar } from '../../src/components/Avatar';
import {
  atualizarDadosCliente,
  atualizarFotoProfissional,
  atualizarPerfilProfissional,
} from '../../src/lib/api';
import { comprimirImagem, enviarImagem, escolherImagem, urlPublica } from '../../src/lib/upload';
import { localizacaoAtual } from '../../src/lib/geocode';
import { formatPhone, onlyDigits } from '../../src/lib/format';
import { mensagemErro } from '../../src/lib/errors';
import { useNetwork } from '../../src/providers/NetworkProvider';
import { useSession } from '../../src/providers/SessionProvider';
import { useToast } from '../../src/providers/ToastProvider';
import { spacing } from '../../src/theme';

export default function EditarPerfil() {
  const { perfil, tipo, recarregarPerfil } = useSession();
  const { online } = useNetwork();
  const { showToast } = useToast();

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [descricao, setDescricao] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [prazo, setPrazo] = useState('24');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [fotoLoading, setFotoLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!perfil) return;
    if (tipo === 'profissional' && perfil.profissional) {
      const p = perfil.profissional;
      setNome(p.nome);
      setTelefone(formatPhone(p.telefone ?? ''));
      setDescricao(p.descricao ?? '');
      setBairro(p.endereco_ref_bairro);
      setCidade(p.endereco_ref_cidade);
      setPrazo(String(p.prazo_resposta_h ?? 24));
      setFotoUrl(p.foto_url);
      setLat(perfil.profissional_lat);
      setLng(perfil.profissional_lng);
    } else if (perfil.cliente) {
      setNome(perfil.cliente.nome);
      setTelefone(formatPhone(perfil.cliente.telefone ?? ''));
    }
  }, [perfil, tipo]);

  async function trocarFoto() {
    if (!online) {
      showToast('Conecte-se à internet para atualizar sua foto.', 'error');
      return;
    }
    const uid = perfil?.usuario?.id;
    if (!uid) return;
    setFotoLoading(true);
    try {
      const uri = await escolherImagem({ aspect: [1, 1], allowsEditing: true });
      if (!uri) return;
      const comprimida = await comprimirImagem(uri, 800, 0.82);
      const caminho = `${uid}/perfil-${Date.now()}.jpg`;
      await enviarImagem('portfolio', caminho, comprimida);
      const publica = await urlPublica('portfolio', caminho);
      await atualizarFotoProfissional(publica);
      setFotoUrl(publica);
      await recarregarPerfil();
      showToast('Foto atualizada.');
    } catch (e) {
      showToast(mensagemErro(e), 'error');
    } finally {
      setFotoLoading(false);
    }
  }

  async function capturarLocalizacao() {
    try {
      const local = await localizacaoAtual();
      setLat(local.lat);
      setLng(local.lng);
      showToast('Localização de referência atualizada.');
    } catch (e) {
      showToast(mensagemErro(e), 'error');
    }
  }

  async function salvar() {
    setErro(null);
    if (!online) {
      setErro('Conecte-se à internet para salvar seu perfil.');
      return;
    }
    if (nome.trim().length < 2) {
      setErro('Informe seu nome completo.');
      return;
    }

    setSalvando(true);
    try {
      if (tipo === 'profissional') {
        if (!bairro.trim() || !cidade.trim()) {
          setErro('Informe bairro e cidade de referência.');
          setSalvando(false);
          return;
        }
        if (lat == null || lng == null) {
          setErro('Defina a localização de referência para calcular deslocamentos.');
          setSalvando(false);
          return;
        }
        const prazoNum = Number.parseInt(prazo, 10);
        await atualizarPerfilProfissional({
          nome: nome.trim(),
          telefone: onlyDigits(telefone),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          lat,
          lng,
          descricao: descricao.trim(),
          prazo_resposta_h: Number.isFinite(prazoNum) ? Math.min(72, Math.max(1, prazoNum)) : 24,
        });
      } else {
        await atualizarDadosCliente(nome.trim(), onlyDigits(telefone));
      }
      await recarregarPerfil();
      showToast('Perfil atualizado.');
      router.back();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const titulo = tipo === 'profissional' ? 'Editar perfil profissional' : 'Editar perfil';

  return (
    <Screen
      keyboard
      footer={
        <Button
          label="Salvar alterações"
          onPress={() => void salvar()}
          loading={salvando}
          disabled={salvando}
          icon="save-outline"
          size="lg"
        />
      }
    >
      <PageHeader title={titulo} />

      {erro ? <Notice tone="danger" message={erro} /> : null}

      {tipo === 'profissional' ? (
        <View style={styles.fotoBloco}>
          <Avatar nome={nome || 'Profissional'} uri={fotoUrl} size={96} />
          <Button
            label={fotoLoading ? 'Enviando...' : 'Trocar foto'}
            onPress={() => void trocarFoto()}
            variant="outline"
            icon="camera-outline"
            loading={fotoLoading}
            disabled={fotoLoading}
            fullWidth={false}
          />
        </View>
      ) : null}

      <TextField label="Nome completo" required value={nome} onChangeText={setNome} />
      <TextField
        label="Telefone"
        value={telefone}
        onChangeText={(v) => setTelefone(formatPhone(v))}
        placeholder="(00) 00000-0000"
        keyboardType="phone-pad"
        maxLength={15}
      />

      {tipo === 'profissional' ? (
        <>
          <TextField
            label="Descrição"
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Conte sobre seu trabalho e especialidades"
            multiline
            maxLength={600}
          />
          <TextField label="Bairro de referência" required value={bairro} onChangeText={setBairro} />
          <TextField label="Cidade de referência" required value={cidade} onChangeText={setCidade} />
          <TextField
            label="Prazo para responder (horas)"
            value={prazo}
            onChangeText={setPrazo}
            keyboardType="number-pad"
            helper="Tempo máximo para aceitar ou recusar solicitações (1 a 72 horas)."
          />
          <View style={styles.localLinha}>
            <Button
              label={lat != null ? 'Atualizar localização de referência' : 'Definir localização de referência'}
              onPress={() => void capturarLocalizacao()}
              variant="secondary"
              icon="navigate-outline"
              fullWidth={false}
            />
          </View>
          {lat != null && lng != null ? (
            <Notice tone="success" message={`Localização definida: ${lat.toFixed(5)}, ${lng.toFixed(5)}`} />
          ) : (
            <Notice
              tone="warning"
              message="A localização de referência é necessária para calcular a distância até os clientes."
            />
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fotoBloco: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  localLinha: { marginBottom: spacing.md, alignItems: 'flex-start' },
});
