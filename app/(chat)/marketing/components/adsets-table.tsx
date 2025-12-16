"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdSet, PaginationInfo } from "@/lib/meta-business/marketing/types";
import { formatCurrency, formatNumber, getStatusBadgeVariant } from "../utils/formatters";

type GetAdSetsResponse = {
  data?: AdSet[];
  pagination?: PaginationInfo;
};

type AdSetsTableProps = {
  accountId: string;
  campaignId?: string;
  onAdSetClick: (adSet: AdSet) => void;
};

export function AdSetsTable({ accountId, campaignId, onAdSetClick }: AdSetsTableProps) {
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();

  const fetchAdSets = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "25" });
      if (cursor) {
        params.set("after", cursor);
      }
      if (campaignId) {
        params.set("campaignId", campaignId);
      }

      const response = await fetch(
        `/api/meta-business/marketing/${accountId}/adsets?${params}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch ad sets");
      }

      const data: GetAdSetsResponse = await response.json();
      setAdSets(data.data ?? []);
      setPagination(data.pagination ?? null);
    } catch (err) {
      console.error("Error fetching ad sets:", err);
      setError("Não foi possível carregar os conjuntos de anúncios");
    } finally {
      setIsLoading(false);
    }
  }, [accountId, campaignId]);

  useEffect(() => {
    fetchAdSets();
  }, [fetchAdSets]);

  const handleNextPage = () => {
    if (pagination?.nextCursor) {
      setCurrentCursor(pagination.nextCursor);
      fetchAdSets(pagination.nextCursor);
    }
  };

  const handlePreviousPage = () => {
    if (pagination?.previousCursor) {
      setCurrentCursor(pagination.previousCursor);
      fetchAdSets(pagination.previousCursor);
    }
  };

  if (isLoading && adSets.length === 0) {
    return <AdSetsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-destructive text-sm">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => fetchAdSets(currentCursor)}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (adSets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground text-sm">
          Nenhum conjunto de anúncios encontrado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile Cards View */}
      <div className="block sm:hidden space-y-2">
        {adSets.map((adSet) => (
          <button
            key={adSet.id}
            onClick={() => onAdSetClick(adSet)}
            className="w-full text-left rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-medium text-sm line-clamp-2">{adSet.name}</span>
              <Badge variant={getStatusBadgeVariant(adSet.effectiveStatus)} className="text-xs">
                {adSet.effectiveStatus ?? adSet.status ?? "N/A"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="block text-foreground font-medium">
                  {formatCurrency(adSet.insights?.spend)}
                </span>
                <span>Gasto</span>
              </div>
              <div>
                <span className="block text-foreground font-medium">
                  {formatNumber(adSet.insights?.clicks)}
                </span>
                <span>Cliques</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Conjunto</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Gasto</TableHead>
                <TableHead className="w-[100px] text-right">Impressões</TableHead>
                <TableHead className="w-[80px] text-right">Cliques</TableHead>
                <TableHead className="w-[80px] text-right">CPC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                adSets.map((adSet) => (
                  <TableRow
                    key={adSet.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onAdSetClick(adSet)}
                  >
                    <TableCell className="font-medium">
                      <span className="line-clamp-1">{adSet.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(adSet.effectiveStatus)} className="text-xs">
                        {adSet.effectiveStatus ?? adSet.status ?? "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(adSet.insights?.spend)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(adSet.insights?.impressions)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(adSet.insights?.clicks)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(adSet.insights?.cpc)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (pagination.hasNextPage || pagination.hasPreviousPage) && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!pagination.hasPreviousPage || isLoading}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage || isLoading}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AdSetsTableSkeleton() {
  return (
    <div className="space-y-3">
      {/* Mobile Skeleton */}
      <div className="block sm:hidden space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-14" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-4 w-14 mb-1" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Skeleton */}
      <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Conjunto</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Gasto</TableHead>
              <TableHead className="w-[100px] text-right">Impressões</TableHead>
              <TableHead className="w-[80px] text-right">Cliques</TableHead>
              <TableHead className="w-[80px] text-right">CPC</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

