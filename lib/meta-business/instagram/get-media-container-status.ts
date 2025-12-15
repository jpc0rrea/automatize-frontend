// instagram-status.ts
import { metaApiCall } from "../api";
import {
  GetContainerStatusInput,
  GetContainerStatusResult,
  GraphResult,
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

  const response = await metaApiCall<GetContainerStatusResult>({
    domain: "INSTAGRAM",
    method: "GET",
    path: igContainerId,
    params: "fields=status_code,status",
    accessToken,
  });

  return response;
}
