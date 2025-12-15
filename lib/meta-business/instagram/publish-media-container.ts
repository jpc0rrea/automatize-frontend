// instagram-publish.ts
import { metaApiCall } from "../api";
import { PublishMediaInput, PublishMediaResult, GraphResult } from "./types";

/**
 * Função responsável por publicar um IG Container previamente criado.
 * Mapeia para POST /{ig-user-id}/media_publish
 */
export async function publishMediaContainer(
  input: PublishMediaInput & {
    igUserId: string;
    accessToken: string;
  }
): Promise<GraphResult<PublishMediaResult>> {
  const { creationId, igUserIdOverride, igUserId, accessToken } = input;
  const resolvedIgUserId = igUserIdOverride ?? igUserId;

  const body = new URLSearchParams({
    creation_id: creationId,
  });

  const response = await metaApiCall<PublishMediaResult>({
    domain: "INSTAGRAM",
    method: "POST",
    path: `${resolvedIgUserId}/media_publish`,
    params: "",
    body: body.toString(),
    accessToken,
  });

  return response;
}
