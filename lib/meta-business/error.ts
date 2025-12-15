export type GraphErrorInfo = {
  message: string;
  type: string;
  code: number;
  errorSubcode?: number;
  errorUserTitle?: string;
  errorUserMsg?: string;
  fbtraceId?: string;
};

export type GraphErrorJSONResponse<T> = {
  error: GraphErrorInfo & T;
};

export type GraphErrorReturn = {
  statusCode: number;
  reason: MappedError;
  data?: GraphErrorInfo;
};

/**
 * Custom error class for Graph API errors.
 * Contains standardized error information from parseGraphError.
 */
export class GraphApiError extends Error {
  readonly errorReturn: GraphErrorReturn;

  constructor(errorReturn: GraphErrorReturn) {
    super(errorReturn.reason.message);
    this.name = "GraphApiError";
    this.errorReturn = errorReturn;
  }
}

/**
 * Verifica se um objeto JSON é um erro do Graph API.
 */
function isGraphApiError(json: unknown): json is { error: unknown } {
  return (
    typeof json === "object" &&
    json !== null &&
    "error" in json &&
    typeof (json as { error: unknown }).error === "object" &&
    (json as { error: Record<string, unknown> }).error !== null
  );
}

/**
 * Verifica se um erro do Graph API tem a estrutura esperada.
 */
function isValidGraphErrorInfo(error: unknown): error is {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
} {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;
  return (
    typeof err["message"] === "string" &&
    typeof err["type"] === "string" &&
    typeof err["code"] === "number"
  );
}

export function parseGraphError(json: unknown): GraphErrorReturn {
  // Verifica se é um erro do Graph API formatado corretamente
  if (isGraphApiError(json) && isValidGraphErrorInfo(json.error)) {
    // É um erro do Graph API - mapeia para o formato padrão
    const errorInfo: GraphErrorInfo = {
      message: json.error.message,
      type: json.error.type,
      code: json.error.code,
      errorSubcode: json.error.error_subcode,
      errorUserTitle: json.error.error_user_title,
      errorUserMsg: json.error.error_user_msg,
      fbtraceId: json.error.fbtrace_id,
    };

    const mappedError = findMappedError(errorInfo.code, errorInfo.errorSubcode);

    return {
      statusCode: mappedError.httpStatusCode,
      reason: mappedError,
      data: errorInfo,
    };
  } else {
    return {
      statusCode: 500,
      reason: genericError,
    };
  }
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
 * Erro genérico para quando nenhum mapeamento é encontrado.
 */
export const genericError: MappedError = {
  httpStatusCode: 500,
  title: "Erro Desconhecido",
  message: "Ocorreu um erro inesperado ao processar sua requisição.",
  solution:
    "Tente novamente. Se o problema persistir, entre em contato com o suporte.",
  isTransient: true,
};

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
    message: "A imagem é muito grande para download. Deve ter menos de 8 MiB.",
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

  // Códigos gerais
  "102": {
    httpStatusCode: 401,
    title: "Sessão da API",
    message:
      "O status de login ou o token de acesso expirou, foi revogado ou é inválido (sem subcódigo).",
    solution: "Obtenha um novo token de acesso e tente novamente.",
    isTransient: false,
  },
  "1": {
    httpStatusCode: 503,
    title: "API Desconhecida",
    message:
      "Possível problema temporário (inatividade) ou chamada a API inexistente.",
    solution:
      "Aguarde e tente novamente; se persistir, valide se a API/endpoint existe.",
    isTransient: true,
  },
  "2": {
    httpStatusCode: 503,
    title: "Serviço de API",
    message: "Problema temporário devido à inatividade.",
    solution: "Aguarde um pouco e refaça a operação.",
    isTransient: true,
  },
  "3": {
    httpStatusCode: 403,
    title: "Método de API",
    message: "Problema envolvendo recursos ou permissões.",
    solution:
      "Verifique permissões/scopes e se o recurso está disponível para o app/usuário.",
    isTransient: false,
  },
  "4": {
    httpStatusCode: 429,
    title: "Muitas Chamadas de API",
    message: "Limitação temporária (rate limit).",
    solution:
      "Aguarde e tente novamente; reduza o volume de requisições (backoff/jitter).",
    isTransient: true,
  },
  "17": {
    httpStatusCode: 429,
    title: "Muitas Chamadas de Usuário",
    message: "Limitação temporária por usuário (rate limit).",
    solution: "Aguarde e tente novamente; aplique backoff/jitter por usuário.",
    isTransient: true,
  },
  "10": {
    httpStatusCode: 403,
    title: "Permissão Negada",
    message: "A permissão não foi concedida ou foi removida.",
    solution:
      "Revisar permissões/scopes e solicitar novamente a autorização do usuário.",
    isTransient: false,
  },
  "190": {
    httpStatusCode: 401,
    title: "Token de Acesso Expirou",
    message: "O token de acesso expirou, foi revogado ou é inválido.",
    solution: "Obtenha um novo token (reauth/refresh) e tente novamente.",
    isTransient: false,
  },
  // Observação: 200-299 é uma faixa; se você quiser tratar via mapa, use o helper de range (abaixo).
  "341": {
    httpStatusCode: 429,
    title: "Limite do Aplicativo Atingido",
    message: "Limite/indisponibilidade temporária (app-level).",
    solution:
      "Aguarde e tente novamente; reduza o volume e implemente backoff.",
    isTransient: true,
  },
  "368": {
    httpStatusCode: 429,
    title: "Bloqueado Temporariamente",
    message: "Bloqueio temporário por violações de políticas.",
    solution:
      "Aguarde e refaça a operação (evite padrões que pareçam automação/spam).",
    isTransient: true,
  },
  "506": {
    httpStatusCode: 400,
    title: "Publicação Duplicada",
    message:
      "Publicações duplicadas não podem ser publicadas consecutivamente.",
    solution: "Altere o conteúdo da publicação e tente novamente.",
    isTransient: false,
  },
  "1609005": {
    httpStatusCode: 400,
    title: "Erro ao Publicar Link",
    message: "Problema ao detalhar os dados do link fornecido.",
    solution:
      "Verifique a URL (válida, acessível, com metadados) e tente novamente.",
    isTransient: false,
  },

  // Códigos “de autenticação” (você pediu code-only, então entram como chaves simples)
  "190_458": {
    httpStatusCode: 401,
    title: "App Não Instalado",
    message: "O usuário não fez login no app.",
    solution: "Autentique o usuário novamente (login/consent).",
    isTransient: false,
  },
  "190_459": {
    httpStatusCode: 401,
    title: "Usuário em Checkpoint",
    message: "O usuário precisa corrigir um problema no Facebook.",
    solution:
      "O usuário deve entrar no Facebook (web/mobile) e concluir o checkpoint.",
    isTransient: false,
  },
  "190_460": {
    httpStatusCode: 401,
    title: "Senha Alterada",
    message: "A senha do usuário foi alterada; sessão atual ficou inválida.",
    solution:
      "Solicite login novamente (e no iOS, seguir o fluxo recomendado pelo SO se aplicável).",
    isTransient: false,
  },
  "190_463": {
    httpStatusCode: 401,
    title: "Expirado",
    message: "O login/token expirou ou foi revogado.",
    solution: "Obtenha um novo token e tente novamente.",
    isTransient: false,
  },
  "190_464": {
    httpStatusCode: 401,
    title: "Usuário Não Confirmado",
    message: "O usuário precisa corrigir um problema no Facebook.",
    solution:
      "O usuário deve entrar no Facebook (web/mobile) e concluir a confirmação.",
    isTransient: false,
  },
  "190_467": {
    httpStatusCode: 401,
    title: "Token de Acesso Inválido",
    message: "O token de acesso expirou, foi revogado ou está inválido.",
    solution: "Obtenha um novo token e tente novamente.",
    isTransient: false,
  },
  "190_492": {
    httpStatusCode: 403,
    title: "Sessão Inválida",
    message:
      "O usuário associado ao token de Página não possui função apropriada na Página.",
    solution:
      "Garanta que o usuário tenha a role correta na Página e reautentique.",
    isTransient: false,
  },
};

/**
 * Encontra o erro mapeado baseado no código e subcódigo.
 */
export function findMappedError(code: number, subcode?: number): MappedError {
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
 * Converts an error to GraphErrorReturn format.
 * Handles GraphApiError instances and other errors.
 */
export function errorToGraphErrorReturn(error: unknown): GraphErrorReturn {
  if (error instanceof GraphApiError) {
    return error.errorReturn;
  }

  // For non-GraphApiError, create a generic error return
  const errorMessage = error instanceof Error ? error.message : String(error);

  return {
    statusCode: 500,
    reason: {
      httpStatusCode: 500,
      title: "Internal server error",
      message: errorMessage,
      solution:
        "Tente novamente. Se o problema persistir, entre em contato com o suporte.",
      isTransient: true,
    },
  };
}
