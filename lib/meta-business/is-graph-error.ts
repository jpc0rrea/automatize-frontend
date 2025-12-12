import { GraphErrorResponse, GraphResult } from "./instagram/types";

export function isGraphError<T>(
  result: GraphResult<T>
): result is GraphErrorResponse {
  return (result as GraphErrorResponse).error !== undefined;
}
