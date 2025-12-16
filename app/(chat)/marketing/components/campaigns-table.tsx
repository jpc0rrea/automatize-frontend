"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
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
import type { Campaign, PaginationInfo } from "@/lib/meta-business/marketing/types";
import { formatCurrency, formatNumber, getStatusBadgeVariant } from "../utils/formatters";

type GetCampaignsResponse = {
  data?: Campaign[];
  pagination?: PaginationInfo;
};

type CampaignsTableProps = {
  accountId: string;
  onCampaignClick: (campaign: Campaign) => void;
};

export function CampaignsTable({ accountId, onCampaignClick }: CampaignsTableProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();

  const fetchCampaigns = useCallback(async (cursor?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "25" });
      if (cursor) {
        params.set("after", cursor);
      }

      const response = await fetch(
        `/api/meta-business/marketing/${accountId}/campaigns?${params}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }

      const data: GetCampaignsResponse = await response.json();
      setCampaigns(data.data ?? []);
      setPagination(data.pagination ?? null);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError("Não foi possível carregar as campanhas");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleNextPage = () => {
    if (pagination?.nextCursor) {
      setCurrentCursor(pagination.nextCursor);
      fetchCampaigns(pagination.nextCursor);
    }
  };

  const handlePreviousPage = () => {
    if (pagination?.previousCursor) {
      setCurrentCursor(pagination.previousCursor);
      fetchCampaigns(pagination.previousCursor);
    }
  };

  if (isLoading && campaigns.length === 0) {
    return <CampaignsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => fetchCampaigns(currentCursor)}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Cards View */}
      <div className="block sm:hidden space-y-3">
        {campaigns.map((campaign) => (
          <button
            key={campaign.id}
            onClick={() => onCampaignClick(campaign)}
            className="w-full text-left rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-medium text-sm line-clamp-2">{campaign.name}</span>
              <Badge variant={getStatusBadgeVariant(campaign.effectiveStatus)}>
                {campaign.effectiveStatus ?? campaign.status ?? "N/A"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="block text-foreground font-medium">
                  {formatCurrency(campaign.insights?.spend)}
                </span>
                <span>Gasto</span>
              </div>
              <div>
                <span className="block text-foreground font-medium">
                  {formatNumber(campaign.insights?.impressions)}
                </span>
                <span>Impressões</span>
              </div>
              <div>
                <span className="block text-foreground font-medium">
                  {formatNumber(campaign.insights?.clicks)}
                </span>
                <span>Cliques</span>
              </div>
              <div>
                <span className="block text-foreground font-medium">
                  {formatCurrency(campaign.insights?.cpc)}
                </span>
                <span>CPC</span>
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
                <TableHead className="min-w-[200px]">Campanha</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Gasto</TableHead>
                <TableHead className="w-[120px] text-right">Impressões</TableHead>
                <TableHead className="w-[100px] text-right">Cliques</TableHead>
                <TableHead className="w-[100px] text-right">CPC</TableHead>
                <TableHead className="w-[100px] text-right">CPM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : (
                campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onCampaignClick(campaign)}
                  >
                    <TableCell className="font-medium">
                      <span className="line-clamp-1">{campaign.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(campaign.effectiveStatus)}>
                        {campaign.effectiveStatus ?? campaign.status ?? "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(campaign.insights?.spend)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(campaign.insights?.impressions)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(campaign.insights?.clicks)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(campaign.insights?.cpc)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(campaign.insights?.cpm)}
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
            <ChevronLeft className="size-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage || isLoading}
          >
            Próximo
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

function CampaignsTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Mobile Skeleton */}
      <div className="block sm:hidden space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
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
              <TableHead className="min-w-[200px]">Campanha</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Gasto</TableHead>
              <TableHead className="w-[120px] text-right">Impressões</TableHead>
              <TableHead className="w-[100px] text-right">Cliques</TableHead>
              <TableHead className="w-[100px] text-right">CPC</TableHead>
              <TableHead className="w-[100px] text-right">CPM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

