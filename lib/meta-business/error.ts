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
  "613": {
    httpStatusCode: 429,
    title: "Limite de Taxa Excedido",
    message: "As chamadas para esta API excederam o limite de taxa.",
    solution:
      "Aguarde um pouco e tente novamente. Reduza o volume de requisições e implemente backoff exponencial.",
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
  "2500": {
    httpStatusCode: 400,
    title: "Erro ao Analisar Consulta Graph",
    message: "Erro ao analisar a consulta Graph.",
    solution:
      "Verifique a sintaxe da consulta Graph e os parâmetros fornecidos. Certifique-se de que todos os campos e relacionamentos estão corretos.",
    isTransient: false,
  },
  "1150": {
    httpStatusCode: 500,
    title: "Erro Desconhecido",
    message: "Ocorreu um erro desconhecido.",
    solution:
      "Tente novamente. Se o problema persistir, verifique os logs e contate o suporte.",
    isTransient: true,
  },

  // Códigos "de autenticação" (você pediu code-only, então entram como chaves simples)
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

  // ============================================
  // Marketing API Errors
  // Ref: https://developers.facebook.com/docs/marketing-api/error-reference
  // ============================================

  // Erro desconhecido com subcode
  "1_99": {
    httpStatusCode: 400,
    title: "Erro Desconhecido",
    message:
      "Ocorreu um erro desconhecido. Pode ocorrer se você definir 'level' como 'adset' quando o valor correto deveria ser 'campaign'.",
    solution:
      "Verifique se o parâmetro 'level' está correto (campaign, adset, ad).",
    isTransient: false,
  },

  // Erros de parâmetro inválido (100)
  "100": {
    httpStatusCode: 400,
    title: "Parâmetro Inválido",
    message: "Um ou mais parâmetros fornecidos são inválidos.",
    solution:
      "Verifique os parâmetros da requisição e corrija os valores inválidos.",
    isTransient: false,
  },
  "100_33": {
    httpStatusCode: 400,
    title: "Requisição POST Não Suportada",
    message:
      "O token de acesso não foi adicionado como usuário de sistema com permissões apropriadas na conta de anúncios.",
    solution:
      "Verifique a conta de anúncios no Business Manager e adicione o usuário de sistema como Admin na conta de anúncios.",
    isTransient: false,
  },
  "100_1487694": {
    httpStatusCode: 400,
    title: "Categoria de Segmentação Indisponível",
    message:
      "A categoria de segmentação selecionada não está mais disponível. Várias categorias baseadas em comportamento foram descontinuadas.",
    solution:
      "Use a API de Targeting Search para ver as categorias disponíveis para segmentação.",
    isTransient: false,
  },
  "100_1752129": {
    httpStatusCode: 400,
    title: "Combinação de Tarefas Não Suportada",
    message:
      "Esta combinação de tarefas não é suportada para atribuir um usuário a esta conta de anúncios.",
    solution:
      "Passe uma combinação de tarefas válida conforme definido no mapeamento de permissões do Business Manager.",
    isTransient: false,
  },
  "100_3858258": {
    httpStatusCode: 400,
    title: "Imagem Não Baixada",
    message:
      "A imagem não pôde ser baixada. Certifique-se de que a imagem está acessível via internet e não está bloqueada por robots.txt.",
    solution:
      "Verifique se a URL da imagem está acessível publicamente e adicione uma regra no robots.txt para permitir o crawler da Meta.",
    isTransient: false,
  },
  "3018": {
    httpStatusCode: 400,
    title: "Data de Início Inválida",
    message:
      "A data de início do intervalo de tempo não pode estar além de 37 meses da data atual.",
    solution:
      "Ajuste a data de início para estar dentro de 37 meses a partir da data atual.",
    isTransient: false,
  },
  "2635": {
    httpStatusCode: 400,
    title: "Versão da API de Anúncios Descontinuada",
    message:
      "Você está chamando uma versão descontinuada da API de Anúncios. Atualize para a versão mais recente.",
    solution:
      "Atualize sua integração para usar a versão mais recente da API de Anúncios. Consulte a documentação para migração.",
    isTransient: false,
  },
  "80004": {
    httpStatusCode: 429,
    title: "Muitas Chamadas à Conta de Anúncios",
    message:
      "Houve muitas chamadas para esta conta de anúncios. Aguarde um pouco e tente novamente.",
    solution:
      "Aguarde antes de tentar novamente. Para mais informações, consulte https://developers.facebook.com/docs/graph-api/overview/rate-limiting#ads-management.",
    isTransient: true,
  },

  // Assinatura incorreta
  "104": {
    httpStatusCode: 401,
    title: "Assinatura Incorreta",
    message: "A assinatura da requisição está incorreta.",
    solution:
      "Verifique se a assinatura da requisição está sendo gerada corretamente.",
    isTransient: false,
  },

  // Erros de permissão (200)
  "200": {
    httpStatusCode: 403,
    title: "Erro de Permissão",
    message: "O usuário não tem permissão para realizar esta ação.",
    solution:
      "Verifique se o usuário tem as permissões necessárias para esta operação.",
    isTransient: false,
  },
  "200_1870034": {
    httpStatusCode: 403,
    title: "Termos de Audiência Personalizada",
    message:
      "Você precisa aceitar os termos de Audiência Personalizada antes de criar ou editar uma audiência ou conjunto de anúncios.",
    solution:
      "Acesse https://www.facebook.com/ads/manage/customaudiences/tos e aceite os termos.",
    isTransient: false,
  },
  "200_1870047": {
    httpStatusCode: 400,
    title: "Tamanho da Audiência Muito Baixo",
    message:
      "Você não pode remover usuários desta audiência porque resultará em um tamanho de audiência baixo, podendo causar sub-entrega ou não entrega dos seus anúncios.",
    solution:
      "Mantenha um tamanho de audiência adequado para garantir a entrega dos anúncios.",
    isTransient: false,
  },

  // Permissão ads_management
  "294": {
    httpStatusCode: 403,
    title: "Permissão ads_management Necessária",
    message:
      "Gerenciar anúncios requer a permissão estendida ads_management e um aplicativo na lista de permissões para acessar a Marketing API.",
    solution:
      "Solicite a permissão ads_management e verifique se seu app tem acesso à Marketing API.",
    isTransient: false,
  },

  // Erros de anúncios
  "2606": {
    httpStatusCode: 400,
    title: "Prévia Indisponível",
    message: "Não foi possível exibir uma prévia deste anúncio.",
    solution: "Verifique os dados do criativo do anúncio e tente novamente.",
    isTransient: false,
  },
  "2607": {
    httpStatusCode: 400,
    title: "Moeda Inválida",
    message: "A moeda fornecida é inválida para uso com anúncios.",
    solution: "Use uma moeda válida suportada pela conta de anúncios.",
    isTransient: false,
  },
  "2615": {
    httpStatusCode: 400,
    title: "Atualização de Conta Inválida",
    message: "Chamada inválida para atualizar esta conta de anúncios.",
    solution:
      "Verifique os parâmetros da requisição de atualização da conta de anúncios.",
    isTransient: false,
  },

  // Erros de audiência personalizada
  "2654": {
    httpStatusCode: 400,
    title: "Falha ao Criar Audiência",
    message: "Falha ao criar a audiência personalizada.",
    solution:
      "Verifique os parâmetros e tente novamente. Certifique-se de que a conta de anúncios está ativa.",
    isTransient: false,
  },
  "2654_1713092": {
    httpStatusCode: 403,
    title: "Sem Permissão de Escrita",
    message:
      "Sem permissão de escrita para esta conta de anúncios. O desenvolvedor precisa ter permissões na conta de anúncios para criar uma audiência.",
    solution: "Solicite permissões de escrita para a conta de anúncios.",
    isTransient: false,
  },

  // Erro desconhecido
  "5000": {
    httpStatusCode: 500,
    title: "Código de Erro Desconhecido",
    message: "Ocorreu um erro desconhecido.",
    solution: "Tente novamente. Se o problema persistir, contate o suporte.",
    isTransient: true,
  },

  // Dynamic Creative
  "1340029": {
    httpStatusCode: 400,
    title: "Exclusão de Anúncio Dinâmico Não Permitida",
    message:
      "Atualmente, a exclusão de Anúncio Criativo Dinâmico não é permitida. Exclua o Conjunto de Anúncios pai.",
    solution:
      "Para remover este anúncio, exclua o Conjunto de Anúncios (Ad Set) correspondente.",
    isTransient: false,
  },

  // Call to Action
  "1373054": {
    httpStatusCode: 400,
    title: "Tipo de Call To Action Inválido",
    message:
      "Nenhum tipo de Call To Action foi reconhecido. Consulte a documentação da API de Call To Action.",
    solution: "Use um tipo de Call To Action válido conforme a documentação.",
    isTransient: false,
  },

  // Bloqueios
  "1404078": {
    httpStatusCode: 429,
    title: "Bloqueado Temporariamente",
    message: "Você foi temporariamente bloqueado de realizar esta ação.",
    solution:
      "Aguarde um período antes de tentar novamente. Evite ações repetitivas em curto espaço de tempo.",
    isTransient: true,
  },
  "1404163": {
    httpStatusCode: 403,
    title: "Acesso a Anúncios Bloqueado",
    message:
      "Você não pode mais usar produtos do Facebook para anunciar. Não é possível criar anúncios, gerenciar ativos de publicidade ou criar novas contas de anúncios ou de negócios.",
    solution:
      "Acesse https://www.facebook.com/accountquality/advertising_access para mais informações.",
    isTransient: false,
  },

  // Erros de campanha e conjunto de anúncios
  "1487007": {
    httpStatusCode: 400,
    title: "Conjunto de Anúncios Encerrado",
    message:
      "Você não pode editar este anúncio porque faz parte de um conjunto de anúncios agendado que atingiu sua data de término.",
    solution:
      "Vá à seção Orçamento e Cronograma do conjunto de anúncios e altere a data de término para uma data futura.",
    isTransient: false,
  },
  "1487033": {
    httpStatusCode: 400,
    title: "Data de Término da Campanha",
    message: "A data de término da sua campanha deve estar no futuro.",
    solution: "Escolha uma data de término futura e tente novamente.",
    isTransient: false,
  },
  "1487056": {
    httpStatusCode: 400,
    title: "Conjunto de Anúncios Excluído",
    message:
      "Este conjunto de anúncios foi excluído, portanto você só pode editar o nome. Para editar outros campos, duplique o conjunto de anúncios.",
    solution:
      "Duplique o conjunto de anúncios para criar um novo com as mesmas configurações que pode ser editado.",
    isTransient: false,
  },
  "1487472": {
    httpStatusCode: 400,
    title: "Publicação Não Pode Ser Promovida",
    message:
      "Você está usando um conteúdo que não pode ser promovido em um anúncio.",
    solution: "Escolha uma publicação de Página diferente para continuar.",
    isTransient: false,
  },
  "1487566": {
    httpStatusCode: 400,
    title: "Campanha Excluída",
    message:
      "Esta campanha foi excluída, portanto você só pode editar o nome. Para editar outros campos, duplique a campanha.",
    solution:
      "Duplique a campanha para criar uma nova com as mesmas configurações que pode ser editada.",
    isTransient: false,
  },
  "1487678": {
    httpStatusCode: 400,
    title: "Sistema Operacional Incompatível",
    message:
      "O aplicativo que você está tentando criar um anúncio está em um sistema operacional diferente das configurações de segmentação deste conjunto de anúncios.",
    solution:
      "Alinhe o sistema operacional do aplicativo com a segmentação do conjunto de anúncios.",
    isTransient: false,
  },

  // Erros de criativo
  "1885183": {
    httpStatusCode: 400,
    title: "App em Modo de Desenvolvimento",
    message:
      "A publicação do criativo do anúncio foi criada por um aplicativo em modo de desenvolvimento. O app deve estar público para criar este anúncio.",
    solution:
      "Altere o modo do aplicativo para público antes de criar o anúncio.",
    isTransient: false,
  },
  "1885204": {
    httpStatusCode: 400,
    title: "Configuração de Lance",
    message:
      "Você precisa definir seu lance como automático para a otimização escolhida.",
    solution:
      "Remova qualquer informação de faturamento ou lance, ou altere sua otimização.",
    isTransient: false,
  },
  "1885272": {
    httpStatusCode: 400,
    title: "Orçamento Muito Baixo",
    message: "O orçamento está muito baixo.",
    solution: "Aumente o orçamento para atender ao mínimo exigido.",
    isTransient: false,
  },
  "1885557": {
    httpStatusCode: 400,
    title: "Publicação Indisponível",
    message:
      "Seu anúncio está promovendo uma publicação indisponível. Ela pode ter sido excluída, despublicada, não pertence à página do anúncio ou você não tem permissões para vê-la ou promovê-la.",
    solution:
      "Verifique se a publicação existe, está publicada e você tem permissões para promovê-la.",
    isTransient: false,
  },
  "1885621": {
    httpStatusCode: 400,
    title: "Conflito de Orçamento",
    message:
      "Você só pode definir um orçamento no conjunto de anúncios ou na campanha, não em ambos.",
    solution:
      "Escolha entre orçamento de campanha (CBO) ou orçamento de conjunto de anúncios.",
    isTransient: false,
  },
  "1885650": {
    httpStatusCode: 400,
    title: "Orçamento Abaixo do Mínimo",
    message:
      "Seu orçamento está muito baixo. Este valor mínimo é necessário para acomodar qualquer gasto que ocorra enquanto seu orçamento é atualizado, o que pode levar até 15 minutos.",
    solution: "Aumente o orçamento para atender ao valor mínimo exigido.",
    isTransient: false,
  },

  // Erros de Instagram
  "2238055": {
    httpStatusCode: 400,
    title: "Parâmetros Instagram/Orçamento de Campanha",
    message:
      "Este erro pode ocorrer por: (1) Você não pode passar instagram_user_id e instagram_actor_id juntos, ou instagram_story_id e source_instagram_media_id juntos no creative spec; (2) O orçamento da sua campanha deve ser pelo menos o mínimo para acomodar todos os conjuntos de anúncios.",
    solution:
      "Verifique os parâmetros do Instagram no criativo ou ajuste o orçamento da campanha.",
    isTransient: false,
  },
  "2446149": {
    httpStatusCode: 400,
    title: "Conflito de Parâmetros Instagram",
    message:
      "Você não pode passar instagram_user_id e instagram_actor_id juntos, ou instagram_story_id e source_instagram_media_id juntos no creative spec.",
    solution:
      "Use apenas um dos parâmetros conflitantes: instagram_user_id OU instagram_actor_id, instagram_story_id OU source_instagram_media_id.",
    isTransient: false,
  },
  "2446307": {
    httpStatusCode: 400,
    title: "Limite de Gastos da Campanha",
    message: "O limite de gastos do grupo de campanhas é menor que o mínimo.",
    solution:
      "Aumente o limite de gastos da campanha para atender ao mínimo exigido.",
    isTransient: false,
  },
  "2446173": {
    httpStatusCode: 400,
    title: "Rótulo de Regra de Segmentação",
    message:
      "O rótulo da regra de segmentação não se refere a nenhum dos rótulos de ativos.",
    solution:
      "Corrija removendo todos os criativos de anúncios e verifique os rótulos de regra.",
    isTransient: false,
  },
  "2446289": {
    httpStatusCode: 400,
    title: "Publicação Não Disponível",
    message:
      "A publicação selecionada para seu anúncio não está disponível. Pode ter sido excluída ou você não tem permissões para vê-la.",
    solution:
      "Verifique o criativo do anúncio e selecione uma publicação válida.",
    isTransient: false,
  },
  "2446347": {
    httpStatusCode: 400,
    title: "Flag use_existing_post Necessária",
    message:
      "O anúncio de uma publicação existente deve ter a flag use_existing_post definida como true no asset_feed_spec:target_rules.",
    solution: "Inclua use_existing_post: true na requisição POST ao servidor.",
    isTransient: false,
  },
  "2446383": {
    httpStatusCode: 400,
    title: "URL do Site Necessária",
    message:
      "O objetivo da sua campanha requer uma URL de site externo. Selecione um call to action e insira uma URL de site na seção de criativo do anúncio.",
    solution:
      "Adicione uma URL de site válida e um call to action ao criativo.",
    isTransient: false,
  },
  "2446394": {
    httpStatusCode: 400,
    title: "Opções de Segmentação Indisponíveis",
    message:
      "Este conjunto de anúncios inclui opções de segmentação detalhada que não estão mais disponíveis ou não estão disponíveis ao excluir pessoas de uma audiência.",
    solution:
      "Remova itens da segmentação detalhada ou confirme as alterações para reativar.",
    isTransient: false,
  },
  "2446509": {
    httpStatusCode: 400,
    title: "Tipo de Destino de Campanha Inválido",
    message: "O tipo de destino da campanha de anúncios não é válido.",
    solution: "Verifique e corrija o tipo de destino da campanha.",
    isTransient: false,
  },
  "2446580": {
    httpStatusCode: 400,
    title: "Conflito de Componentes Interativos",
    message:
      "Não é possível especificar tanto 'components' quanto 'child_attachments' ao fornecer parâmetros interactive_components_spec.",
    solution: "Use apenas 'components' ou 'child_attachments', não ambos.",
    isTransient: false,
  },
  "2446712": {
    httpStatusCode: 400,
    title: "Otimização de Visitas à Loja Indisponível",
    message:
      "A capacidade de criar ou executar um conjunto de anúncios com otimização de visitas à loja não está mais disponível.",
    solution: "Escolha a otimização de alcance ou vendas na loja em vez disso.",
    isTransient: false,
  },
  "2446867": {
    httpStatusCode: 400,
    title: "Limite de Campanhas Advantage+",
    message:
      "Você já atingiu o limite de Campanhas Advantage+ Shopping para determinados países.",
    solution:
      "Para criar campanhas adicionais para esses países, use uma campanha de conversões padrão.",
    isTransient: false,
  },
  "2446880": {
    httpStatusCode: 400,
    title: "WhatsApp Desconectado",
    message:
      "O número do WhatsApp conectado à sua página do Facebook ou perfil do Instagram foi desconectado.",
    solution:
      "Reconecte sua conta do WhatsApp para executar este anúncio novamente.",
    isTransient: false,
  },

  // Erros de mídia e assets
  "2490085": {
    httpStatusCode: 400,
    title: "Chave de Corte Descontinuada",
    message:
      "A chave de corte 191x100 não estará mais disponível na versão mais recente da API de Anúncios. A chave de corte recomendada será 100x100.",
    solution: "Atualize para usar a chave de corte 100x100.",
    isTransient: false,
  },
  "2490155": {
    httpStatusCode: 400,
    title: "Publicação Associada Indisponível",
    message:
      "A publicação associada ao seu anúncio não está disponível. Pode ter sido removida ou você não tem permissão para visualizá-la.",
    solution:
      "Verifique se a publicação existe e você tem permissões para acessá-la.",
    isTransient: false,
  },
  "2490372": {
    httpStatusCode: 400,
    title: "Destino da Loja Necessário",
    message: "Você precisa escolher um destino de loja para continuar.",
    solution:
      "Selecione um destino de loja válido nas configurações do anúncio.",
    isTransient: false,
  },
  "2490427": {
    httpStatusCode: 400,
    title: "Anúncio Rejeitado",
    message:
      "Seu anúncio foi rejeitado na última revisão e está atualmente desativado.",
    solution:
      "Para habilitar o anúncio, você precisará fazer atualizações e criar um novo anúncio.",
    isTransient: false,
  },
  "2490468": {
    httpStatusCode: 400,
    title: "Anúncio Rejeitado na Revisão",
    message:
      "Seu anúncio foi rejeitado na última revisão e está atualmente desativado.",
    solution:
      "Para habilitar o anúncio, você precisará fazer atualizações e criar um novo anúncio.",
    isTransient: false,
  },

  // Anúncios políticos
  "2708008": {
    httpStatusCode: 403,
    title: "Autorização para Anúncios Políticos",
    message:
      "Você não foi autorizado a veicular anúncios sobre questões sociais, eleições ou política.",
    solution:
      "Tenha um usuário autorizado da conta de anúncios publicar este anúncio, ou complete o processo de confirmação de identidade em https://www.facebook.com/id",
    isTransient: false,
  },

  // Bloqueio temporário
  "2859015": {
    httpStatusCode: 429,
    title: "Ação Bloqueada Temporariamente",
    message: "Você foi temporariamente bloqueado de realizar esta ação.",
    solution: "Aguarde um período antes de tentar novamente.",
    isTransient: true,
  },

  // Segmentação de menores
  "3858064": {
    httpStatusCode: 400,
    title: "Segmentação de Menores Restrita",
    message:
      "Esta campanha contém opções que não podem mais ser usadas em campanhas com audiências menores de 18 anos globalmente, 20 na Tailândia ou 21 na Indonésia.",
    solution:
      "Aumente a idade mínima da sua audiência ou remova todas as opções de segmentação exceto idade e localizações que são cidades ou maiores (excluindo códigos postais).",
    isTransient: false,
  },

  // Standard Enhancements
  "3858082": {
    httpStatusCode: 400,
    title: "Enroll Status Não Fornecido",
    message:
      "Este criativo é elegível para Melhorias Padrão, mas enroll_status não foi fornecido.",
    solution: "Escolha se deseja ativar as melhorias padrão ou não.",
    isTransient: false,
  },

  // Informações de beneficiário
  "3858152": {
    httpStatusCode: 400,
    title: "Informações de Beneficiário/Pagador Necessárias",
    message:
      "Este anúncio pertence a um conjunto de anúncios que deve ser publicado com informações de beneficiário e pagador.",
    solution:
      "Vá ao conjunto de anúncios para adicionar ou revisar estas informações e clique em 'Publicar'.",
    isTransient: false,
  },

  // Partnership ads
  "3867105": {
    httpStatusCode: 400,
    title: "Conteúdo de Anúncio de Parceria Inválido",
    message: "Este conteúdo não pode ser usado para seu anúncio de parceria.",
    solution: "Selecione um conteúdo diferente.",
    isTransient: false,
  },

  // Erro de conta
  "3910001": {
    httpStatusCode: 500,
    title: "Problema com a Conta",
    message: "Estamos enfrentando alguns problemas com sua conta.",
    solution: "Tente novamente mais tarde.",
    isTransient: true,
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
