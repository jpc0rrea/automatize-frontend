/**
 * Format a number as currency (BRL)
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return "-";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format a large number with abbreviations (K, M, B)
 */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return "-";
  }

  if (numValue >= 1_000_000_000) {
    return `${(numValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (numValue >= 1_000_000) {
    return `${(numValue / 1_000_000).toFixed(1)}M`;
  }
  if (numValue >= 1_000) {
    return `${(numValue / 1_000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat("pt-BR").format(numValue);
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return "-";
  }

  return `${numValue.toFixed(2)}%`;
}

/**
 * Format a date string to locale format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "-";
  }

  try {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

/**
 * Format date for chart axis (shorter format)
 */
export function formatChartDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "-";
  }

  try {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "-";
  }
}

/**
 * Get badge variant based on status
 */
export function getStatusBadgeVariant(
  status: string | null | undefined
): "default" | "secondary" | "destructive" | "outline" {
  if (!status) {
    return "outline";
  }

  const normalizedStatus = status.toUpperCase();

  switch (normalizedStatus) {
    case "ACTIVE":
      return "default";
    case "PAUSED":
    case "PENDING_REVIEW":
    case "PENDING":
    case "IN_PROCESS":
      return "secondary";
    case "DELETED":
    case "ARCHIVED":
    case "DISAPPROVED":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * Translate status to Portuguese
 */
export function translateStatus(status: string | null | undefined): string {
  if (!status) {
    return "N/A";
  }

  const statusMap: Record<string, string> = {
    ACTIVE: "Ativo",
    PAUSED: "Pausado",
    DELETED: "Excluído",
    ARCHIVED: "Arquivado",
    PENDING_REVIEW: "Em análise",
    DISAPPROVED: "Reprovado",
    PREAPPROVED: "Pré-aprovado",
    PENDING_BILLING_INFO: "Aguardando faturamento",
    CAMPAIGN_PAUSED: "Campanha pausada",
    ADSET_PAUSED: "Conjunto pausado",
    IN_PROCESS: "Em processamento",
    WITH_ISSUES: "Com problemas",
  };

  return statusMap[status.toUpperCase()] ?? status;
}

