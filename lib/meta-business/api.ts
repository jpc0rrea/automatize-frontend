import {
  graphApiVersion,
  graphFacebookBaseUrl,
  graphInstagramBaseUrl,
} from "./constant";
import { GraphErrorInfo, GraphErrorResponse } from "./instagram/types";

export type MetaApiCallParams = {
  domain?: "FACEBOOK" | "INSTAGRAM";
  method: "GET" | "POST" | "DELETE";
  path: string;
  params: string;
  body?: string | URLSearchParams;
  accessToken: string;
};

export async function metaApiCall<T>({
  domain = "FACEBOOK",
  method,
  path,
  params,
  body,
  accessToken,
}: MetaApiCallParams): Promise<T> {
  if (!accessToken) {
    throw new Error("Access token is required");
  }

  const baseGraphUrl =
    domain === "FACEBOOK" ? graphFacebookBaseUrl : graphInstagramBaseUrl;

  const url = `${baseGraphUrl}/${graphApiVersion}/${path}?${params}&access_token=${accessToken}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const json = await response.json().catch(() => undefined);
    // Tenta mapear o erro no formato padrão do Graph API
    const errorInfo: GraphErrorInfo = json?.error
      ? {
          message: json.error.message,
          type: json.error.type,
          code: json.error.code,
          errorSubcode: json.error.error_subcode,
          errorUserTitle: json.error.error_user_title,
          errorUserMsg: json.error.error_user_msg,
          fbtraceId: json.error.fbtrace_id,
        }
      : {
          message: `Graph API request failed with status ${response.status}`,
          type: "UnknownError",
          code: response.status,
        };

    const errorResponse: GraphErrorResponse = { error: errorInfo };
    throw new Error(JSON.stringify(errorResponse));
  }

  return response.json() as Promise<T>;
}
