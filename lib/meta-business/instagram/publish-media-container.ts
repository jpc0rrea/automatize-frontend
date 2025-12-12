// instagram-publish.ts
import { metaApiCall } from "../api";
import {
  PublishMediaInput,
  PublishMediaResult,
  GraphErrorResponse,
  GraphResult,
  GraphErrorInfo,
} from "./types";

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

  try {
    const response = await metaApiCall<PublishMediaResult>({
      domain: "INSTAGRAM",
      method: "POST",
      path: `${resolvedIgUserId}/media_publish`,
      params: "",
      body: body.toString(),
      accessToken,
    });

    return response;
  } catch (err) {
    // metaApiCall throws errors as JSON stringified GraphErrorResponse
    let errorInfo: GraphErrorInfo;

    if (err instanceof Error) {
      try {
        const parsedError = JSON.parse(err.message) as GraphErrorResponse;
        return parsedError;
      } catch {
        // If parsing fails, treat as network error
        errorInfo = {
          message: err.message,
          type: "NetworkError",
          code: -1,
        };
      }
    } else {
      errorInfo = {
        message: "Network or unexpected error",
        type: "NetworkError",
        code: -1,
      };
    }

    const errorResponse: GraphErrorResponse = { error: errorInfo };
    return errorResponse;
  }
}
