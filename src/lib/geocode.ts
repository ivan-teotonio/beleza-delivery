import * as Location from 'expo-location';
import { AppError } from './errors';
import { onlyDigits } from './format';
import { geocodeGet, geocodeSet } from './offline/db';

export interface Coordenada {
  lat: number;
  lng: number;
  label?: string;
}

export interface DadosCep {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  lat?: number;
  lng?: number;
}

export async function buscarCep(cep: string): Promise<DadosCep> {
  const digitos = onlyDigits(cep);
  if (digitos.length !== 8) {
    throw new AppError('Informe um CEP com 8 dígitos.');
  }

  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${digitos}`);
    if (!resposta.ok) throw new Error('CEP não encontrado');
    const dados = (await resposta.json()) as {
      cep?: string;
      street?: string;
      neighborhood?: string;
      city?: string;
      location?: { coordinates?: { latitude?: number | string; longitude?: number | string } };
    };

    const lat = Number(dados.location?.coordinates?.latitude);
    const lng = Number(dados.location?.coordinates?.longitude);

    return {
      cep: digitos,
      rua: dados.street ?? '',
      bairro: dados.neighborhood ?? '',
      cidade: dados.city ?? '',
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    };
  } catch {
    throw new AppError(
      'Não foi possível consultar o CEP agora. Preencha o endereço manualmente e use sua localização atual.',
    );
  }
}

export async function geocodificarEndereco(texto: string): Promise<Coordenada> {
  const consulta = texto.trim();
  if (!consulta) throw new AppError('Informe o endereço para localizar.');

  const hash = `nominatim:${consulta.toLowerCase()}`;
  const emCache = await geocodeGet(hash);
  if (emCache) return { lat: emCache.lat, lng: emCache.lng, label: emCache.label ?? undefined };

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`;
  try {
    const resposta = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'pt-BR' },
    });
    if (!resposta.ok) throw new Error('Falha na geocodificação');
    const resultados = (await resposta.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    if (!resultados.length) throw new Error('Endereço não encontrado');
    const primeiro = resultados[0];
    const coordenada = {
      lat: Number(primeiro.lat),
      lng: Number(primeiro.lon),
      label: primeiro.display_name,
    };
    if (!Number.isFinite(coordenada.lat) || !Number.isFinite(coordenada.lng)) {
      throw new Error('Coordenadas inválidas');
    }
    await geocodeSet(hash, coordenada.lat, coordenada.lng, coordenada.label ?? null);
    return coordenada;
  } catch {
    throw new AppError(
      'Não foi possível localizar o endereço. Use "Usar minha localização atual" ou informe latitude e longitude.',
    );
  }
}

export async function localizacaoAtual(): Promise<Coordenada> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new AppError(
      'Permissão de localização negada. Você pode informar as coordenadas manualmente.',
    );
  }
  const posicao = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return {
    lat: posicao.coords.latitude,
    lng: posicao.coords.longitude,
    label: 'Minha localização atual',
  };
}

export interface EnderecoParaGeocodificar {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  lat?: number;
  lng?: number;
}

/**
 * Resolve as coordenadas de um endereço tentando, nesta ordem:
 * 1. coordenadas já conhecidas (CEP/localização);
 * 2. geocodificação do endereço completo;
 * 3. geocodificação do bairro + cidade.
 */
export async function resolverCoordenadas(endereco: EnderecoParaGeocodificar): Promise<Coordenada> {
  if (
    Number.isFinite(endereco.lat) &&
    Number.isFinite(endereco.lng) &&
    Number(endereco.lat) !== 0
  ) {
    return { lat: Number(endereco.lat), lng: Number(endereco.lng) };
  }

  const completo = [
    endereco.rua,
    endereco.numero,
    endereco.bairro,
    endereco.cidade,
    endereco.cep,
    'Brasil',
  ]
    .filter(Boolean)
    .join(', ');

  try {
    return await geocodificarEndereco(completo);
  } catch {
    return geocodificarEndereco(
      [endereco.bairro, endereco.cidade, endereco.cep, 'Brasil'].filter(Boolean).join(', '),
    );
  }
}
