import { GraphErrorResponse } from "./instagram/types";

export function graphErrorToString(err: GraphErrorResponse["error"]): string {
  const base = `[${err.type} - ${err.code}] ${err.message}`;
  const subcode = err.errorSubcode ? ` (subcode: ${err.errorSubcode})` : "";
  const userMsg = err.errorUserMsg ? ` | user_msg: ${err.errorUserMsg}` : "";
  return `${base}${subcode}${userMsg}`;
}
