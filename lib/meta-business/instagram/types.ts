/**
 * Tipos de mídia suportados pela API.
 */
export type MediaType =
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL_ALBUM"
  | "STORY"
  | "REELS";

/**
 * Input genérico para criação de containers de mídia.
 * Mapeia para POST /{ig-user-id}/media.
 */
export interface CreateMediaContainerInput {
  /**
   * URL pública da imagem (image_url).
   */
  imageUrl?: string;

  /**
   * URL pública do vídeo (video_url).
   */
  videoUrl?: string;

  /**
   * Tipo de mídia (media_type).
   */
  mediaType?: MediaType;

  /**
   * Legenda do post (caption).
   */
  caption?: string;

  /**
   * IDs de containers filhos para carrossel (children).
   */
  children?: string[];

  /**
   * Indica que esta mídia é item de carrossel (is_carousel_item).
   */
  isCarouselItem?: boolean;

  /**
   * ID de localização (location_id).
   */
  locationId?: string;

  /**
   * Dados de marcações de usuário (user_tags), normalmente JSON stringificado.
   */
  userTagsJson?: string;

  /**
   * Parâmetros extras específicos para vídeo/reels.
   */
  extraVideoParams?: Record<string, string | number | boolean>;
}

/**
 * Resultado padrão ao criar um container de mídia (IG Container).
 */
export interface CreateMediaContainerResult {
  /**
   * ID do IG Container criado.
   */
  id: string;
}

/**
 * Input específico para criar container de imagem.
 */
export interface CreateImageContainerInput {
  imageUrl: string;
  caption?: string;
  locationId?: string;
  userTagsJson?: string;
  isCarouselItem?: boolean;
}

/**
 * Input específico para criar container de vídeo/reels.
 */
export interface CreateVideoContainerInput {
  videoUrl: string;
  caption?: string;
  mediaType?: Extract<MediaType, "VIDEO" | "REELS">;
  locationId?: string;
  userTagsJson?: string;
  extraVideoParams?: Record<string, string | number | boolean>;
  isCarouselItem?: boolean;
}

/**
 * Input para criar container pai de carrossel.
 */
export interface CreateCarouselContainerInput {
  /**
   * IDs dos containers filhos (imagem/vídeo com is_carousel_item=true).
   */
  childrenContainerIds: string[];
  caption?: string;
}

/**
 * Códigos de status conhecidos para IG Container.
 */
export type ContainerStatusCode =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "FINISHED"
  | "ERROR"
  | string; // fallback para valores futuros

/**
 * Input para consulta de status de container.
 */
export interface GetContainerStatusInput {
  igContainerId: string;
}

/**
 * Resultado da leitura de status de IG Container.
 */
export interface GetContainerStatusResult {
  id: string;
  status_code: ContainerStatusCode;
  status?: string;
  video_status?: Record<string, unknown>;
}

/**
 * Input para publicação de container em mídia final.
 */
export interface PublishMediaInput {
  /**
   * ID do IG Container (creation_id).
   */
  creationId: string;

  /**
   * Opcionalmente sobrescreve o igUserId do config.
   */
  igUserIdOverride?: string;
}

/**
 * Resultado da publicação de mídia (IG Media).
 */
export interface PublishMediaResult {
  /**
   * ID da mídia publicada no Instagram.
   */
  id: string;
}

/**
 * Tipos de mídia para leitura de IG Media.
 */
export type InstagramMediaType =
  | "IMAGE"
  | "VIDEO"
  | "CAROUSEL_ALBUM"
  | "STORY"
  | string; // fallback para tipos futuros

/**
 * Estrutura de children (para CAROUSEL_ALBUM).
 */
export interface InstagramMediaChildren {
  data: Array<{ id: string }>;
}

/**
 * Resultado de GET /{ig-media-id}.
 */
export interface GetMediaResult {
  id: string;
  caption?: string;
  media_type: InstagramMediaType;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
  children?: InstagramMediaChildren;
}

/**
 * Input para leitura de mídia específica.
 */
export interface GetMediaInput {
  mediaId: string;
  /**
   * Campos desejados em "fields".
   */
  fields?: string[];
}

/**
 * Input para listagem de mídias de um usuário.
 */
export interface ListUserMediaInput {
  fields?: string[];
  since?: number; // Unix timestamp
  until?: number; // Unix timestamp
  limit?: number;
  afterCursor?: string;
  beforeCursor?: string;
}

/**
 * Resultado de GET /{ig-user-id}/media.
 */
export interface ListUserMediaResult {
  data: GetMediaResult[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
    previous?: string;
  };
}

/**
 * Uso do limite de publicação de conteúdo (content_publishing_limit).
 */
export interface ContentPublishingLimitUsage {
  /**
   * Quantidade de posts usados nas últimas 24h.
   */
  quota_usage: number;

  /**
   * Limite máximo (ex.: 25).
   */
  quota_total: number;

  /**
   * Timestamp de reset do limite.
   */
  quota_reset_time: string;
}

/**
 * Input para leitura do limite de publicação.
 */
export interface GetContentPublishingLimitInput {
  igUserIdOverride?: string;
}

/**
 * Estrutura de erro padrão do Graph API.
 */
export interface GraphErrorInfo {
  message: string;
  type: string;
  code: number;
  errorSubcode?: number;
  errorUserTitle?: string;
  errorUserMsg?: string;
  fbtraceId?: string;
}

/**
 * Resposta de erro padrão do Graph API.
 */
export interface GraphErrorResponse {
  error: GraphErrorInfo;
}

/**
 * Resultado genérico que pode ser sucesso ou erro.
 */
export type GraphResult<T> = T | GraphErrorResponse;

/**
 * Assinaturas de função sugeridas (sem implementação) para uso pela IA.
 * Podem ser usadas como contrato de geração de código.
 */
export type CreateImageContainerFn = (
  input: CreateImageContainerInput
) => Promise<GraphResult<CreateMediaContainerResult>>;

export type CreateVideoContainerFn = (
  input: CreateVideoContainerInput
) => Promise<GraphResult<CreateMediaContainerResult>>;

export type CreateCarouselContainerFn = (
  input: CreateCarouselContainerInput
) => Promise<GraphResult<CreateMediaContainerResult>>;

export type GetContainerStatusFn = (
  input: GetContainerStatusInput
) => Promise<GraphResult<GetContainerStatusResult>>;

export type PublishContainerFn = (
  input: PublishMediaInput
) => Promise<GraphResult<PublishMediaResult>>;

export type GetMediaFn = (
  input: GetMediaInput
) => Promise<GraphResult<GetMediaResult>>;

export type ListUserMediaFn = (
  input?: ListUserMediaInput
) => Promise<GraphResult<ListUserMediaResult>>;

export type GetContentPublishingLimitFn = (
  input?: GetContentPublishingLimitInput
) => Promise<GraphResult<ContentPublishingLimitUsage>>;
