/**
 * Mapeamento de erros da API de Mídia do Instagram.
 * Baseado na documentação oficial:
 * https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/error-codes
 */

import type { GraphErrorInfo } from "./types";

/**
 * Interface padrão para erros de mídia do Instagram.
 */
export interface InstagramMediaError {
  /**
   * Código HTTP do erro.
   */
  httpStatusCode: number;

  /**
   * Código de erro da API.
   */
  code: number;

  /**
   * Subcódigo de erro da API (quando disponível).
   */
  subcode?: number;

  /**
   * Mensagem de erro original em inglês.
   */
  originalMessage: string;

  /**
   * Título do erro traduzido para pt_BR.
   */
  title: string;

  /**
   * Mensagem de erro traduzida para pt_BR.
   */
  message: string;

  /**
   * Solução recomendada traduzida para pt_BR.
   */
  solution: string;

  /**
   * Indica se o erro é temporário/transiente.
   */
  isTransient: boolean;

  /**
   * Indica se o erro é relacionado à mídia.
   */
  isMediaError: boolean;

  /**
   * ID de rastreamento do Facebook (quando disponível).
   */
  fbtraceId?: string;
}

/**
 * Definição interna de um erro mapeado.
 */
interface MappedError {
  httpStatusCode: number;
  title: string;
  message: string;
  solution: string;
  isTransient: boolean;
}

/**
 * Mapa de erros conhecidos da API do Instagram.
 * Chave: `${code}_${subcode}` ou `${code}` quando subcode não é específico.
 */
const errorMap: Record<string, MappedError> = {
  // Erros de timeout e download
  "-2_2207003": {
    httpStatusCode: 400,
    title: "Timeout no Download",
    message: "O download da mídia demorou muito tempo.",
    solution: "Ocorreu um timeout ao baixar a mídia. Tente novamente.",
    isTransient: true,
  },
  "-2_2207020": {
    httpStatusCode: 400,
    title: "Mídia Expirada",
    message: "A mídia que você está tentando acessar expirou.",
    solution: "Gere um novo ID de container e tente novamente.",
    isTransient: false,
  },

  // Erros de servidor
  "-1_2207001": {
    httpStatusCode: 400,
    title: "Erro do Servidor Instagram",
    message: "Erro interno do servidor do Instagram.",
    solution: "Tente novamente mais tarde.",
    isTransient: true,
  },
  "-1_2207032": {
    httpStatusCode: 400,
    title: "Falha na Criação",
    message: "Falha ao criar mídia.",
    solution: "Falha ao criar o container de mídia. Tente novamente.",
    isTransient: true,
  },
  "-1_2207053": {
    httpStatusCode: 400,
    title: "Erro de Upload Desconhecido",
    message: "Ocorreu um erro desconhecido durante o upload.",
    solution:
      "Gere um novo container e tente novamente. Isso geralmente afeta apenas uploads de vídeo.",
    isTransient: true,
  },

  // Erro de thumbnail
  "1_2207057": {
    httpStatusCode: 400,
    title: "Offset de Thumbnail Inválido",
    message:
      "O offset da thumbnail deve ser maior ou igual a 0 e menor que a duração do vídeo.",
    solution: "Adicione o offset correto em milissegundos.",
    isTransient: false,
  },

  // Erro de spam
  "4_2207051": {
    httpStatusCode: 400,
    title: "Ação Restrita",
    message:
      "Restringimos certas atividades para proteger nossa comunidade. Informe-nos se você acha que cometemos um erro.",
    solution:
      "A ação de publicação é suspeita de ser spam. Entre em contato com o suporte se acreditar que foi um engano.",
    isTransient: false,
  },

  // Limite de publicação
  "9_2207042": {
    httpStatusCode: 400,
    title: "Limite de Publicação Atingido",
    message:
      "Você atingiu o número máximo de posts permitidos pela API de Publicação de Conteúdo.",
    solution:
      "O usuário atingiu o limite diário de publicações. Tente novamente no dia seguinte.",
    isTransient: false,
  },

  // Erros de mídia não encontrada
  "24_2207006": {
    httpStatusCode: 400,
    title: "Mídia Não Encontrada",
    message: "A mídia não pode ser encontrada.",
    solution:
      "Possível erro de permissão devido à falta de permissão ou token expirado. Gere um novo container e tente novamente.",
    isTransient: false,
  },
  "24_2207008": {
    httpStatusCode: 400,
    title: "Container Expirado",
    message: "O container de mídia não existe ou expirou.",
    solution:
      "Erro temporário ao publicar o container. Tente novamente em 30 segundos a 2 minutos. Se não funcionar, gere um novo ID de container.",
    isTransient: true,
  },

  // Conta restrita
  "25_2207050": {
    httpStatusCode: 400,
    title: "Conta Restrita",
    message: "A conta do Instagram está restrita.",
    solution:
      "A conta profissional do Instagram está inativa, com checkpoint ou restrita. O usuário deve entrar no app do Instagram e completar as ações necessárias para reativar a conta.",
    isTransient: false,
  },

  // Erros de tipo de mídia
  "100_2207023": {
    httpStatusCode: 400,
    title: "Tipo de Mídia Desconhecido",
    message: "O tipo de mídia é desconhecido.",
    solution:
      "O tipo de mídia inserido não é um dos tipos esperados. Por favor, insira o tipo correto (IMAGE, VIDEO, CAROUSEL_ALBUM, REELS, STORY).",
    isTransient: false,
  },
  "100_2207028": {
    httpStatusCode: 400,
    title: "Carrossel Inválido",
    message:
      "Sua publicação não funcionará como carrossel. Carrosséis precisam de pelo menos 2 e no máximo 10 fotos/vídeos.",
    solution:
      "Tente novamente usando um número aceitável de fotos/vídeos (entre 2 e 10).",
    isTransient: false,
  },
  "100_2207035": {
    httpStatusCode: 400,
    title: "Tags de Produto em Vídeo",
    message:
      "Posições de tags de produto não devem ser especificadas para mídia de vídeo.",
    solution:
      "Vídeos não suportam coordenadas X/Y para tags de produto. Remova as coordenadas.",
    isTransient: false,
  },
  "100_2207036": {
    httpStatusCode: 400,
    title: "Tags de Produto Obrigatórias",
    message: "Posições de tags de produto são obrigatórias para mídia de foto.",
    solution:
      "Tags de produto em imagens devem incluir coordenadas X/Y. Adicione as coordenadas necessárias.",
    isTransient: false,
  },
  "100_2207037": {
    httpStatusCode: 400,
    title: "Tags de Produto Inválidas",
    message:
      "Não foi possível adicionar todas as suas tags de produto. O ID do produto pode estar incorreto, o produto pode ter sido excluído, ou você não tem permissão para marcar o produto.",
    solution:
      "Um ou mais produtos usados para marcar o item é inválido. Obtenha os catálogos e produtos elegíveis novamente e permita que o usuário use apenas esses IDs de produto.",
    isTransient: false,
  },
  "100_2207040": {
    httpStatusCode: 400,
    title: "Limite de Tags Excedido",
    message:
      "Não é possível usar mais do que o número máximo de tags por mídia criada.",
    solution:
      "O usuário excedeu o número máximo (20) de tags @. Use menos tags @.",
    isTransient: false,
  },

  // Erro de formato de vídeo
  "352_2207026": {
    httpStatusCode: 400,
    title: "Formato de Vídeo Não Suportado",
    message:
      "O formato do vídeo não é suportado. Verifique as especificações para formatos suportados.",
    solution:
      "Formato de vídeo não suportado. Use um arquivo MOV ou MP4 (MPEG-4 Part 14).",
    isTransient: false,
  },

  // Erro de URI
  "9004_2207052": {
    httpStatusCode: 400,
    title: "Mídia Não Encontrada na URI",
    message: "A mídia não pôde ser obtida desta URI.",
    solution:
      "A mídia não pôde ser obtida da URI fornecida. Certifique-se de que a URI é válida e publicamente acessível.",
    isTransient: false,
  },

  // Container não pronto
  "9007_2207027": {
    httpStatusCode: 400,
    title: "Mídia Não Pronta",
    message:
      "A mídia não está pronta para publicação. Por favor, aguarde um momento.",
    solution:
      "Verifique o status do container e publique quando o status for FINISHED.",
    isTransient: true,
  },

  // Erro de tamanho de imagem
  "36000_2207004": {
    httpStatusCode: 400,
    title: "Imagem Muito Grande",
    message:
      "A imagem é muito grande para download. Deve ter menos de 8 MiB.",
    solution:
      "A imagem excedeu o tamanho máximo de 8 MiB. Tente novamente com uma imagem menor.",
    isTransient: false,
  },

  // Erro de formato de imagem
  "36001_2207005": {
    httpStatusCode: 400,
    title: "Formato de Imagem Não Suportado",
    message:
      "O formato da imagem não é suportado. Formatos suportados são: JPEG, PNG.",
    solution:
      "Possível erro de permissão devido à falta de permissão ou token expirado. Gere um novo container e tente novamente.",
    isTransient: false,
  },

  // Erro de proporção de imagem
  "36003_2207009": {
    httpStatusCode: 400,
    title: "Proporção de Imagem Inválida",
    message:
      "A imagem enviada com esta proporção não pode ser publicada. Por favor, envie uma imagem com uma proporção válida.",
    solution:
      "A proporção da imagem não está dentro do intervalo aceitável. Tente novamente com uma imagem entre 4:5 e 1.91:1.",
    isTransient: false,
  },

  // Erro de legenda muito longa
  "36004_2207010": {
    httpStatusCode: 400,
    title: "Legenda Muito Longa",
    message:
      "A legenda enviada excedeu o número máximo de caracteres permitidos.",
    solution:
      "O usuário excedeu o limite máximo de caracteres para legenda. Use uma legenda mais curta. Máximo: 2.200 caracteres, 30 hashtags e 20 tags @.",
    isTransient: false,
  },
};

/**
 * Erro genérico para quando nenhum mapeamento é encontrado.
 */
const genericError: MappedError = {
  httpStatusCode: 500,
  title: "Erro Desconhecido",
  message:
    "Ocorreu um erro inesperado ao processar sua mídia no Instagram.",
  solution:
    "Tente novamente. Se o problema persistir, entre em contato com o suporte.",
  isTransient: true,
};

/**
 * Encontra o erro mapeado baseado no código e subcódigo.
 */
function findMappedError(
  code: number,
  subcode?: number
): MappedError {
  // Primeiro tenta encontrar pelo código + subcódigo específico
  if (subcode !== undefined) {
    const specificKey = `${code}_${subcode}`;
    if (errorMap[specificKey]) {
      return errorMap[specificKey];
    }
  }

  // Depois tenta encontrar apenas pelo código
  const codeOnlyKey = String(code);
  if (errorMap[codeOnlyKey]) {
    return errorMap[codeOnlyKey];
  }

  // Se não encontrou, retorna erro genérico
  return genericError;
}

/**
 * Converte um erro do Graph API para o formato padronizado InstagramMediaError.
 *
 * @param graphError - Erro retornado pela API do Graph (GraphErrorInfo)
 * @returns Erro padronizado com tradução pt_BR
 *
 * @example
 * ```typescript
 * const response = await publishMediaContainer({ ... });
 * if ('error' in response) {
 *   const standardError = parseInstagramMediaError(response.error);
 *   console.log(standardError.message); // Mensagem em português
 * }
 * ```
 */
export function parseInstagramMediaError(
  graphError: GraphErrorInfo
): InstagramMediaError {
  const mappedError = findMappedError(graphError.code, graphError.errorSubcode);

  return {
    httpStatusCode: mappedError.httpStatusCode,
    code: graphError.code,
    subcode: graphError.errorSubcode,
    originalMessage: graphError.message,
    title: mappedError.title,
    message: mappedError.message,
    solution: mappedError.solution,
    isTransient: mappedError.isTransient,
    isMediaError: true,
    fbtraceId: graphError.fbtraceId,
  };
}

/**
 * Converte uma mensagem de erro genérica para o formato padronizado.
 * Útil quando o erro não veio diretamente da API do Graph.
 *
 * @param message - Mensagem de erro
 * @param code - Código de erro opcional
 * @returns Erro padronizado com tradução pt_BR
 */
export function createGenericInstagramMediaError(
  message: string,
  code = -1
): InstagramMediaError {
  return {
    httpStatusCode: 500,
    code,
    originalMessage: message,
    title: genericError.title,
    message: genericError.message,
    solution: genericError.solution,
    isTransient: true,
    isMediaError: true,
  };
}

/**
 * Verifica se um erro do Graph API é um erro de mídia do Instagram.
 *
 * @param error - Qualquer objeto de erro
 * @returns true se for um erro reconhecido de mídia do Instagram
 */
export function isInstagramMediaError(error: unknown): error is GraphErrorInfo {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorObj = error as Record<string, unknown>;
  return (
    typeof errorObj["message"] === "string" &&
    typeof errorObj["code"] === "number" &&
    typeof errorObj["type"] === "string"
  );
}

/**
 * Tenta extrair e parsear um erro de mídia do Instagram de qualquer fonte.
 *
 * @param error - Erro de qualquer tipo (Error, string JSON, objeto, etc.)
 * @returns Erro padronizado ou null se não for possível parsear
 *
 * @example
 * ```typescript
 * try {
 *   await publishMediaContainer({ ... });
 * } catch (err) {
 *   const standardError = tryParseInstagramMediaError(err);
 *   if (standardError) {
 *     toast.error(standardError.message);
 *   }
 * }
 * ```
 */
export function tryParseInstagramMediaError(
  error: unknown
): InstagramMediaError | null {
  // Se já é um GraphErrorInfo válido
  if (isInstagramMediaError(error)) {
    return parseInstagramMediaError(error);
  }

  // Se é um Error com mensagem JSON
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed
      ) {
        const graphResponse = parsed as { error: unknown };
        if (isInstagramMediaError(graphResponse.error)) {
          return parseInstagramMediaError(graphResponse.error);
        }
      }
    } catch {
      // Não é JSON, criar erro genérico
      return createGenericInstagramMediaError(error.message);
    }
  }

  // Se é uma string, tentar parsear como JSON
  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error) as unknown;
      if (isInstagramMediaError(parsed)) {
        return parseInstagramMediaError(parsed);
      }
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed
      ) {
        const graphResponse = parsed as { error: unknown };
        if (isInstagramMediaError(graphResponse.error)) {
          return parseInstagramMediaError(graphResponse.error);
        }
      }
    } catch {
      // Não é JSON
      return createGenericInstagramMediaError(error);
    }
  }

  // Se é um objeto com propriedade error
  if (
    typeof error === "object" &&
    error !== null &&
    "error" in error
  ) {
    const errorObj = error as { error: unknown };
    if (isInstagramMediaError(errorObj.error)) {
      return parseInstagramMediaError(errorObj.error);
    }
  }

  return null;
}

/**
 * Lista de todos os códigos de erro conhecidos.
 * Útil para debug e documentação.
 */
export const knownErrorCodes = Object.keys(errorMap).map((key) => {
  const parts = key.split("_");
  return {
    code: Number(parts[0]),
    subcode: parts[1] ? Number(parts[1]) : undefined,
    ...errorMap[key],
  };
});

