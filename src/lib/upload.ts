import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { AppError } from './errors';
import { supabase } from './supabase';

export type BucketImagem = 'portfolio' | 'documentos';

export async function escolherImagem(opcoes?: {
  aspect?: [number, number];
  allowsEditing?: boolean;
}): Promise<string | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new AppError('Permita o acesso às suas fotos para enviar imagens.');
  }
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: opcoes?.allowsEditing ?? true,
    aspect: opcoes?.aspect ?? [1, 1],
    quality: 0.9,
  });
  if (resultado.canceled) return null;
  return resultado.assets[0]?.uri ?? null;
}

export async function comprimirImagem(
  uri: string,
  larguraMaxima = 1280,
  qualidade = 0.82,
): Promise<string> {
  const resultado = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: larguraMaxima } }],
    { compress: qualidade, format: ImageManipulator.SaveFormat.JPEG },
  );
  return resultado.uri;
}

function detectarTipoImagem(bytes: ArrayBuffer): { tipo: string; extensao: string } {
  const view = new Uint8Array(bytes);
  const magic = [view[0], view[1], view[2], view[3]];

  // JPEG: FF D8 FF
  if (magic[0] === 0xff && magic[1] === 0xd8 && magic[2] === 0xff) {
    return { tipo: 'image/jpeg', extensao: 'jpg' };
  }

  // PNG: 89 50 4E 47
  if (
    magic[0] === 0x89 &&
    magic[1] === 0x50 &&
    magic[2] === 0x4e &&
    magic[3] === 0x47
  ) {
    return { tipo: 'image/png', extensao: 'png' };
  }

  throw new AppError(
    'Arquivo não é uma imagem JPEG ou PNG válida. Selecione outra foto.',
  );
}

export async function enviarImagem(
  bucket: BucketImagem,
  caminho: string,
  uri: string,
): Promise<string> {
  try {
    const arquivo = new File(uri);
    const bytes = await arquivo.arrayBuffer();
    const { tipo, extensao } = detectarTipoImagem(bytes);

    const { error } = await supabase.storage.from(bucket).upload(caminho, bytes, {
      contentType: tipo,
      upsert: false,
      cacheControl: '3600',
    });
    if (error) throw new AppError(error.message);
    return caminho;
  } catch (erro) {
    if (erro instanceof AppError) throw erro;
    throw new AppError('Não foi possível enviar a imagem. Tente novamente.');
  }
}

export async function urlPublica(bucket: BucketImagem, caminho: string): Promise<string> {
  if (bucket === 'documentos') {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(caminho, 60 * 10);
    if (error || !data?.signedUrl) throw new AppError('Não foi possível abrir o documento.');
    return data.signedUrl;
  }
  return supabase.storage.from(bucket).getPublicUrl(caminho).data.publicUrl;
}
