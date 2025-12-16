"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdSet, InsightsMetrics, TimeIncrement } from "@/lib/meta-business/marketing/types";
import { InsightsCards } from "./insights-cards";
import { InsightsChart } from "./insights-chart";
import { TimeIncrementSelector } from "./time-increment-selector";
import { AdsTable } from "./ads-table";
import { getStatusBadgeVariant, formatDate, formatCurrency } from "../utils/formatters";

type AdSetDetailProps = {
  adSet: AdSet;
  accountId: string;
  isOpen: boolean;
  onClose: () => void;
};

type GetAdSetInsightsResponse = {
  adsetId?: string;
  insights?: InsightsMetrics;
  insightsArray?: InsightsMetrics[];
};

const metricOptions = [
  { value: "spend", label: "Gasto" },
  { value: "impressions", label: "Impressões" },
  { value: "clicks", label: "Cliques" },
  { value: "cpc", label: "CPC" },
  { value: "cpm", label: "CPM" },
] as const;

export function AdSetDetail({
  adSet,
  accountId,
  isOpen,
  onClose,
}: AdSetDetailProps) {
  // State for insights data
  const [insightsData, setInsightsData] = useState<InsightsMetrics[]>([]);
  const [totalInsights, setTotalInsights] = useState<InsightsMetrics | undefined>(
    adSet.insights
  );
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // State for time increment and metric
  const [timeIncrement, setTimeIncrement] = useState<TimeIncrement>("day");
  const [selectedMetric, setSelectedMetric] = useState<"spend" | "impressions" | "clicks" | "cpc" | "cpm">("spend");

  // Fetch insights data with time increment
  const fetchInsights = useCallback(async () => {
    if (!adSet.id || !accountId) return;

    setIsLoadingInsights(true);

    try {
      // Fetch time-series insights
      const params = new URLSearchParams({
        timeIncrement,
        datePreset: "last_90d",
      });

      const response = await fetch(
        `/api/meta-business/marketing/${accountId}/adsets/${adSet.id}/insights?${params}`
      );

      if (response.ok) {
        const data: GetAdSetInsightsResponse = await response.json();
        setInsightsData(data.insightsArray ?? []);
      }

      // Fetch total insights (all time)
      const totalParams = new URLSearchParams({ datePreset: "lifetime" });
      const totalResponse = await fetch(
        `/api/meta-business/marketing/${accountId}/adsets/${adSet.id}/insights?${totalParams}`
      );

      if (totalResponse.ok) {
        const totalData: GetAdSetInsightsResponse = await totalResponse.json();
        setTotalInsights(totalData.insights);
      }
    } catch (err) {
      console.error("Error fetching adset insights:", err);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [adSet.id, accountId, timeIncrement]);

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen, fetchInsights]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto p-0"
      >
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="shrink-0 sm:hidden"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="min-w-0">
                <SheetTitle className="line-clamp-1 text-left">
                  {adSet.name ?? "Conjunto de Anúncios"}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant={getStatusBadgeVariant(adSet.effectiveStatus)}>
                    {adSet.effectiveStatus ?? adSet.status ?? "N/A"}
                  </Badge>
                  {adSet.startTime && (
                    <span className="text-xs text-muted-foreground">
                      Início: {formatDate(adSet.startTime)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 hidden sm:flex"
            >
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="px-4 py-4 sm:px-6 sm:py-6 space-y-6">
          {/* Budget Info */}
          {(adSet.dailyBudget || adSet.lifetimeBudget) && (
            <section className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
              {adSet.dailyBudget && (
                <div>
                  <span className="text-xs text-muted-foreground">Orçamento diário</span>
                  <p className="font-medium">{formatCurrency(parseInt(adSet.dailyBudget) / 100)}</p>
                </div>
              )}
              {adSet.lifetimeBudget && (
                <div>
                  <span className="text-xs text-muted-foreground">Orçamento total</span>
                  <p className="font-medium">{formatCurrency(parseInt(adSet.lifetimeBudget) / 100)}</p>
                </div>
              )}
              {adSet.budgetRemaining && (
                <div>
                  <span className="text-xs text-muted-foreground">Restante</span>
                  <p className="font-medium">{formatCurrency(parseInt(adSet.budgetRemaining) / 100)}</p>
                </div>
              )}
              {adSet.optimizationGoal && (
                <div>
                  <span className="text-xs text-muted-foreground">Objetivo</span>
                  <p className="font-medium text-sm">{adSet.optimizationGoal}</p>
                </div>
              )}
            </section>
          )}

          {/* Total Insights Cards */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Métricas totais (todo período)
            </h3>
            <InsightsCards insights={totalInsights} isLoading={isLoadingInsights} />
          </section>

          {/* Time Series Chart */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Desempenho ao longo do tempo
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <TimeIncrementSelector
                  value={timeIncrement}
                  onChange={setTimeIncrement}
                  disabled={isLoadingInsights}
                />
                <Select
                  value={selectedMetric}
                  onValueChange={(v) => setSelectedMetric(v as typeof selectedMetric)}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metricOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <InsightsChart
              data={insightsData}
              isLoading={isLoadingInsights}
              metric={selectedMetric}
            />
          </section>

          {/* Ads Table */}
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Anúncios
            </h3>
            <AdsTable
              accountId={accountId}
              adSetId={adSet.id}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

