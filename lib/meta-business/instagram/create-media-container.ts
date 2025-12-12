// instagram-create-container.ts
import { metaApiCall } from "../api";
import {
  CreateMediaContainerInput,
  CreateMediaContainerResult,
  GraphResult,
  GraphErrorResponse,
  GraphErrorInfo,
} from "./types"; // ajuste o caminho conforme seu projeto

/**
 * Cria um IG Container (imagem, vídeo ou carrossel) via POST /{ig-user-id}/media.
 */
export async function createMediaContainer(
  input: CreateMediaContainerInput & {
    igUserId: string;
    accessToken: string;
  }
): Promise<GraphResult<CreateMediaContainerResult>> {
  const body = new URLSearchParams();

  // Mapeamento TS -> campos da Graph API
  if (input.imageUrl) {
    body.append("image_url", input.imageUrl);
  }

  if (input.videoUrl) {
    body.append("video_url", input.videoUrl);
  }

  if (input.mediaType) {
    body.append("media_type", input.mediaType);
  }

  if (input.caption) {
    body.append("caption", input.caption);
  }

  if (input.children && input.children.length > 0) {
    // A API espera string com IDs separados por vírgula
    body.append("children", input.children.join(","));
  }

  if (typeof input.isCarouselItem === "boolean") {
    body.append("is_carousel_item", String(input.isCarouselItem));
  }

  if (input.locationId) {
    body.append("location_id", input.locationId);
  }

  if (input.userTagsJson) {
    body.append("user_tags", input.userTagsJson);
  }

  if (input.extraVideoParams) {
    for (const [key, value] of Object.entries(input.extraVideoParams)) {
      body.append(key, String(value));
    }
  }

  try {
    console.log("TODELETE Creating media container...", body.toString());
    const response = await metaApiCall<CreateMediaContainerResult>({
      domain: "INSTAGRAM",
      method: "POST",
      path: `${input.igUserId}/media`,
      params: "",
      body: body.toString(),
      accessToken: input.accessToken,
    });

    const json = response;

    // Sucesso: resposta deve ser { id: "..." }
    const result: CreateMediaContainerResult = {
      id: json.id,
    };

    return result;
  } catch (err) {
    console.error("TODELETE Error creating media container...", err);
    const errorInfo: GraphErrorInfo = {
      message:
        err instanceof Error ? err.message : "Network or unexpected error",
      type: "NetworkError",
      code: -1,
    };

    const errorResponse: GraphErrorResponse = { error: errorInfo };
    return errorResponse;
  }
}
