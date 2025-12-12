// instagram-status.ts
import { metaApiCall } from "../api";
import {
  GetContainerStatusInput,
  GetContainerStatusResult,
  GraphErrorResponse,
  GraphResult,
  GraphErrorInfo,
} from "./types";

/**
 * Função responsável por checar o status de um IG Container.
 * Mapeia para: GET /{ig-container-id}?fields=status_code,status
 */
export async function getMediaContainerStatus(
  input: GetContainerStatusInput & {
    accessToken: string;
  }
): Promise<GraphResult<GetContainerStatusResult>> {
  const { igContainerId, accessToken } = input;

  try {
    const response = await metaApiCall<GetContainerStatusResult>({
      domain: "INSTAGRAM",
      method: "GET",
      path: igContainerId,
      params: "fields=status_code,status",
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
