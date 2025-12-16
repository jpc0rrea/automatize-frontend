import { AccountStatus } from "./types";

/**
 * Retorna o nome do status da conta em português (pt-BR) dado o número do status.
 */
export function getAccountStatusLabel(status: number): string {
  switch (status) {
    case AccountStatus.ACTIVE:
      return "Ativa";
    case AccountStatus.DISABLED:
      return "Desativada";
    case AccountStatus.UNSETTLED:
      return "Pagamento pendente";
    case AccountStatus.PENDING_RISK_REVIEW:
      return "Pendente de análise de risco";
    case AccountStatus.PENDING_SETTLEMENT:
      return "Pendente de liquidação";
    case AccountStatus.IN_GRACE_PERIOD:
      return "Em período de carência";
    case AccountStatus.PENDING_CLOSURE:
      return "Pendente de encerramento";
    case AccountStatus.CLOSED:
      return "Encerrada";
    case AccountStatus.ANY_ACTIVE:
      return "Qualquer ativa";
    case AccountStatus.ANY_CLOSED:
      return "Qualquer encerrada";
    default:
      return "Desconhecido";
  }
}
