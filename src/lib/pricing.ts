/**
 * Regras puras de precificação de deslocamento (SPEC §6.2/6.3, RF28/RN10).
 * O servidor é a autoridade final (RPC `solicitar_agendamento`); este módulo
 * serve para pré-visualização e testes de regressão.
 */

export interface FaixaDeslocamento {
  id?: string;
  limite_km: number;
  valor_centavos: number;
  ordem?: number;
}

export interface ResultadoFaixa {
  disponivel: boolean;
  distanciaKm: number;
  faixa?: FaixaDeslocamento;
  valorDeslocamentoCentavos?: number;
  motivo?: string;
}

export function selecionarFaixa(
  distanciaKm: number,
  faixas: readonly FaixaDeslocamento[],
  distanciaMaximaKm: number,
): ResultadoFaixa {
  const distancia = Number(distanciaKm);
  const maxima = Number(distanciaMaximaKm);

  if (!Number.isFinite(distancia) || distancia < 0) {
    return { disponivel: false, distanciaKm: distancia, motivo: 'Distância inválida' };
  }
  if (!Number.isFinite(maxima) || maxima <= 0) {
    return {
      disponivel: false,
      distanciaKm: distancia,
      motivo: 'Profissional não configurou a distância máxima',
    };
  }
  if (distancia > maxima) {
    return {
      disponivel: false,
      distanciaKm: distancia,
      motivo: 'Profissional não atende tão longe',
    };
  }

  const ordenadas = [...faixas]
    .filter((f) => Number.isFinite(Number(f.limite_km)) && Number.isFinite(Number(f.valor_centavos)))
    .sort((a, b) => Number(a.limite_km) - Number(b.limite_km));

  for (const faixa of ordenadas) {
    if (distancia <= Number(faixa.limite_km)) {
      return {
        disponivel: true,
        distanciaKm: distancia,
        faixa,
        valorDeslocamentoCentavos: Number(faixa.valor_centavos),
      };
    }
  }

  return {
    disponivel: false,
    distanciaKm: distancia,
    motivo: 'Faixa de deslocamento indisponível',
  };
}

export function calcularTotal(
  precoServicoCentavos: number,
  valorDeslocamentoCentavos: number,
): number {
  return Math.max(0, Math.round(precoServicoCentavos)) + Math.max(0, Math.round(valorDeslocamentoCentavos));
}

/**
 * Valida a configuração de faixas (RN11/RN12). Retorna a lista de erros em
 * português; lista vazia significa configuração válida.
 */
export function validarFaixas(
  distanciaMaximaKm: number,
  faixas: readonly FaixaDeslocamento[],
): string[] {
  const erros: string[] = [];
  const maxima = Number(distanciaMaximaKm);

  if (!Number.isFinite(maxima) || maxima <= 0 || maxima > 100) {
    erros.push('Informe uma distância máxima entre 0 e 100 km.');
  }
  if (faixas.length === 0) {
    erros.push('Informe ao menos uma faixa de deslocamento.');
    return erros;
  }

  let anterior = 0;
  faixas.forEach((faixa, indice) => {
    const limite = Number(faixa.limite_km);
    const valor = Number(faixa.valor_centavos);
    if (!Number.isFinite(limite) || limite <= 0) {
      erros.push(`Faixa ${indice + 1}: o limite deve ser maior que 0 km.`);
    } else if (limite <= anterior) {
      erros.push('Os limites das faixas devem ser crescentes e sem sobreposição.');
    } else {
      anterior = limite;
    }
    if (!Number.isFinite(valor) || valor < 0) {
      erros.push(`Faixa ${indice + 1}: informe um valor válido.`);
    }
  });

  if (
    Number.isFinite(maxima) &&
    maxima > 0 &&
    faixas.length > 0 &&
    Number(faixas[faixas.length - 1].limite_km) !== maxima
  ) {
    erros.push(
      `A última faixa (${faixas[faixas.length - 1].limite_km} km) deve corresponder à distância máxima (${maxima} km).`,
    );
  }

  return erros;
}

/**
 * Exemplos de prévia (CU 2.5): menor, intermediária e maior faixa.
 * Retorna uma distância representativa dentro de cada faixa.
 */
export function distanciasDeExemplo(faixas: readonly FaixaDeslocamento[]): number[] {
  if (faixas.length === 0) return [];
  const ordenadas = [...faixas].sort((a, b) => Number(a.limite_km) - Number(b.limite_km));
  const indices = new Set<number>([0, Math.floor((ordenadas.length - 1) / 2), ordenadas.length - 1]);
  return [...indices].map((i) => {
    const anterior = i === 0 ? 0 : Number(ordenadas[i - 1].limite_km);
    const limite = Number(ordenadas[i].limite_km);
    return Number(((anterior + limite) / 2).toFixed(2));
  });
}
