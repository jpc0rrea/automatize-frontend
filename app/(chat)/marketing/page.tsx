"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { AccountSelector } from "./components/account-selector";
import { CampaignsTable } from "./components/campaigns-table";
import { CampaignDetail } from "./components/campaign-detail";
import type { Campaign } from "@/lib/meta-business/marketing/types";

type AdAccount = {
  id: string;
  name: string;
  accountId: string;
};

type GetMeResponse = {
  id?: string;
  name?: string;
  adAccounts?: {
    data: AdAccount[];
  };
  pictureUrl?: string;
};

export default function MarketingPage() {
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [userPicture, setUserPicture] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Campaign detail state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isCampaignDetailOpen, setIsCampaignDetailOpen] = useState(false);

  // Fetch ad accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/meta-business/marketing/me");
        if (!response.ok) {
          throw new Error("Failed to fetch accounts");
        }
        const data: GetMeResponse = await response.json();
        setAccounts(data.adAccounts?.data ?? []);
        setUserPicture(data.pictureUrl);

        // Auto-select first account if available
        if (data.adAccounts?.data && data.adAccounts.data.length > 0) {
          setSelectedAccountId(data.adAccounts.data[0].accountId);
        }
      } catch (err) {
        console.error("Error fetching accounts:", err);
        setError("Não foi possível carregar as contas de anúncios");
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsCampaignDetailOpen(true);
  };

  const handleCloseCampaignDetail = () => {
    setIsCampaignDetailOpen(false);
    setSelectedCampaign(null);
  };

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="size-5 text-primary" />
          <h1 className="font-semibold text-lg hidden sm:block">Marketing Dashboard</h1>
          <h1 className="font-semibold text-lg sm:hidden">Marketing</h1>
        </div>
        {!isLoadingAccounts && accounts.length > 0 && (
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            userPicture={userPicture}
          />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6">
        {isLoadingAccounts ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-destructive">{error}</p>
            <p className="text-muted-foreground text-sm mt-2">
              Verifique sua conexão e tente novamente
            </p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              Nenhuma conta de anúncios encontrada
            </p>
          </div>
        ) : selectedAccountId ? (
          <CampaignsTable
            accountId={selectedAccountId}
            onCampaignClick={handleCampaignClick}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              Selecione uma conta de anúncios para visualizar as campanhas
            </p>
          </div>
        )}
      </main>

      {/* Campaign Detail Sheet */}
      {selectedCampaign && selectedAccountId && (
        <CampaignDetail
          campaign={selectedCampaign}
          accountId={selectedAccountId}
          isOpen={isCampaignDetailOpen}
          onClose={handleCloseCampaignDetail}
        />
      )}
    </div>
  );
}

